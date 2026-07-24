import { useMemo } from 'react';
import { AppData, Budget, Category, RecurringExpense, Report, SavingsGoal, Transaction, User } from '../models/finance';
import { detectRecurringExpenses, generateMonthlyReport } from '../services/financeAnalytics';
import { saveRemoteAppData } from '../services/firebaseService';
import { createEmptyAppData } from '../services/initialData';
import { getMonthKey } from '../utils/format';
import {
  getCategoryRemovalDecision,
  isCategoryArchived,
  validateCategoryDraft,
  validateCategoryName,
} from '../utils/categories';
import { validateDate, validateLocation, validatePositiveAmount, validateReceipts, validateTransactionInput } from '../utils/validation';
import { AuthOptions, useSession } from '../context/SessionContext';
import { useFinanceWorkspace } from './useFinanceWorkspace';

export interface FinanceActions {
  continueAsGuest: () => Promise<void>;
  loginWithEmail: (email: string, password: string, options?: AuthOptions) => Promise<void>;
  signupWithEmail: (name: string, email: string, password: string, options?: AuthOptions) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  completeOnboarding: (updates: Partial<User>) => Promise<void>;
  addTransaction: (input: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'updateCount'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (input: Omit<Category, 'id' | 'isDefault'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  upsertBudget: (input: Partial<Budget>) => Promise<void>;
  addSavingsGoal: (input: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  updateRecurringExpense: (id: string, updates: Partial<RecurringExpense>) => Promise<void>;
  previewReport: (month?: string) => Promise<Report>;
  saveReport: (report: Report) => Promise<void>;
  generateReport: (month?: string) => Promise<Report>;
  canUseFeature: (feature: keyof AppData['entitlement']['features']) => boolean;
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeForUser = (data: AppData, userId: string, name?: string, email?: string): AppData => {
  const now = new Date().toISOString();

  return {
    ...data,
    user: {
      ...data.user,
      id: userId,
      name: name?.trim() || data.user.name || 'PerFin OS User',
      email: email?.trim() || data.user.email,
    },
    entitlement: {
      plan: 'free',
      isGuest: false,
      features: {
        cloudSync: true,
        receiptUploads: true,
        aiReports: true,
        aiPlanning: true,
        accountRecovery: true,
      },
      createdAt: data.entitlement?.createdAt || now,
      updatedAt: now,
    },
    transactions: data.transactions.map((transaction) => ({ ...transaction, userId })),
    budgets: data.budgets.map((budget) => ({ ...budget, userId })),
    savingsGoals: data.savingsGoals.map((goal) => ({ ...goal, userId })),
    recurringExpenses: data.recurringExpenses.map((expense) => ({ ...expense, userId })),
    reports: data.reports.map((report) => ({ ...report, userId })),
  };
};

const refreshDerivedData = (current: AppData): AppData => {
  const detected = detectRecurringExpenses(current.user.id, current.transactions);
  const mergedRecurring = [
    ...current.recurringExpenses.map((existing) => detected.find((item) => item.id === existing.id) || existing),
    ...detected.filter((item) => !current.recurringExpenses.some((existing) => existing.id === item.id)),
  ];

  return {
    ...current,
    recurringExpenses: mergedRecurring,
    reports: current.reports,
  };
};

export const useFinanceActions = (): FinanceActions => {
  const { data, persist, setData, setError, loadGuestWorkspace, clearWorkspace } = useFinanceWorkspace();
  const {
    loginRemote,
    signupRemote,
    forgotPassword: resetRemotePassword,
    logoutSession,
  } = useSession();

  return useMemo<FinanceActions>(
    () => ({
      continueAsGuest: async () => {
        await loadGuestWorkspace();
      },
      loginWithEmail: async (email, password, options = {}) => {
        const guestSnapshot = data?.entitlement?.isGuest ? data : null;
        const user = await loginRemote(email, password);

        if (options.importGuestData && guestSnapshot) {
          const imported = normalizeForUser(guestSnapshot, user.uid, guestSnapshot.user.name, email);
          await saveRemoteAppData(user.uid, imported);
          setData(imported);
        }
      },
      signupWithEmail: async (name, email, password, options = {}) => {
        const guestSnapshot = data?.entitlement?.isGuest ? data : null;
        const user = await signupRemote(name, email, password);
        const base = options.importGuestData && guestSnapshot
          ? normalizeForUser(guestSnapshot, user.uid, name, email)
          : createEmptyAppData({ userId: user.uid, name, email, isGuest: false });

        setData(base);
        await saveRemoteAppData(user.uid, base);
      },
      forgotPassword: async (email) => {
        await resetRemotePassword(email);
      },
      logout: () => {
        logoutSession((message) => setError(message));
        clearWorkspace();
      },
      updateUser: async (updates) => {
        await persist((current) => ({ ...current, user: { ...current.user, ...updates } }));
      },
      completeOnboarding: async (updates) => {
        await persist((current) => ({
          ...current,
          user: { ...current.user, ...updates },
          onboarded: true,
        }));
      },
      addTransaction: async (input) => {
        validateTransactionInput(input);

        await persist((current) => {
          const category = current.categories.find((item) => item.id === input.categoryId);

          if (!category) throw new Error('Select a valid category before saving');
          if (category.type !== input.type) throw new Error('Category must match the transaction type');
          if (isCategoryArchived(category)) throw new Error('Archived categories cannot be used for new transactions');

          const now = new Date().toISOString();

          return refreshDerivedData({
            ...current,
            transactions: [
              {
                ...input,
                receipts: input.receipts || [],
                id: uid('tx'),
                userId: current.user.id,
                categoryName: category?.name || input.categoryName,
                updateCount: 0,
                createdAt: now,
                updatedAt: now,
              },
              ...current.transactions,
            ],
          });
        });
      },
      updateTransaction: async (id, updates) => {
        if (updates.amount !== undefined) validatePositiveAmount(updates.amount);
        if (updates.date !== undefined) validateDate(updates.date);
        if (updates.location) validateLocation(updates.location);
        if (updates.receipts) validateReceipts(updates.receipts);

        await persist((current) => {
          const existing = current.transactions.find((transaction) => transaction.id === id);

          if (!existing) throw new Error('Transaction not found');

          if (existing.updateCount >= 2) {
            throw new Error('This transaction has already reached the 2 edit limit');
          }

          const category = updates.categoryId
            ? current.categories.find((item) => item.id === updates.categoryId)
            : undefined;

          const nextType = updates.type || existing.type;
          const categoryChanged = !!updates.categoryId && updates.categoryId !== existing.categoryId;

          if (updates.categoryId && !category) throw new Error('Select a valid category before saving');
          if (category && category.type !== nextType) throw new Error('Category must match the transaction type');
          if (categoryChanged && category && isCategoryArchived(category)) {
            throw new Error('Archived categories cannot be selected for a different transaction');
          }

          return refreshDerivedData({
            ...current,
            transactions: current.transactions.map((transaction) =>
              transaction.id === id
                ? {
                    ...transaction,
                    ...updates,
                    receipts: updates.receipts || transaction.receipts || [],
                    // A transaction keeps the name captured when it was categorized.
                    categoryName: categoryChanged ? category?.name || transaction.categoryName : transaction.categoryName,
                    updateCount: transaction.updateCount + 1,
                    updatedAt: new Date().toISOString(),
                  }
                : transaction
            ),
          });
        });
      },
      deleteTransaction: async (id) => {
        await persist((current) =>
          refreshDerivedData({
            ...current,
            transactions: current.transactions.filter((transaction) => transaction.id !== id),
          })
        );
      },
      addCategory: async (input) => {
        await persist((current) => {
          const draft = validateCategoryDraft(input, current.categories);

          return {
            ...current,
            categories: [{ ...draft, id: uid('cat'), isDefault: false, isArchived: false, archivedAt: null }, ...current.categories],
          };
        });
      },
      updateCategory: async (id, updates) => {
        if (updates.monthlyBudget !== undefined && updates.monthlyBudget < 0) {
          throw new Error('Budget amount cannot be negative');
        }

        await persist((current) => {
          const category = current.categories.find((item) => item.id === id);

          if (!category) throw new Error('Category not found');
          if (updates.isDefault !== undefined) throw new Error('Category default protection cannot be changed');
          if (updates.type && updates.type !== category.type) {
            throw new Error('Category type cannot change after it is created');
          }
          if (category.isDefault && (updates.name !== undefined || updates.isArchived !== undefined)) {
            throw new Error('Default category identity cannot be changed');
          }

          const name = updates.name === undefined
            ? category.name
            : validateCategoryName(updates.name, current.categories, category.type, category.id);
          const isArchived = updates.isArchived ?? category.isArchived;

          return {
            ...current,
            categories: current.categories.map((item) =>
              item.id === id
                ? {
                    ...item,
                    ...updates,
                    name,
                    isArchived,
                    archivedAt: isArchived ? item.archivedAt || new Date().toISOString() : null,
                  }
                : item
            ),
          };
        });
      },
      deleteCategory: async (id) => {
        await persist((current) => {
          const category = current.categories.find((item) => item.id === id);

          if (!category) throw new Error('Category not found');

          const decision = getCategoryRemovalDecision(category, current.transactions, current.budgets);
          if (decision === 'blocked_default') throw new Error('Default categories cannot be deleted');
          if (decision === 'archive') {
            return {
              ...current,
              categories: current.categories.map((item) =>
                item.id === id
                  ? { ...item, isArchived: true, archivedAt: item.archivedAt || new Date().toISOString() }
                  : item
              ),
            };
          }

          return { ...current, categories: current.categories.filter((item) => item.id !== id) };
        });
      },
      upsertBudget: async (input) => {
        if (input.totalBudget !== undefined && input.totalBudget < 0) {
          throw new Error('Budget amount cannot be negative');
        }

        await persist((current) => {
          const month = input.month || getMonthKey();
          const existing = current.budgets.find((item) => item.month === month);
          const now = new Date().toISOString();

          const budget: Budget = {
            id: existing?.id || uid('budget'),
            userId: current.user.id,
            month,
            totalBudget: input.totalBudget ?? existing?.totalBudget ?? current.user.monthlyBudget,
            categoryBudgets: input.categoryBudgets || existing?.categoryBudgets || {},
            createdAt: existing?.createdAt || now,
            updatedAt: now,
          };

          return {
            ...current,
            budgets: [budget, ...current.budgets.filter((item) => item.month !== month)],
          };
        });
      },
      addSavingsGoal: async (input) => {
        validatePositiveAmount(input.targetAmount, 'Savings target');

        if (input.currentAmount < 0) throw new Error('Current savings cannot be negative');

        if (input.targetAmount <= input.currentAmount) {
          throw new Error('Savings target must be greater than current amount');
        }

        await persist((current) => {
          const now = new Date().toISOString();

          return {
            ...current,
            savingsGoals: [
              { ...input, id: uid('goal'), userId: current.user.id, createdAt: now, updatedAt: now },
              ...current.savingsGoals,
            ],
          };
        });
      },
      updateSavingsGoal: async (id, updates) => {
        await persist((current) => ({
          ...current,
          savingsGoals: current.savingsGoals.map((goal) => {
            if (goal.id !== id) return goal;

            const next = { ...goal, ...updates, updatedAt: new Date().toISOString() };

            if (next.currentAmount < 0) throw new Error('Current savings cannot be negative');

            if (next.targetAmount <= next.currentAmount) {
              throw new Error('Savings target must be greater than current amount');
            }

            return next;
          }),
        }));
      },
      deleteSavingsGoal: async (id) => {
        await persist((current) => ({
          ...current,
          savingsGoals: current.savingsGoals.filter((goal) => goal.id !== id),
        }));
      },
      updateRecurringExpense: async (id, updates) => {
        await persist((current) => ({
          ...current,
          recurringExpenses: current.recurringExpenses.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },
      previewReport: async (month = getMonthKey()) => {
        if (!data) throw new Error('PerFin OS data is still loading');

        const budget = data.budgets.find((item) => item.month === month);
        return generateMonthlyReport(
          data.user.id,
          data.transactions,
          data.categories,
          data.savingsGoals,
          budget,
          month
        );
      },
      saveReport: async (report) => {
        await persist((current) => {
          if (report.userId !== current.user.id) {
            throw new Error('Report owner does not match the active workspace');
          }

          return {
            ...current,
            reports: [
              report,
              ...current.reports.filter(
                (item) => item.id !== report.id
              ),
            ],
          };
        });
      },
      generateReport: async (month = getMonthKey()) => {
        if (!data) throw new Error('PerFin OS data is still loading');

        const budget = data.budgets.find((item) => item.month === month);
        const report = generateMonthlyReport(
          data.user.id,
          data.transactions,
          data.categories,
          data.savingsGoals,
          budget,
          month
        );

        await persist((current) => {
          if (report.userId !== current.user.id) {
            throw new Error('Report owner does not match the active workspace');
          }

          return {
            ...current,
            reports: [
              report,
              ...current.reports.filter(
                (item) => item.id !== report.id
              ),
            ],
          };
        });

        return report;
      },
      canUseFeature: (feature) => !!data?.entitlement?.features?.[feature],
    }),
    [
      clearWorkspace,
      data,
      loadGuestWorkspace,
      loginRemote,
      logoutSession,
      persist,
      resetRemotePassword,
      setData,
      setError,
      signupRemote,
    ]
  );
};

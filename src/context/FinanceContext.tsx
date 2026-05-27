import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AppData,
  Budget,
  Category,
  RecurringExpense,
  Report,
  SavingsGoal,
  Transaction,
  User,
} from '../models/finance';
import {
  detectRecurringExpenses,
  generateMonthlyReport,
  generateSpendingInsights,
} from '../services/financeAnalytics';
import {
  ensureRemoteAppData,
  firebaseConfigured,
  logoutRemote,
  saveRemoteAppData,
  sendRemotePasswordReset,
  signInRemote,
  signUpRemote,
  subscribeRemoteAppData,
  subscribeToAuth,
} from '../services/firebaseService';
import { createEmptyAppData } from '../services/initialData';
import { loadGuestAppData, saveGuestAppData } from '../services/localFinanceStore';
import { getMonthKey } from '../utils/format';
import {
  validateDate,
  validateLocation,
  validatePositiveAmount,
  validateReceipts,
  validateTransactionInput,
} from '../utils/validation';

type DataStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AuthOptions {
  importGuestData?: boolean;
}

interface FinanceContextValue {
  data: AppData | null;
  status: DataStatus;
  error: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
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
  generateReport: (month?: string) => Promise<Report>;
  canUseFeature: (feature: keyof AppData['entitlement']['features']) => boolean;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const remoteReady = () => {
  if (!firebaseConfigured) {
    throw new Error('Firebase is not configured. Add Firebase placeholders in .env to enable account features.');
  }
};

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
        plannerChat: true,
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

export const FinanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<AppData | null>(null);
  const [status, setStatus] = useState<DataStatus>('ready');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);

  const isGuest = !!data?.entitlement?.isGuest;

  const persist = async (updater: (current: AppData) => AppData) => {
    if (!data) throw new Error('PerFin OS data is still loading');
    const next = updater(data);
    setData(next);
    if (next.entitlement.isGuest) {
      await saveGuestAppData(next);
      return;
    }
    if (remoteUserId && firebaseConfigured) {
      await saveRemoteAppData(remoteUserId, next);
    }
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

  useEffect(() => {
    if (!firebaseConfigured) return undefined;
    return subscribeToAuth((user) => {
      setRemoteUserId(user?.uid || null);
      if (user) setAuthenticated(true);
    });
  }, []);

  useEffect(() => {
    if (!remoteUserId || !firebaseConfigured || isGuest) return undefined;
    let active = true;
    setStatus('loading');
    const hydrateRemote = async () => {
      try {
        const remote = await ensureRemoteAppData(remoteUserId);
        if (active) {
          setData(remote);
          setStatus('ready');
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load Firestore data');
          setStatus('error');
        }
      }
    };

    hydrateRemote();
    const unsubscribe = subscribeRemoteAppData(
      remoteUserId,
      (remote) => {
        if (active) {
          setData(remote);
          setStatus('ready');
        }
      },
      (err) => {
        if (active) {
          setError(err.message || 'Firestore sync failed');
          setStatus('error');
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [remoteUserId, isGuest]);

  const value = useMemo<FinanceContextValue>(
    () => ({
      data,
      status,
      error,
      isAuthenticated,
      isGuest,
      continueAsGuest: async () => {
        setStatus('loading');
        try {
          const guest = await loadGuestAppData();
          setData(guest);
          setAuthenticated(true);
          setRemoteUserId(null);
          setStatus('ready');
        } catch (err: any) {
          setError(err.message || 'Could not start guest workspace');
          setStatus('error');
        }
      },
      loginWithEmail: async (email, password, options = {}) => {
        remoteReady();
        if (!email.trim()) throw new Error('Email is required');
        if (!password) throw new Error('Password is required');
        const guestSnapshot = data?.entitlement?.isGuest ? data : null;
        const user = await signInRemote(email.trim(), password);
        setRemoteUserId(user.uid);
        setAuthenticated(true);
        if (options.importGuestData && guestSnapshot) {
          const imported = normalizeForUser(guestSnapshot, user.uid, guestSnapshot.user.name, email);
          await saveRemoteAppData(user.uid, imported);
          setData(imported);
        }
      },
      signupWithEmail: async (name, email, password, options = {}) => {
        remoteReady();
        if (!name.trim()) throw new Error('Name is required');
        if (!email.trim()) throw new Error('Email is required');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        const guestSnapshot = data?.entitlement?.isGuest ? data : null;
        const user = await signUpRemote(email.trim(), password);
        const base = options.importGuestData && guestSnapshot
          ? normalizeForUser(guestSnapshot, user.uid, name, email)
          : createEmptyAppData({ userId: user.uid, name, email, isGuest: false });
        setRemoteUserId(user.uid);
        setAuthenticated(true);
        setData(base);
        await saveRemoteAppData(user.uid, base);
      },
      forgotPassword: async (email) => {
        remoteReady();
        if (!email.trim()) throw new Error('Email is required');
        await sendRemotePasswordReset(email.trim());
      },
      logout: () => {
        if (!isGuest && firebaseConfigured) logoutRemote().catch((err) => setError(err.message || 'Logout failed'));
        setRemoteUserId(null);
        setAuthenticated(false);
        setData(null);
        setStatus('ready');
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
          return refreshDerivedData({
            ...current,
            transactions: current.transactions.map((transaction) =>
              transaction.id === id
                ? {
                    ...transaction,
                    ...updates,
                    receipts: updates.receipts || transaction.receipts || [],
                    categoryName: category?.name || updates.categoryName || transaction.categoryName,
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
        if (!input.name.trim()) throw new Error('Category name is required');
        if (input.monthlyBudget < 0) throw new Error('Budget amount cannot be negative');
        await persist((current) => ({
          ...current,
          categories: [{ ...input, id: uid('cat'), isDefault: false }, ...current.categories],
        }));
      },
      updateCategory: async (id, updates) => {
        if (updates.monthlyBudget !== undefined && updates.monthlyBudget < 0) {
          throw new Error('Budget amount cannot be negative');
        }
        await persist((current) => ({
          ...current,
          categories: current.categories.map((category) =>
            category.id === id ? { ...category, ...updates } : category
          ),
        }));
      },
      deleteCategory: async (id) => {
        await persist((current) => {
          const category = current.categories.find((item) => item.id === id);
          if (category?.isDefault) throw new Error('Default categories cannot be deleted');
          if (current.transactions.some((transaction) => transaction.categoryId === id)) {
            throw new Error('Category is used by existing transactions');
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
        await persist((current) => ({
          ...current,
          reports: [report, ...current.reports.filter((item) => item.id !== report.id)],
        }));
        return report;
      },
      canUseFeature: (feature) => !!data?.entitlement?.features?.[feature],
    }),
    [data, error, isAuthenticated, isGuest, remoteUserId, status]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used inside FinanceProvider');
  return context;
};

export const useInsights = () => {
  const { data } = useFinance();
  if (!data) return [];
  const budget = data.budgets.find((item) => item.month === getMonthKey());
  return generateSpendingInsights(data.user.id, data.transactions, data.categories, budget);
};

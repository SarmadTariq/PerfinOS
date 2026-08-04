import React, { createContext, useContext, useMemo } from 'react';
import { AppData, Budget, Category, NewTransactionInput, RecurringExpense, Report, SavingsGoal, Transaction, User } from '../models/finance';
import { generateSpendingInsights } from '../services/financeAnalytics';
import { getMonthKey } from '../utils/format';
import { useFinanceWorkspace } from '../hooks/useFinanceWorkspace';
import type { DataStatus } from '../hooks/useFinanceWorkspace';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { AuthOptions, useSession } from './SessionContext';

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
  deleteGuestData: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  completeOnboarding: (updates: Partial<User>) => Promise<void>;
  addTransaction: (input: NewTransactionInput) => Promise<void>;
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

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

export const FinanceProvider = ({ children }: { children: React.ReactNode }) => {
  const { data, status, error, isGuest } = useFinanceWorkspace();
  const { isAuthenticated } = useSession();
  const actions = useFinanceActions();

  const value = useMemo<FinanceContextValue>(
    () => ({
      data,
      status,
      error,
      isAuthenticated,
      isGuest,
      ...actions,
    }),
    [actions, data, error, isAuthenticated, isGuest, status]
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

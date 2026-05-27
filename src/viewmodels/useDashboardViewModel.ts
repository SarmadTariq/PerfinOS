import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  calculateBudgetHealth,
  calculateCategoryBreakdown,
  calculateMonthlySummary,
  calculateSavingsProgress,
  sortTransactions,
} from '../repositories/AnalyticsRepository';
import { getMonthKey } from '../utils/format';

/**
 * Dashboard ViewModel — derives all data needed by DashboardView from raw AppData.
 *
 * Memoised so derived values recompute only when transactions, budgets,
 * categories, or savings goals change.
 *
 * @returns Derived dashboard stats and the four most recent transactions
 */
export const useDashboardViewModel = () => {
  const { data } = useFinance();

  const month = getMonthKey();

  const summary = useMemo(
    () => (data ? calculateMonthlySummary(data.transactions, month) : null),
    [data?.transactions, month]
  );

  const breakdown = useMemo(
    () => (data ? calculateCategoryBreakdown(data.transactions, data.categories, month) : []),
    [data?.transactions, data?.categories, month]
  );

  const health = useMemo(
    () =>
      data
        ? calculateBudgetHealth(
            data.transactions,
            data.budgets.find((b) => b.month === month),
            data.categories,
            month
          )
        : null,
    [data?.transactions, data?.budgets, data?.categories, month]
  );

  const savings = useMemo(
    () => (data ? calculateSavingsProgress(data.savingsGoals) : null),
    [data?.savingsGoals]
  );

  const recentTransactions = useMemo(
    () => (data ? sortTransactions(data.transactions, 'date-desc').slice(0, 4) : []),
    [data?.transactions]
  );

  return { month, summary, breakdown, health, savings, recentTransactions, data };
};

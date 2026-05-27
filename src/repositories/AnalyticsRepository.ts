/**
 * Analytics Repository — pure functions for financial calculations.
 *
 * All functions are deterministic: given the same input they always return
 * the same output and have no side effects. Safe to call from any ViewModel.
 *
 * Previously located at `src/services/financeAnalytics.ts`.
 * The old file is kept as a re-export shim for backward compatibility.
 */
import {
  Budget,
  Category,
  Insight,
  RecurringExpense,
  Report,
  SavingsGoal,
  Transaction,
  TransactionFilters,
  TransactionSortKey,
} from '../models/finance';
import { getMonthKey } from '../utils/format';

/** @internal Generates a unique short ID for insights and computed records. */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** @internal Returns true when a transaction falls within the given month key (YYYY-MM). */
const inMonth = (transaction: Transaction, month = getMonthKey()) =>
  transaction.date.startsWith(month);

/**
 * Calculates income, expenses, net cash flow, and averages for a given month.
 *
 * @param transactions - All user transactions
 * @param month - Target month key in `YYYY-MM` format (defaults to current month)
 * @returns Monthly summary object
 */
export const calculateMonthlySummary = (
  transactions: Transaction[],
  month = getMonthKey()
) => {
  const monthly = transactions.filter((t) => inMonth(t, month));
  const income = monthly.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = monthly.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const expenseCount = monthly.filter((t) => t.type === 'expense').length;

  return {
    month,
    income,
    expenses,
    netCashFlow: income - expenses,
    transactionCount: monthly.length,
    averageExpense: expenseCount === 0 ? 0 : expenses / expenseCount,
  };
};

/**
 * Breaks down expenses by category for the given month.
 * Sorted descending by amount; includes categories with a budget even if spend is zero.
 *
 * @param transactions - All user transactions
 * @param categories - Category list for name/color/icon lookup
 * @param month - Target month key (defaults to current month)
 */
export const calculateCategoryBreakdown = (
  transactions: Transaction[],
  categories: Category[],
  month = getMonthKey()
) => {
  const expenses = transactions.filter((t) => t.type === 'expense' && inMonth(t, month));
  const total = expenses.reduce((sum, t) => sum + t.amount, 0);

  return categories
    .filter((c) => c.type === 'expense')
    .map((c) => {
      const amount = expenses
        .filter((t) => t.categoryId === c.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        categoryId: c.id,
        categoryName: c.name,
        color: c.color,
        icon: c.icon,
        amount,
        percentage: total === 0 ? 0 : Math.round((amount / total) * 100),
        monthlyBudget: c.monthlyBudget,
      };
    })
    .filter((item) => item.amount > 0 || item.monthlyBudget > 0)
    .sort((a, b) => b.amount - a.amount);
};

/**
 * Computes budget health — how much of the budget has been consumed.
 *
 * @param transactions - All user transactions
 * @param budget - Optional explicit budget record; falls back to category budgets
 * @param categories - Categories with monthlyBudget values
 * @param month - Target month key (defaults to current month)
 */
export const calculateBudgetHealth = (
  transactions: Transaction[],
  budget?: Budget,
  categories: Category[] = [],
  month = getMonthKey()
) => {
  const monthlyExpenses = transactions
    .filter((t) => t.type === 'expense' && inMonth(t, month))
    .reduce((sum, t) => sum + t.amount, 0);
  const totalBudget = budget?.totalBudget || categories.reduce((sum, c) => sum + c.monthlyBudget, 0);
  const usedPercent = totalBudget === 0 ? 0 : Math.round((monthlyExpenses / totalBudget) * 100);

  return {
    totalBudget,
    spent: monthlyExpenses,
    remaining: totalBudget - monthlyExpenses,
    usedPercent,
    status: usedPercent >= 100 ? 'over budget' : usedPercent >= 85 ? 'watch' : 'healthy',
  };
};

/**
 * Aggregates savings goal progress across all goals.
 *
 * @param goals - All savings goals for the user
 * @returns Combined target, saved amount, remaining, and percentage
 */
export const calculateSavingsProgress = (goals: SavingsGoal[]) => {
  const target = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const saved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  return {
    target,
    saved,
    remaining: Math.max(target - saved, 0),
    percentage: target === 0 ? 0 : Math.round((saved / target) * 100),
  };
};

/**
 * Groups expense transactions by location neighborhood/address for a given month.
 * Sorted descending by total spend.
 *
 * @param transactions - Expense transactions to analyse
 * @param month - Target month key (defaults to current month)
 */
export const calculateLocationBreakdown = (
  transactions: Transaction[],
  month = getMonthKey()
) => {
  const expenses = transactions.filter((t) => t.type === 'expense' && inMonth(t, month));

  return Object.entries(
    expenses.reduce<Record<string, { label: string; amount: number; count: number }>>((groups, t) => {
      const label = t.location.neighborhood || t.location.address || 'Unknown location';
      groups[label] = groups[label] || { label, amount: 0, count: 0 };
      groups[label].amount += t.amount;
      groups[label].count += 1;
      return groups;
    }, {})
  )
    .map(([, value]) => value)
    .sort((a, b) => b.amount - a.amount);
};

/**
 * Generates rule-based spending insights for the current month.
 * No AI calls — purely deterministic. Surfaced in the Insights screen.
 *
 * @param userId - User ID to attach to insight records
 * @param transactions - All transactions
 * @param categories - Category list
 * @param budget - Optional explicit budget
 */
export const generateSpendingInsights = (
  userId: string,
  transactions: Transaction[],
  categories: Category[],
  budget?: Budget
): Insight[] => {
  const now = new Date().toISOString();
  const month = getMonthKey();
  const summary = calculateMonthlySummary(transactions, month);
  const budgetHealth = calculateBudgetHealth(transactions, budget, categories, month);
  const breakdown = calculateCategoryBreakdown(transactions, categories, month);
  const locations = calculateLocationBreakdown(transactions, month);
  const recurringTotal = transactions
    .filter((t) => t.type === 'expense' && t.isRecurring && inMonth(t, month))
    .reduce((sum, t) => sum + t.amount, 0);

  const insights: Insight[] = [];

  if (budgetHealth.totalBudget > 0 && budgetHealth.usedPercent >= 85) {
    insights.push({
      id: uid(),
      userId,
      type: 'budget-risk',
      title: budgetHealth.usedPercent >= 100 ? 'Monthly budget exceeded' : 'Budget pace is high',
      description: `You have used ${budgetHealth.usedPercent}% of this month's budget. Remaining budget is ${Math.max(budgetHealth.remaining, 0).toFixed(0)} before the month ends.`,
      severity: budgetHealth.usedPercent >= 100 ? 'high' : 'medium',
      createdAt: now,
    });
  }

  if (breakdown[0] && summary.expenses > 0) {
    insights.push({
      id: uid(),
      userId,
      type: 'top-category',
      title: `${breakdown[0].categoryName} leads spending`,
      description: `${breakdown[0].categoryName} accounts for ${breakdown[0].percentage}% of tracked expenses this month.`,
      severity: breakdown[0].percentage > 40 ? 'medium' : 'low',
      createdAt: now,
    });
  }

  if (locations[0]) {
    insights.push({
      id: uid(),
      userId,
      type: 'location-hotspot',
      title: `${locations[0].label} is your top spend area`,
      description: `You spent ${locations[0].amount.toFixed(0)} across ${locations[0].count} tracked expense${locations[0].count === 1 ? '' : 's'} there this month.`,
      severity: locations[0].amount > summary.expenses * 0.35 ? 'medium' : 'low',
      createdAt: now,
    });
  }

  if (summary.netCashFlow > 0) {
    insights.push({
      id: uid(),
      userId,
      type: 'cash-flow',
      title: 'Positive monthly cash flow',
      description: `Income is ahead of expenses by ${summary.netCashFlow.toFixed(0)} this month.`,
      severity: 'low',
      createdAt: now,
    });
  }

  if (recurringTotal > summary.expenses * 0.25 && summary.expenses > 0) {
    insights.push({
      id: uid(),
      userId,
      type: 'recurring-load',
      title: 'Recurring costs deserve a review',
      description: `Recurring charges represent ${Math.round((recurringTotal / summary.expenses) * 100)}% of monthly expenses.`,
      severity: 'medium',
      createdAt: now,
    });
  }

  return insights;
};

/**
 * Detects recurring expenses by grouping transactions by merchant name.
 * A merchant is considered recurring if it appears ≥2 times or any transaction has `isRecurring: true`.
 *
 * @param userId - User ID to attach to recurring expense records
 * @param transactions - All transactions
 */
export const detectRecurringExpenses = (
  userId: string,
  transactions: Transaction[]
): RecurringExpense[] => {
  const merchantGroups = transactions
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, Transaction[]>>((groups, t) => {
      const key = t.merchant.trim().toLowerCase();
      groups[key] = groups[key] || [];
      groups[key].push(t);
      return groups;
    }, {});

  return Object.values(merchantGroups)
    .filter((group) => group.length >= 2 || group.some((t) => t.isRecurring))
    .map((group) => {
      const sorted = group.sort((a, b) => b.date.localeCompare(a.date));
      const latest = sorted[0];
      const next = new Date(latest.date);
      next.setMonth(next.getMonth() + 1);
      return {
        id: `rec-${latest.merchant.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        userId,
        merchant: latest.merchant,
        amount: Math.round((group.reduce((sum, item) => sum + item.amount, 0) / group.length) * 100) / 100,
        category: latest.categoryName,
        frequency: 'monthly',
        nextDate: next.toISOString().slice(0, 10),
        status: 'active',
      };
    });
};

/**
 * Builds a structured monthly report for a given period.
 * Used by ReportsScreen and the AI planner as structured context.
 *
 * @param userId - User ID to embed in the report
 * @param transactions - All transactions
 * @param categories - Category list
 * @param goals - Savings goals
 * @param budget - Optional explicit budget
 * @param month - Target month (defaults to current)
 */
export const generateMonthlyReport = (
  userId: string,
  transactions: Transaction[],
  categories: Category[],
  goals: SavingsGoal[],
  budget?: Budget,
  month = getMonthKey()
): Report => {
  const summary = calculateMonthlySummary(transactions, month);
  const breakdown = calculateCategoryBreakdown(transactions, categories, month);
  const health = calculateBudgetHealth(transactions, budget, categories, month);
  const savings = calculateSavingsProgress(goals);

  return {
    id: `report-${month}`,
    userId,
    month,
    totalIncome: summary.income,
    totalExpense: summary.expenses,
    topCategory: breakdown[0]?.categoryName || 'None yet',
    budgetStatus: health.status,
    savingsProgress: savings.percentage,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Filters a transaction list by query text, type, category, month, and recurring flag.
 *
 * @param transactions - Transactions to filter
 * @param filters - Filter criteria object
 */
export const filterTransactions = (
  transactions: Transaction[],
  filters: TransactionFilters
) => {
  const query = filters.query?.trim().toLowerCase();
  return transactions.filter((t) => {
    if (filters.type && filters.type !== 'all' && t.type !== filters.type) return false;
    if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
    if (filters.month && !t.date.startsWith(filters.month)) return false;
    if (filters.recurringOnly && !t.isRecurring) return false;
    if (!query) return true;
    return [t.merchant, t.categoryName, t.notes, t.paymentMethod].join(' ').toLowerCase().includes(query);
  });
};

/**
 * Returns a sorted copy of the transaction array.
 *
 * @param transactions - Transactions to sort
 * @param sortKey - Sort mode: 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'merchant-asc'
 */
export const sortTransactions = (
  transactions: Transaction[],
  sortKey: TransactionSortKey
) => {
  const copy = [...transactions];
  return copy.sort((a, b) => {
    if (sortKey === 'date-asc') return a.date.localeCompare(b.date);
    if (sortKey === 'amount-desc') return b.amount - a.amount;
    if (sortKey === 'amount-asc') return a.amount - b.amount;
    if (sortKey === 'merchant-asc') return a.merchant.localeCompare(b.merchant);
    return b.date.localeCompare(a.date); // default: date-desc
  });
};

/**
 * Groups transactions by month key (YYYY-MM → Transaction[]).
 *
 * @param transactions - Transactions to group
 */
export const groupTransactionsByMonth = (transactions: Transaction[]) =>
  transactions.reduce<Record<string, Transaction[]>>((groups, t) => {
    const month = t.date.slice(0, 7);
    groups[month] = groups[month] || [];
    groups[month].push(t);
    return groups;
  }, {});

/**
 * Groups transactions by ISO week start date (Monday-aligned, YYYY-MM-DD → Transaction[]).
 *
 * @param transactions - Transactions to group
 */
export const groupTransactionsByWeek = (transactions: Transaction[]) =>
  transactions.reduce<Record<string, Transaction[]>>((groups, t) => {
    const date = new Date(`${t.date}T00:00:00`);
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const key = start.toISOString().slice(0, 10);
    groups[key] = groups[key] || [];
    groups[key].push(t);
    return groups;
  }, {});

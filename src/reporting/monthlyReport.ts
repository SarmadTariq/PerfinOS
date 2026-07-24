import { Budget, Category, Report, ReportCoverage, SavingsGoal, Transaction } from '../models/finance';
import { MonthlyReportPeriod, isDateInMonthlyReportPeriod, isIsoDate, requireMonthlyReportPeriod } from './monthlyPeriod';

export interface MonthlyReportReconciliation {
  period: MonthlyReportPeriod;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transactionCount: number;
}

export interface GenerateCanonicalMonthlyReportInput {
  userId: string;
  transactions: Transaction[];
  categories: Category[];
  goals: SavingsGoal[];
  budget?: Budget;
  month: string;
  generatedAt?: string;
  now?: Date;
}

const amountFor = (transactions: Transaction[], type: Transaction['type']) =>
  transactions.filter((transaction) => transaction.type === type).reduce((total, transaction) => total + transaction.amount, 0);

const localIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Activity and Dashboard-compatible totals for exactly one inclusive calendar month.
 * Consumers should use this instead of slicing a range down to its first month.
 */
export const reconcileMonthlyReportPeriod = (
  transactions: Transaction[],
  month: string
): MonthlyReportReconciliation => {
  const period = requireMonthlyReportPeriod(month);
  const periodTransactions = transactions.filter((transaction) => isDateInMonthlyReportPeriod(transaction.date, period));
  const totalIncome = amountFor(periodTransactions, 'income');
  const totalExpense = amountFor(periodTransactions, 'expense');

  return {
    period,
    transactions: periodTransactions,
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    transactionCount: periodTransactions.length,
  };
};

const buildCoverage = (
  transactions: Transaction[],
  reconciliation: MonthlyReportReconciliation,
  now: Date
): ReportCoverage => {
  const generatedThrough = localIsoDate(now);
  const invalidDateCount = transactions.filter(
    (transaction) =>
      transaction.date.startsWith(reconciliation.period.month) &&
      !isIsoDate(transaction.date)
  ).length;
  const observedDays = new Set(reconciliation.transactions.map((transaction) => transaction.date)).size;
  const isCurrentOrFuturePeriod = reconciliation.period.endDate >= generatedThrough;
  const classification = reconciliation.transactionCount === 0
    ? 'empty'
    : invalidDateCount > 0 || isCurrentOrFuturePeriod
      ? 'partial'
      : 'complete';

  return {
    classification,
    transactionCount: reconciliation.transactionCount,
    validTransactionCount: reconciliation.transactionCount,
    excludedTransactionCount: invalidDateCount,
    observedDays,
    daysInPeriod: reconciliation.period.daysInPeriod,
    generatedThrough,
  };
};

const findTopCategory = (transactions: Transaction[], categories: Category[]) => {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const expensesByCategory = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce<Map<string, { name: string; total: number }>>((totals, transaction) => {
      const current = totals.get(transaction.categoryId) || {
        name: categoryNames.get(transaction.categoryId) || transaction.categoryName || 'Uncategorized',
        total: 0,
      };
      current.total += transaction.amount;
      totals.set(transaction.categoryId, current);
      return totals;
    }, new Map());

  return [...expensesByCategory.values()].sort((left, right) => right.total - left.total)[0]?.name || 'None yet';
};

/** Generates the one supported report type: deterministic, inclusive calendar-month reporting. */
export const generateCanonicalMonthlyReport = (input: GenerateCanonicalMonthlyReportInput): Report => {
  const reconciliation = reconcileMonthlyReportPeriod(input.transactions, input.month);
  const now = input.now || new Date();
  const totalBudget =
    input.budget?.totalBudget ??
    input.categories
      .filter((category) => category.type === 'expense')
      .reduce((total, category) => total + category.monthlyBudget, 0);
  const usedPercent = totalBudget === 0 ? 0 : Math.round((reconciliation.totalExpense / totalBudget) * 100);
  const savingsTarget = input.goals.reduce((total, goal) => total + goal.targetAmount, 0);
  const savingsCurrent = input.goals.reduce((total, goal) => total + goal.currentAmount, 0);

  return {
    id: `report-${reconciliation.period.month}`,
    userId: input.userId,
    month: reconciliation.period.month,
    totalIncome: reconciliation.totalIncome,
    totalExpense: reconciliation.totalExpense,
    topCategory: findTopCategory(reconciliation.transactions, input.categories),
    budgetStatus:
      totalBudget === 0 && reconciliation.totalExpense > 0
        ? 'unbudgeted spending'
        : usedPercent >= 100
          ? 'over budget'
          : usedPercent >= 85
            ? 'watch'
            : 'healthy',
    savingsProgress: savingsTarget === 0 ? 0 : Math.round((savingsCurrent / savingsTarget) * 100),
    generatedAt: input.generatedAt || now.toISOString(),
    periodStart: reconciliation.period.startDate,
    periodEnd: reconciliation.period.endDate,
    periodLabel: reconciliation.period.label,
    source: 'deterministic',
    coverage: buildCoverage(input.transactions, reconciliation, now),
  };
};

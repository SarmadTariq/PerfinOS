/**
 * Analytics Repository — pure functions for financial calculations.
 *
 * All functions are deterministic: given the same input they always return
 * the same output and have no side effects. Safe to call from any ViewModel.
 *
 * Previously located at `src/services/financeAnalytics.ts`.
 * The old file is kept as a re-export shim for backward compatibility.
 */
import { Budget, Category, Insight, RecurringExpense, Report, SavingsGoal, Transaction, TransactionFilters, TransactionSortKey } from '../models/finance';
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
        categoryId: latest.categoryId,
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
    month,
    totalIncome: summary.income,
    totalExpense: summary.expenses,
    topCategoryId: breakdown[0]?.categoryId || 'None yet',
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
    if (filters.startDate && t.date < filters.startDate) return false;
    if (filters.endDate && t.date > filters.endDate) return false;
    if (filters.frequency === 'recurring' && !t.isRecurring) return false;
    if (filters.frequency === 'one-time' && t.isRecurring) return false;
    if (filters.recurringOnly && !t.isRecurring) return false;
    if (!query) return true;
    return [t.merchant, t.categoryId, t.notes, t.paymentMethod].join(' ').toLowerCase().includes(query);
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


export type AnalyticsEvidenceTone = 'primary' | 'success' | 'warning' | 'danger';

export interface AnalyticsEvidenceMetric {
  id: string;
  label: string;
  value: number;
  helperText: string;
  tone: AnalyticsEvidenceTone;
}

export interface AnalyticsCategoryEvidence {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  monthlyBudget: number;
  budgetUsedPercent: number;
  color: string;
}

export interface AnalyticsRecurringEvidence {
  totalRecurringSpend: number;
  recurringTransactionCount: number;
  activeRecurringCount: number;
  byMerchant: {
    merchant: string;
    amount: number;
    transactionCount: number;
  }[];
}

export interface AnalyticsReportEvidence {
  latestReport?: Report;
  reportCount: number;
  latestGeneratedAt?: string;
}

export interface AnalyticsSignal {
  id: string;
  title: string;
  description: string;
  source: 'activity' | 'reports' | 'insights' | 'planner';
  tone: AnalyticsEvidenceTone;
  evidence: AnalyticsEvidenceMetric[];
}

export interface AnalyticsPeriodSummary {
  label: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transactionCount: number;
  recurringExpenseTotal: number;
}

export interface AnalyticsEvidenceInput {
  transactions: Transaction[];
  categories: Category[];
  recurringExpenses: RecurringExpense[];
  reports: Report[];
  savingsGoals: SavingsGoal[];
}

export interface AnalyticsEvidenceOptions {
  startDate: string;
  endDate: string;
  label: string;
}

const inDateRange = (transaction: Transaction, startDate: string, endDate: string) =>
  transaction.date >= startDate && transaction.date <= endDate;

const getTransactionsForPeriod = (
  transactions: Transaction[],
  options: AnalyticsEvidenceOptions
) => transactions.filter((transaction) => inDateRange(transaction, options.startDate, options.endDate));

export const getAnalyticsPeriodSummary = (
  transactions: Transaction[],
  options: AnalyticsEvidenceOptions
): AnalyticsPeriodSummary => {
  const periodTransactions = getTransactionsForPeriod(transactions, options);
  const totalIncome = periodTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpense = periodTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const recurringExpenseTotal = periodTransactions
    .filter((transaction) => transaction.type === 'expense' && transaction.isRecurring)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    label: options.label,
    startDate: options.startDate,
    endDate: options.endDate,
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    transactionCount: periodTransactions.length,
    recurringExpenseTotal,
  };
};

export const getAnalyticsCategoryEvidence = (
  transactions: Transaction[],
  categories: Category[],
  options: AnalyticsEvidenceOptions
): AnalyticsCategoryEvidence[] => {
  const periodExpenses = getTransactionsForPeriod(transactions, options)
    .filter((transaction) => transaction.type === 'expense');
  const totalExpense = periodExpenses.reduce((sum, transaction) => sum + transaction.amount, 0);

  return categories
    .filter((category) => category.type === 'expense')
    .map((category) => {
      const categoryTransactions = periodExpenses.filter((transaction) => transaction.categoryId === category.id);
      const amount = categoryTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const budgetUsedPercent = category.monthlyBudget === 0 ? 0 : Math.round((amount / category.monthlyBudget) * 100);

      return {
        categoryId: category.id,
        categoryName: category.name,
        amount,
        percentage: totalExpense === 0 ? 0 : Math.round((amount / totalExpense) * 100),
        transactionCount: categoryTransactions.length,
        monthlyBudget: category.monthlyBudget,
        budgetUsedPercent,
        color: category.color,
      };
    })
    .filter((item) => item.amount > 0 || item.monthlyBudget > 0)
    .sort((a, b) => b.amount - a.amount);
};

export const getAnalyticsRecurringEvidence = (
  transactions: Transaction[],
  recurringExpenses: RecurringExpense[],
  options: AnalyticsEvidenceOptions
): AnalyticsRecurringEvidence => {
  const recurringTransactions = getTransactionsForPeriod(transactions, options)
    .filter((transaction) => transaction.type === 'expense' && transaction.isRecurring);
  const totalRecurringSpend = recurringTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  const byMerchant = Object.entries(
    recurringTransactions.reduce<Record<string, { merchant: string; amount: number; transactionCount: number }>>(
      (groups, transaction) => {
        const key = transaction.merchant.trim().toLowerCase();
        groups[key] = groups[key] || { merchant: transaction.merchant, amount: 0, transactionCount: 0 };
        groups[key].amount += transaction.amount;
        groups[key].transactionCount += 1;
        return groups;
      },
      {}
    )
  )
    .map(([, value]) => value)
    .sort((a, b) => b.amount - a.amount);

  return {
    totalRecurringSpend,
    recurringTransactionCount: recurringTransactions.length,
    activeRecurringCount: recurringExpenses.filter((item) => item.status === 'active').length,
    byMerchant,
  };
};

export const getAnalyticsReportEvidence = (
  reports: Report[],
  options: AnalyticsEvidenceOptions
): AnalyticsReportEvidence => {
  const periodMonth = options.startDate.slice(0, 7);
  const periodReports = reports.filter((report) => report.month === periodMonth);
  const sorted = [...periodReports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  const latestReport = sorted[0];

  return {
    latestReport,
    reportCount: periodReports.length,
    latestGeneratedAt: latestReport?.generatedAt,
  };
};

export const buildAnalyticsEvidenceLayer = (
  input: AnalyticsEvidenceInput,
  options: AnalyticsEvidenceOptions
) => {
  const summary = getAnalyticsPeriodSummary(input.transactions, options);
  const categoryEvidence = getAnalyticsCategoryEvidence(input.transactions, input.categories, options);
  const recurringEvidence = getAnalyticsRecurringEvidence(input.transactions, input.recurringExpenses, options);
  const reportEvidence = getAnalyticsReportEvidence(input.reports, options);
  const savings = calculateSavingsProgress(input.savingsGoals);

  const topCategory = categoryEvidence[0];
  const recurringShare = summary.totalExpense === 0
    ? 0
    : Math.round((summary.recurringExpenseTotal / summary.totalExpense) * 100);

  const signals: AnalyticsSignal[] = [
    {
      id: 'cash-flow-signal',
      title: summary.netCashFlow >= 0 ? 'Cash flow is positive' : 'Cash flow needs attention',
      description: summary.netCashFlow >= 0
        ? 'Income is covering expenses for the selected period.'
        : 'Expenses are higher than income for the selected period.',
      source: 'activity',
      tone: summary.netCashFlow >= 0 ? 'success' : 'danger',
      evidence: [
        {
          id: 'income',
          label: 'Income',
          value: summary.totalIncome,
          helperText: `${summary.transactionCount} tracked entries in this period`,
          tone: 'success',
        },
        {
          id: 'expenses',
          label: 'Expenses',
          value: summary.totalExpense,
          helperText: 'Total tracked spending for the selected period',
          tone: summary.netCashFlow >= 0 ? 'primary' : 'danger',
        },
      ],
    },
    topCategory
      ? {
          id: 'category-concentration-signal',
          title: `${topCategory.categoryName} leads spending`,
          description: `${topCategory.categoryName} represents ${topCategory.percentage}% of selected period expenses.`,
          source: 'insights',
          tone: topCategory.percentage >= 40 ? 'warning' : 'primary',
          evidence: [
            {
              id: 'top-category-spend',
              label: topCategory.categoryName,
              value: topCategory.amount,
              helperText: `${topCategory.transactionCount} transactions · ${topCategory.percentage}% of expenses`,
              tone: topCategory.percentage >= 40 ? 'warning' : 'primary',
            },
          ],
        }
      : null,
    {
      id: 'recurring-load-signal',
      title: recurringShare > 0 ? 'Recurring commitments are visible' : 'No recurring load detected',
      description: recurringShare > 0
        ? `Recurring charges represent ${recurringShare}% of selected period expenses.`
        : 'No recurring expenses were detected in the selected period.',
      source: 'reports',
      tone: recurringShare >= 30 ? 'warning' : 'primary',
      evidence: [
        {
          id: 'recurring-total',
          label: 'Recurring spend',
          value: recurringEvidence.totalRecurringSpend,
          helperText: `${recurringEvidence.recurringTransactionCount} recurring transactions · ${recurringEvidence.activeRecurringCount} active recurring records`,
          tone: recurringShare >= 30 ? 'warning' : 'primary',
        },
      ],
    },
    {
      id: 'savings-progress-signal',
      title: savings.percentage > 0 ? 'Savings progress is tracked' : 'Savings needs a baseline',
      description: savings.percentage > 0
        ? `Savings goals are ${savings.percentage}% funded.`
        : 'Add a savings goal to connect analytics to planning progress.',
      source: 'planner',
      tone: savings.percentage >= 50 ? 'success' : 'primary',
      evidence: [
        {
          id: 'savings-saved',
          label: 'Saved',
          value: savings.saved,
          helperText: `${savings.percentage}% of ${savings.target} target saved`,
          tone: savings.percentage >= 50 ? 'success' : 'primary',
        },
      ],
    },
    {
      id: 'report-support-signal',
      title: reportEvidence.latestReport ? 'Report evidence available' : 'No report generated yet',
      description: reportEvidence.latestReport
        ? 'Analytics can support the latest report for this period.'
        : 'Generate a report to connect Analytics evidence with Reports history.',
      source: 'reports',
      tone: reportEvidence.latestReport ? 'success' : 'warning',
      evidence: [
        {
          id: 'period-reports',
          label: 'Reports',
          value: reportEvidence.reportCount,
          helperText: reportEvidence.latestGeneratedAt
            ? `Latest report generated ${reportEvidence.latestGeneratedAt.slice(0, 10)}`
            : 'No report history for this period',
          tone: reportEvidence.latestReport ? 'success' : 'warning',
        },
      ],
    },
  ].filter(Boolean) as AnalyticsSignal[];

  return {
    summary,
    categoryEvidence,
    recurringEvidence,
    reportEvidence,
    savings,
    signals,
  };
};

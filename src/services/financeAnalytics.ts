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

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const inMonth = (transaction: Transaction, month = getMonthKey()) =>
  transaction.date.startsWith(month);

export const calculateMonthlySummary = (
  transactions: Transaction[],
  month = getMonthKey()
) => {
  const monthly = transactions.filter((transaction) => inMonth(transaction, month));
  const income = monthly
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = monthly
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    month,
    income,
    expenses,
    netCashFlow: income - expenses,
    transactionCount: monthly.length,
    averageExpense:
      monthly.filter((transaction) => transaction.type === 'expense').length === 0
        ? 0
        : expenses / monthly.filter((transaction) => transaction.type === 'expense').length,
  };
};

export const calculateCategoryBreakdown = (
  transactions: Transaction[],
  categories: Category[],
  month = getMonthKey()
) => {
  const expenses = transactions.filter(
    (transaction) => transaction.type === 'expense' && inMonth(transaction, month)
  );
  const total = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);

  return categories
    .filter((category) => category.type === 'expense')
    .map((category) => {
      const amount = expenses
        .filter((transaction) => transaction.categoryId === category.id)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      return {
        categoryId: category.id,
        categoryName: category.name,
        color: category.color,
        icon: category.icon,
        amount,
        percentage: total === 0 ? 0 : Math.round((amount / total) * 100),
        monthlyBudget: category.monthlyBudget,
      };
    })
    .filter((item) => item.amount > 0 || item.monthlyBudget > 0)
    .sort((a, b) => b.amount - a.amount);
};

export const calculateBudgetHealth = (
  transactions: Transaction[],
  budget?: Budget,
  categories: Category[] = [],
  month = getMonthKey()
) => {
  const monthlyExpenses = transactions
    .filter((transaction) => transaction.type === 'expense' && inMonth(transaction, month))
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalBudget = budget?.totalBudget || categories.reduce((sum, item) => sum + item.monthlyBudget, 0);
  const usedPercent = totalBudget === 0 ? 0 : Math.round((monthlyExpenses / totalBudget) * 100);
  const remaining = totalBudget - monthlyExpenses;

  return {
    totalBudget,
    spent: monthlyExpenses,
    remaining,
    usedPercent,
    status: usedPercent >= 100 ? 'over budget' : usedPercent >= 85 ? 'watch' : 'healthy',
  };
};

export const calculateSavingsProgress = (goals: SavingsGoal[]) => {
  const target = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const saved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  return {
    target,
    saved,
    remaining: Math.max(target - saved, 0),
    percentage: target === 0 ? 0 : Math.round((saved / target) * 100),
  };
};

export const calculateLocationBreakdown = (
  transactions: Transaction[],
  month = getMonthKey()
) => {
  const expenses = transactions.filter(
    (transaction) => transaction.type === 'expense' && inMonth(transaction, month)
  );

  return Object.entries(
    expenses.reduce<Record<string, { label: string; amount: number; count: number }>>((groups, transaction) => {
      const label = transaction.location.neighborhood || transaction.location.address || 'Unknown location';
      groups[label] = groups[label] || { label, amount: 0, count: 0 };
      groups[label].amount += transaction.amount;
      groups[label].count += 1;
      return groups;
    }, {})
  )
    .map(([, value]) => value)
    .sort((a, b) => b.amount - a.amount);
};

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
    .filter((transaction) => transaction.type === 'expense' && transaction.isRecurring && inMonth(transaction, month))
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const insights: Insight[] = [];

  if (budgetHealth.totalBudget > 0 && budgetHealth.usedPercent >= 85) {
    insights.push({
      id: uid(),
      userId,
      type: 'budget-risk',
      title: budgetHealth.usedPercent >= 100 ? 'Monthly budget exceeded' : 'Budget pace is high',
      description: `You have used ${budgetHealth.usedPercent}% of this month's budget. Remaining budget is ${Math.max(
        budgetHealth.remaining,
        0
      ).toFixed(0)} before the month ends.`,
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
      description: `You spent ${locations[0].amount.toFixed(0)} across ${locations[0].count} tracked expense${
        locations[0].count === 1 ? '' : 's'
      } there this month.`,
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

export const detectRecurringExpenses = (
  userId: string,
  transactions: Transaction[]
): RecurringExpense[] => {
  const merchantGroups = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce<Record<string, Transaction[]>>((groups, transaction) => {
      const key = transaction.merchant.trim().toLowerCase();
      groups[key] = groups[key] || [];
      groups[key].push(transaction);
      return groups;
    }, {});

  return Object.values(merchantGroups)
    .filter((group) => group.length >= 2 || group.some((transaction) => transaction.isRecurring))
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

export const filterTransactions = (
  transactions: Transaction[],
  filters: TransactionFilters
) => {
  const query = filters.query?.trim().toLowerCase();
  return transactions.filter((transaction) => {
    if (filters.type && filters.type !== 'all' && transaction.type !== filters.type) return false;
    if (filters.categoryId && transaction.categoryId !== filters.categoryId) return false;
    if (filters.month && !transaction.date.startsWith(filters.month)) return false;
    if (filters.recurringOnly && !transaction.isRecurring) return false;
    if (!query) return true;
    return [transaction.merchant, transaction.categoryName, transaction.notes, transaction.paymentMethod]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
};

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
    return b.date.localeCompare(a.date);
  });
};

export const groupTransactionsByMonth = (transactions: Transaction[]) =>
  transactions.reduce<Record<string, Transaction[]>>((groups, transaction) => {
    const month = transaction.date.slice(0, 7);
    groups[month] = groups[month] || [];
    groups[month].push(transaction);
    return groups;
  }, {});

export const groupTransactionsByWeek = (transactions: Transaction[]) =>
  transactions.reduce<Record<string, Transaction[]>>((groups, transaction) => {
    const date = new Date(`${transaction.date}T00:00:00`);
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const key = start.toISOString().slice(0, 10);
    groups[key] = groups[key] || [];
    groups[key].push(transaction);
    return groups;
  }, {});

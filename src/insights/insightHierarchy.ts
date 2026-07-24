import type {
  AppData,
  Transaction,
} from '../models/finance';
import { calculateBudgetHealth } from '../repositories/AnalyticsRepository';
import { formatCurrency } from '../utils/format';

export type InsightGroup =
  | 'observation'
  | 'attention'
  | 'action';

export type InsightDestination =
  | 'Transactions'
  | 'Reports'
  | 'Budgets'
  | 'Categories'
  | 'Plan';

export interface InsightPeriod {
  label: string;
  startDate?: string;
  endDate?: string;
}

export interface InsightHierarchyItem {
  id: string;
  group: InsightGroup;
  title: string;
  summary: string;
  evidence: string;
  comparison: string;
  whyItMatters: string;
  period: string;
  source: 'deterministic';
  uncertainty: string;
  destination?: InsightDestination;
  actionLabel?: string;
  priority: number;
}

export type InsightCoverageState =
  | 'empty'
  | 'partial'
  | 'historical'
  | 'current';

export interface InsightHierarchyInput {
  data: AppData;
  transactions: Transaction[];
  period: InsightPeriod;
  today?: string;
}

const sum = (
  transactions: Transaction[],
  type: Transaction['type']
) =>
  transactions
    .filter(
      (transaction) =>
        transaction.type === type
    )
    .reduce(
      (total, transaction) =>
        total + transaction.amount,
      0
    );

const periodCopy = (
  period: InsightPeriod
) => {
  if (
    period.startDate &&
    period.endDate
  ) {
    return `${period.label} · ${period.startDate} to ${period.endDate}`;
  }
  if (period.startDate) {
    return `${period.label} · from ${period.startDate}`;
  }
  if (period.endDate) {
    return `${period.label} · through ${period.endDate}`;
  }
  return `${period.label} · all available activity`;
};

const missingCategoryCount = (
  input: InsightHierarchyInput
) =>
  input.transactions.filter(
    (transaction) =>
      !input.data.categories.some(
        (category) =>
          category.id ===
          transaction.categoryId
      )
  ).length;

export const getInsightCoverageState = (
  input: InsightHierarchyInput
): InsightCoverageState => {
  if (input.transactions.length === 0) {
    return 'empty';
  }
  if (missingCategoryCount(input) > 0) {
    return 'partial';
  }

  const today =
    input.today ||
    new Date().toISOString().slice(0, 10);
  if (
    input.period.endDate &&
    input.period.endDate < today
  ) {
    return 'historical';
  }
  return 'current';
};

export const getPlanHandoffPresentation = (
  hasActivePlan: boolean
) => ({
  label: 'Open Plan workspace',
  detail: hasActivePlan
    ? 'Review the active Plan in the current evidence context. Opening Plan does not replace it.'
    : 'Review the Plan workspace in the current evidence context. Plan creation remains an explicit separate action.',
});

const topVariableExpense = (
  transactions: Transaction[]
) => {
  const totals = transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' &&
        !transaction.isRecurring
    )
    .reduce<
      Record<
        string,
        {
          name: string;
          amount: number;
          count: number;
        }
      >
    >((groups, transaction) => {
      const id = transaction.categoryId;
      const current = groups[id] || {
        name:
          transaction.categoryName ||
          'Uncategorized',
        amount: 0,
        count: 0,
      };
      current.amount += transaction.amount;
      current.count += 1;
      groups[id] = current;
      return groups;
    }, {});

  return Object.values(totals).sort(
    (left, right) =>
      right.amount - left.amount
  )[0];
};

export const buildInsightHierarchy = (
  input: InsightHierarchyInput
): InsightHierarchyItem[] => {
  const coverage =
    getInsightCoverageState(input);
  if (coverage === 'empty') return [];

  const period = periodCopy(input.period);
  const currency = input.data.user.currency;
  const income = sum(
    input.transactions,
    'income'
  );
  const expenses = sum(
    input.transactions,
    'expense'
  );
  const month =
    input.period.startDate?.slice(0, 7) ||
    input.period.endDate?.slice(0, 7);
  const budget = month
    ? input.data.budgets.find(
        (candidate) =>
          candidate.month === month
      )
    : undefined;
  const budgetHealth = calculateBudgetHealth(
    input.transactions,
    budget,
    input.data.categories,
    month
  );
  const topVariable = topVariableExpense(
    input.transactions
  );
  const missingCategories =
    missingCategoryCount(input);
  const uncertainty =
    coverage === 'partial'
      ? `${missingCategories} transaction category references are unavailable.`
      : coverage === 'historical'
        ? 'This is a historical period; it does not describe current activity.'
        : 'This period can change as more activity is recorded.';

  const items: InsightHierarchyItem[] = [
    {
      id: 'cash-flow-observation',
      group: 'observation',
      title: 'Tracked cash flow',
      summary: `${formatCurrency(
        income - expenses,
        currency
      )} net cash flow in the selected activity.`,
      evidence: `${formatCurrency(
        income,
        currency
      )} income and ${formatCurrency(
        expenses,
        currency
      )} expenses across ${
        input.transactions.length
      } transactions.`,
      comparison:
        income >= expenses
          ? 'Income is greater than or equal to expenses for this selected period.'
          : 'Expenses are greater than income for this selected period.',
      whyItMatters:
        'Cash-flow direction is the baseline for deciding whether the next step belongs in Activity review, Reports, or Plan.',
      period,
      source: 'deterministic',
      uncertainty,
      destination: 'Transactions',
      actionLabel: 'Review Activity',
      priority: 1,
    },
  ];

  if (topVariable) {
    items.push({
      id: 'variable-spend-observation',
      group: 'observation',
      title: 'Largest variable category',
      summary: `${topVariable.name} is the largest non-recurring expense category in this period.`,
      evidence: `${formatCurrency(
        topVariable.amount,
        currency
      )} across ${topVariable.count} transaction${
        topVariable.count === 1 ? '' : 's'
      }.`,
      comparison:
        'This category is the largest non-recurring expense group in the selected period.',
      whyItMatters:
        'Large variable categories are the clearest place to review classification before making a planning decision.',
      period,
      source: 'deterministic',
      uncertainty,
      destination: 'Categories',
      actionLabel: 'Review Categories',
      priority: 2,
    });
  }

  if (missingCategories > 0) {
    items.push({
      id: 'category-coverage-attention',
      group: 'attention',
      title: 'Category coverage needs review',
      summary:
        'Some tracked activity no longer resolves to a category definition.',
      evidence: `${missingCategories} of ${input.transactions.length} transactions have missing category references.`,
      comparison:
        'Current category definitions do not cover every transaction reference in this period.',
      whyItMatters:
        'Missing category references can weaken category totals in Insights, Reports, and Plan evidence.',
      period,
      source: 'deterministic',
      uncertainty,
      destination: 'Categories',
      actionLabel: 'Open Categories',
      priority: 1,
    });
  } else if (budgetHealth.totalBudget === 0) {
    items.push({
      id: 'budget-baseline-attention',
      group: 'attention',
      title: 'No budget baseline',
      summary:
        'Spending is tracked, but this period has no verified budget target for comparison.',
      evidence: `${formatCurrency(
        budgetHealth.spent,
        currency
      )} of expenses are recorded with a zero budget baseline.`,
      comparison:
        'Tracked expenses have no verified budget baseline for this selected period.',
      whyItMatters:
        'A missing budget baseline limits what Insights can conclude before a Plan review.',
      period,
      source: 'deterministic',
      uncertainty,
      destination: 'Budgets',
      actionLabel: 'Open Budgets',
      priority: 1,
    });
  } else if (budgetHealth.usedPercent >= 85) {
    items.push({
      id: 'budget-comparison-attention',
      group: 'attention',
      title: 'Budget comparison',
      summary: `${budgetHealth.usedPercent}% of the selected month budget is represented by tracked expenses.`,
      evidence: `${formatCurrency(
        budgetHealth.spent,
        currency
      )} tracked against ${formatCurrency(
        budgetHealth.totalBudget,
        currency
      )} planned.`,
      comparison:
        budgetHealth.status === 'over budget'
          ? 'Spending is above the selected month budget.'
          : 'Spending is close to the selected month budget.',
      whyItMatters:
        'Budget context helps decide whether to review Reports first or carry evidence into Plan.',
      period,
      source: 'deterministic',
      uncertainty,
      destination: 'Budgets',
      actionLabel: 'Review Budgets',
      priority: 1,
    });
  }

  const planHandoff =
    getPlanHandoffPresentation(false);
  items.push(
    {
      id: 'report-action',
      group: 'action',
      title: 'Create a monthly record',
      summary:
        'Generate a deterministic monthly report when the selected context maps to the month you want to review.',
      evidence: `${input.transactions.length} transactions support the current insight context.`,
      comparison:
        'Reports use a saved monthly record, while Insights use the current selected Activity context.',
      whyItMatters:
        'A report gives the selected month a deterministic saved checkpoint before planning from it.',
      period,
      source: 'deterministic',
      uncertainty,
      destination: 'Reports',
      actionLabel: 'Open Reports',
      priority: 1,
    },
    {
      id: 'plan-action',
      group: 'action',
      title: 'Review the next step in Plan',
      summary: planHandoff.detail,
      evidence:
        'Plan reads the same shared Activity period and frequency filters.',
      comparison:
        'Plan review is separate from automatic Plan creation or replacement.',
      whyItMatters:
        'Financial changes require explicit confirmation, so Insights can only carry evidence forward for review.',
      period,
      source: 'deterministic',
      uncertainty:
        'Opening Plan does not create, activate, archive, or replace a Plan.',
      destination: 'Plan',
      actionLabel: planHandoff.label,
      priority: 2,
    }
  );

  return items
    .sort(
      (left, right) =>
        left.priority - right.priority
    )
    .slice(0, 5);
};

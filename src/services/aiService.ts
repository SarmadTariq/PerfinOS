import { AppData } from '../models/finance';
import { calculateBudgetHealth, calculateCategoryBreakdown, calculateMonthlySummary, calculateSavingsProgress } from './financeAnalytics';
import { appConfig } from './configService';
import { getMonthKey } from '../utils/format';
import { auth } from './firebase';

export interface PlanGenerationResult {
  title: string;
  summary: string;
  recommendations: string[];
  source: 'ai' | 'rules';
}

const buildRuleBasedPlan = (data: AppData): PlanGenerationResult => {
  const month = getMonthKey();
  const budget = data.budgets.find((item) => item.month === month);
  const summary = calculateMonthlySummary(data.transactions, month);
  const budgetHealth = calculateBudgetHealth(data.transactions, budget, data.categories, month);
  const savings = calculateSavingsProgress(data.savingsGoals);
  const topCategory = calculateCategoryBreakdown(data.transactions, data.categories, month)[0];

  const recommendations = [
    budgetHealth.usedPercent >= 85
      ? 'Review the largest flexible categories before adding new discretionary spending this month.'
      : 'Keep logging expenses consistently so PerFin OS can improve your monthly planning signals.',
    topCategory
      ? `Check whether ${topCategory.categoryName} has any repeat purchases that can be planned ahead next week.`
      : 'Add a few transactions to unlock more specific category recommendations.',
    savings.target > 0
      ? 'Compare upcoming spending with your savings goal progress before increasing non-essential purchases.'
      : 'Create a savings goal to make future planning recommendations more goal-aware.',
  ];

  return {
    title: 'Plan Summary',
    summary: `This educational summary is based on aggregate totals only. Current month cash flow is ${summary.netCashFlow.toFixed(
      0
    )}, and budget usage is ${budgetHealth.usedPercent}%.`,
    recommendations,
    source: 'rules',
  };
};

export const generatePlanResult = async (data: AppData): Promise<PlanGenerationResult> => {
  if (!appConfig.apiBaseUrl) return buildRuleBasedPlan(data);

  const month = getMonthKey();
  const payload = {
    month,
    summary: calculateMonthlySummary(data.transactions, month),
    categories: calculateCategoryBreakdown(data.transactions, data.categories, month).map((item) => ({
      categoryName: item.categoryName,
      amount: item.amount,
      percentage: item.percentage,
      monthlyBudget: item.monthlyBudget,
    })),
    budgetHealth: calculateBudgetHealth(
      data.transactions,
      data.budgets.find((item) => item.month === month),
      data.categories,
      month
    ),
    savings: calculateSavingsProgress(data.savingsGoals),
    recurringTotal: data.recurringExpenses.reduce((sum, item) => sum + item.amount, 0),
  };

  try {
    const token = await auth?.currentUser?.getIdToken();

    const response = await fetch(`${appConfig.apiBaseUrl}/ai/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(response.status, text);
      throw new Error('AI service unavailable');
    }

    return { ...(await response.json()), source: 'ai' } as PlanGenerationResult;
  } catch {
    return buildRuleBasedPlan(data);
  }
};

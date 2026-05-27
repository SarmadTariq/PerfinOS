import { AppData } from '../models/finance';
import {
  calculateBudgetHealth,
  calculateCategoryBreakdown,
  calculateMonthlySummary,
  calculateSavingsProgress,
} from './financeAnalytics';
import { appConfig } from './configService';
import { getMonthKey } from '../utils/format';

export interface AiPlannerResult {
  title: string;
  summary: string;
  recommendations: string[];
  source: 'ai' | 'rules';
}

const ruleBasedPlanner = (data: AppData): AiPlannerResult => {
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
      ? `Compare upcoming spending with your savings goal progress before increasing non-essential purchases.`
      : 'Create a savings goal to make future planner recommendations more goal-aware.',
  ];

  return {
    title: 'Planner Summary',
    summary: `This educational summary is based on aggregate totals only. Current month cash flow is ${summary.netCashFlow.toFixed(
      0
    )}, and budget usage is ${budgetHealth.usedPercent}%.`,
    recommendations,
    source: 'rules',
  };
};

export const generatePlannerResult = async (data: AppData): Promise<AiPlannerResult> => {
  if (!appConfig.apiBaseUrl) return ruleBasedPlanner(data);

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
    budgetHealth: calculateBudgetHealth(data.transactions, data.budgets.find((item) => item.month === month), data.categories, month),
    savings: calculateSavingsProgress(data.savingsGoals),
    recurringTotal: data.recurringExpenses.reduce((sum, item) => sum + item.amount, 0),
  };

  try {
    const response = await fetch(`${appConfig.apiBaseUrl}/ai/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('AI service unavailable');
    return { ...(await response.json()), source: 'ai' } as AiPlannerResult;
  } catch {
    return ruleBasedPlanner(data);
  }
};

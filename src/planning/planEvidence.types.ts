import type {
  RecurringFrequency,
} from '../models/finance';

export type PlanEvidenceHorizonKind =
  | '7_days'
  | '14_days'
  | 'current_month'
  | 'calendar_month';

export interface PlanEvidenceHorizonRequest {
  kind: PlanEvidenceHorizonKind;
  anchorDate: string;
  month?: string;
}

export interface PlanEvidencePeriod {
  kind: PlanEvidenceHorizonKind;
  startDate: string;
  endDate: string;
  monthKey: string | null;
  dayCount: number;
  isCompleteCalendarMonth: boolean;
}

export type PlanEvidenceExpectedIncomeBasis =
  | 'profile_monthly_income'
  | 'unavailable_short_horizon'
  | 'unavailable_historical';

export interface PlanEvidenceExpectedIncome {
  amountMinor: number | null;
  basis: PlanEvidenceExpectedIncomeBasis;
}

export interface PlanEvidenceTotals {
  recordedIncomeMinor: number;
  expectedIncome: PlanEvidenceExpectedIncome;
  recordedExpensesMinor: number;
  netCashFlowMinor: number;
  projectedRecurringCommitmentsMinor: number;
  unmatchedRecurringCommitmentsMinor: number;
  availableAfterCommitmentsMinor: number;
  budgetTotalMinor: number | null;
  horizonBudgetSpendMinor: number;
}

export interface PlanEvidenceCategorySignal {
  categoryId: string;
  categoryName: string;
  transactionCount: number;
  spendMinor: number;
  budgetMinor: number | null;
  remainingMinor: number | null;
}

export interface PlanEvidenceRecurringSignal {
  categoryName: string;
  frequency: RecurringFrequency;
  occurrenceCount: number;
  recordedMatchCount: number;
  projectedMinor: number;
  unmatchedMinor: number;
}

export interface PlanEvidenceSavingsProgress {
  goalCount: number;
  targetMinor: number;
  savedMinor: number;
  remainingMinor: number;
  completionPercent: number;
}

export interface PlanEvidenceLocationSignal {
  areaLabel: string;
  transactionCount: number;
  totalSpendMinor: number;
}

export type PlanEvidenceCoverageStatus =
  | 'complete'
  | 'partial'
  | 'insufficient';

export type PlanEvidenceWarningCode =
  | 'EXPECTED_INCOME_UNAVAILABLE_SHORT_HORIZON'
  | 'HISTORICAL_INCOME_BASELINE_UNAVAILABLE'
  | 'NO_RECORDED_TRANSACTIONS'
  | 'NO_BUDGET'
  | 'NO_SAVINGS_GOALS'
  | 'NO_RECURRING_COMMITMENTS'
  | 'LOCATION_COVERAGE_UNAVAILABLE'
  | 'PARTIAL_PERIOD_COVERAGE';

export interface PlanEvidenceWarning {
  code: PlanEvidenceWarningCode;
  message: string;
}

export interface PlanEvidenceCoverage {
  status: PlanEvidenceCoverageStatus;
  transactionCount: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
  locationEligibleTransactionCount: number;
  warnings: PlanEvidenceWarning[];
}

export interface PlanEvidenceSnapshot {
  schemaVersion: 1;
  baselineRevision: string;
  period: PlanEvidencePeriod;
  currency: string;
  currencyFractionDigits: number;
  totals: PlanEvidenceTotals;
  categories: PlanEvidenceCategorySignal[];
  recurring: PlanEvidenceRecurringSignal[];
  savings: PlanEvidenceSavingsProgress;
  locations: PlanEvidenceLocationSignal[];
  coverage: PlanEvidenceCoverage;
}

export interface PlanEvidenceRecordedFinancials {
  recordedIncomeMinor: number;
  recordedExpensesMinor: number;
  netCashFlowMinor: number;
  horizonBudgetSpendMinor: number;
  transactionCount: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
}

export type PlanEvidenceBudgetBasis =
  | 'explicit_budget'
  | 'category_baseline'
  | 'unavailable';

export interface PlanEvidenceBudgetContext {
  monthKey: string;
  totalMinor: number | null;
  basis: PlanEvidenceBudgetBasis;
  categoryBudgetMinor: Record<string, number>;
}

export interface PlanEvidenceCoverageInput {
  transactionCount: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
  locationEligibleTransactionCount: number;
  expectedIncome: PlanEvidenceExpectedIncome;
  budgetAvailable: boolean;
  savingsGoalCount: number;
}

export interface PlanEvidenceRecurringResult {
  projectedMinor: number;
  unmatchedMinor: number;
  occurrenceCount: number;
  recordedMatchCount: number;
  signals: PlanEvidenceRecurringSignal[];
}

export interface PlanEvidenceLocationResult {
  eligibleTransactionCount: number;
  signals: PlanEvidenceLocationSignal[];
}

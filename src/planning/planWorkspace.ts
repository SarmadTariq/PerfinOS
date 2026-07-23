import type {
  FinancialPlan,
  PlanEvidenceSummary,
} from '../models/planning';
import {
  createPlanEvidenceComponentRevisions,
} from './planEvidence';
import type { PlanEvidenceSnapshot } from './planEvidence.types';
import type {
  PlanEvidenceHorizonRequest,
} from './planEvidence.types';

export type PlanEvidenceChangeField =
  | 'periodStartDate'
  | 'periodEndDate'
  | 'currency'
  | 'currencyFractionDigits'
  | 'coverageStatus'
  | 'transactionCount'
  | 'recordedIncomeMinor'
  | 'recordedExpensesMinor'
  | 'netCashFlowMinor'
  | 'projectedRecurringCommitmentsMinor'
  | 'budgetTotalMinor'
  | 'savingsRemainingMinor'
  | 'expectedIncome'
  | 'categorySignals'
  | 'recurringSignals'
  | 'savingsProgress'
  | 'locationSignals'
  | 'coverageDetails';

export interface PlanEvidenceChange {
  field: PlanEvidenceChangeField;
  label: string;
  previousValue: string | number | null;
  currentValue: string | number | null;
  differenceMinor?: number;
}

export interface PlanEvidenceComparison {
  isStale: boolean;
  savedRevision: string;
  currentRevision: string;
  changes: PlanEvidenceChange[];
}

export const summarizePlanEvidence = (
  evidence: PlanEvidenceSnapshot
): PlanEvidenceSummary => ({
  schemaVersion: 1,
  baselineRevision: evidence.baselineRevision,
  periodStartDate: evidence.period.startDate,
  periodEndDate: evidence.period.endDate,
  currency: evidence.currency,
  currencyFractionDigits: evidence.currencyFractionDigits,
  coverageStatus: evidence.coverage.status,
  transactionCount: evidence.coverage.transactionCount,
  recordedIncomeMinor:
    evidence.totals.recordedIncomeMinor,
  recordedExpensesMinor:
    evidence.totals.recordedExpensesMinor,
  netCashFlowMinor:
    evidence.totals.netCashFlowMinor,
  projectedRecurringCommitmentsMinor:
    evidence.totals.projectedRecurringCommitmentsMinor,
  budgetTotalMinor:
    evidence.totals.budgetTotalMinor,
  savingsRemainingMinor:
    evidence.savings.remainingMinor,
  componentRevisions:
    createPlanEvidenceComponentRevisions(
      evidence
    ),
});

export const planEvidenceHorizonForSavedPlan =
  (
    plan: FinancialPlan
  ): PlanEvidenceHorizonRequest =>
    plan.horizon === 'monthly'
      ? {
          kind: 'calendar_month',
          anchorDate: plan.endDate,
          month:
            plan.startDate.slice(0, 7),
        }
      : {
          kind: plan.horizon,
          anchorDate: plan.endDate,
        };

type PlanEvidenceScalarChangeField =
  | 'periodStartDate'
  | 'periodEndDate'
  | 'currency'
  | 'currencyFractionDigits'
  | 'coverageStatus'
  | 'transactionCount'
  | 'recordedIncomeMinor'
  | 'recordedExpensesMinor'
  | 'netCashFlowMinor'
  | 'projectedRecurringCommitmentsMinor'
  | 'budgetTotalMinor'
  | 'savingsRemainingMinor';

const evidenceFields: Array<{
  field: PlanEvidenceScalarChangeField;
  label: string;
  minorUnits: boolean;
}> = [
  {
    field: 'periodStartDate',
    label: 'Period start',
    minorUnits: false,
  },
  {
    field: 'periodEndDate',
    label: 'Period end',
    minorUnits: false,
  },
  {
    field: 'currency',
    label: 'Currency',
    minorUnits: false,
  },
  {
    field:
      'currencyFractionDigits',
    label:
      'Currency precision',
    minorUnits: false,
  },
  {
    field: 'coverageStatus',
    label: 'Evidence coverage',
    minorUnits: false,
  },
  {
    field: 'transactionCount',
    label: 'Transaction count',
    minorUnits: false,
  },
  {
    field: 'recordedIncomeMinor',
    label: 'Recorded income',
    minorUnits: true,
  },
  {
    field: 'recordedExpensesMinor',
    label: 'Recorded expenses',
    minorUnits: true,
  },
  {
    field: 'netCashFlowMinor',
    label: 'Net cash flow',
    minorUnits: true,
  },
  {
    field: 'projectedRecurringCommitmentsMinor',
    label: 'Projected recurring commitments',
    minorUnits: true,
  },
  {
    field: 'budgetTotalMinor',
    label: 'Budget total',
    minorUnits: true,
  },
  {
    field: 'savingsRemainingMinor',
    label: 'Savings remaining',
    minorUnits: true,
  },
];

export const comparePlanEvidence = (
  saved: PlanEvidenceSummary,
  currentEvidence: PlanEvidenceSnapshot
): PlanEvidenceComparison => {
  const current = summarizePlanEvidence(
    currentEvidence
  );

  const changes = evidenceFields.flatMap(
    ({ field, label, minorUnits }) => {
      const previousValue = saved[field];
      const currentValue = current[field];

      if (previousValue === currentValue) {
        return [];
      }

      const change: PlanEvidenceChange = {
        field,
        label,
        previousValue,
        currentValue,
      };

      if (
        minorUnits &&
        typeof previousValue === 'number' &&
        typeof currentValue === 'number'
      ) {
        change.differenceMinor =
          currentValue - previousValue;
      }

      return [change];
    }
  );

  const componentChanges:
    PlanEvidenceChange[] =
    saved.componentRevisions
      ? (
          [
            [
              'expectedIncome',
              'Expected income basis',
            ],
            [
              'categories',
              'Category signals',
            ],
            [
              'recurring',
              'Recurring signals',
            ],
            [
              'savings',
              'Savings progress',
            ],
            [
              'locations',
              'Coarse location signals',
            ],
            [
              'coverage',
              'Coverage details',
            ],
          ] as const
        ).flatMap(
          ([component, label]) =>
            saved.componentRevisions?.[
              component
            ] ===
            current.componentRevisions?.[
              component
            ]
              ? []
              : [
                  {
                    field:
                      component ===
                      'categories'
                        ? 'categorySignals'
                        : component ===
                            'recurring'
                          ? 'recurringSignals'
                          : component ===
                              'savings'
                            ? 'savingsProgress'
                            : component ===
                                'locations'
                              ? 'locationSignals'
                              : component ===
                                  'coverage'
                                ? 'coverageDetails'
                                : 'expectedIncome',
                    label,
                    previousValue:
                      'saved summary',
                    currentValue:
                      'changed',
                  } satisfies PlanEvidenceChange,
                ]
        )
      : [];

  return {
    isStale:
      saved.baselineRevision !==
      current.baselineRevision,
    savedRevision: saved.baselineRevision,
    currentRevision: current.baselineRevision,
    changes: [
      ...changes,
      ...componentChanges,
    ],
  };
};

const dateRangesOverlap = (
  left: FinancialPlan,
  right: FinancialPlan
): boolean =>
  left.startDate <= right.endDate &&
  right.startDate <= left.endDate;

export const findOverlappingActivePlans = (
  plans: readonly FinancialPlan[],
  targetPlan: FinancialPlan
): FinancialPlan[] =>
  plans
    .filter(
      (candidate) =>
        candidate.id !== targetPlan.id &&
        candidate.userId === targetPlan.userId &&
        candidate.status === 'active' &&
        dateRangesOverlap(
          candidate,
          targetPlan
        )
    )
    .sort((left, right) =>
      left.startDate.localeCompare(
        right.startDate
      )
    );

const statusOrder: Record<
  FinancialPlan['status'],
  number
> = {
  active: 0,
  draft: 1,
  completed: 2,
  archived: 3,
};

export const sortSavedPlans = (
  plans: readonly FinancialPlan[]
): FinancialPlan[] =>
  [...plans].sort(
    (left, right) =>
      statusOrder[left.status] -
        statusOrder[right.status] ||
      right.updatedAt.localeCompare(
        left.updatedAt
      )
  );

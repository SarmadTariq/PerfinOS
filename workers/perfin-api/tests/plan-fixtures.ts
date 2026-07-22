import type {
  PlanEvidenceContract,
} from '../src/plan/validation';

export const baselineRevision =
  `pe1-${'a'.repeat(32)}`;

export const sessionId =
  '123e4567-e89b-42d3-a456-426614174000';

export const validPlanEvidence:
  PlanEvidenceContract = {
    schemaVersion: 1,

    baselineRevision,

    period: {
      kind:
        'current_month',
      startDate:
        '2026-07-01',
      endDate:
        '2026-07-21',
      monthKey:
        '2026-07',
      dayCount: 21,
      isCompleteCalendarMonth:
        false,
    },

    currency: 'CAD',

    currencyFractionDigits:
      2,

    totals: {
      recordedIncomeMinor:
        300_000,

      expectedIncome: {
        amountMinor:
          400_000,
        basis:
          'profile_monthly_income',
      },

      recordedExpensesMinor:
        125_000,

      netCashFlowMinor:
        175_000,

      projectedRecurringCommitmentsMinor:
        50_000,

      unmatchedRecurringCommitmentsMinor:
        25_000,

      availableAfterCommitmentsMinor:
        150_000,

      budgetTotalMinor:
        250_000,

      horizonBudgetSpendMinor:
        125_000,
    },

    categories: [
      {
        categoryId:
          'housing',
        categoryName:
          'Housing',
        transactionCount:
          1,
        spendMinor:
          100_000,
        budgetMinor:
          150_000,
        remainingMinor:
          50_000,
      },
    ],

    recurring: [
      {
        categoryName:
          'Housing',
        frequency:
          'monthly',
        occurrenceCount:
          1,
        recordedMatchCount:
          0,
        projectedMinor:
          50_000,
        unmatchedMinor:
          50_000,
      },
    ],

    savings: {
      goalCount: 1,
      targetMinor:
        500_000,
      savedMinor:
        100_000,
      remainingMinor:
        400_000,
      completionPercent:
        20,
    },

    locations: [
      {
        areaLabel:
          'Midtown',
        transactionCount:
          3,
        totalSpendMinor:
          25_000,
      },
    ],

    coverage: {
      status:
        'complete',
      transactionCount:
        4,
      incomeTransactionCount:
        1,
      expenseTransactionCount:
        3,
      locationEligibleTransactionCount:
        3,
      warnings: [],
    },
  };

import type {
  PlanGenerationMetadata,
  PlanStructuredOutput,
} from '../src/plan/outputContracts';

import type {
  PlanProviderResult,
} from '../src/plan/provider';

export const validPlanStructuredOutput:
  PlanStructuredOutput = {
    schemaVersion: 1,

    action:
      'generate',

    baselineRevision,

    currency:
      'CAD',

    periodKind:
      'current_month',

    summary:
      'Recorded income currently exceeds recorded expenses after known commitments.',

    observations: [
      {
        id:
          'observation-1',

        statement:
          'Recorded income is greater than recorded expenses.',

        evidenceRefs: [
          'totals.recordedIncomeMinor',
          'totals.recordedExpensesMinor',
        ],
      },
    ],

    allocations: [
      {
        id:
          'allocation-1',

        label:
          'Housing allocation',

        categoryId:
          'housing',

        amountMinor:
          100_000,

        period:
          'plan',

        evidenceRefs: [
          'categories[0].spendMinor',
          'totals.availableAfterCommitmentsMinor',
        ],
      },
    ],

    commitments: [
      {
        id:
          'commitment-1',

        title:
          'Review known housing commitment',

        description:
          'Keep the known recurring housing commitment visible during this period.',

        amountMinor:
          50_000,

        dueDate:
          '2026-07-21',

        evidenceRefs: [
          'recurring[0].projectedMinor',
        ],
      },
    ],

    recommendations: [
      {
        id:
          'recommendation-1',

        title:
          'Review housing pace',

        description:
          'Compare current housing spending with the available category budget.',

        priority:
          'medium',

        evidenceRefs: [
          'categories[0].spendMinor',
          'categories[0].budgetMinor',
        ],
      },
    ],

    actionProposals: [
      {
        id:
          'proposal-1',

        type:
          'budget_adjustment',

        title:
          'Review the housing budget',

        description:
          'Consider a confirmed housing budget adjustment based on the current period evidence.',

        targetEntityId:
          'housing',

        proposedAmountMinor:
          50_000,

        effectiveDate:
          '2026-07-21',

        requiresConfirmation:
          true,

        executionState:
          'proposal_only',

        evidenceRefs: [
          'categories[0].budgetMinor',
          'categories[0].spendMinor',
        ],
      },
    ],

    warnings: [],
  };

export const validPlanGenerationMetadata:
  PlanGenerationMetadata = {
    modelId:
      'gemini-test-model',

    promptVersion:
      'plan-prompt-v1',

    responseSchemaVersion:
      'plan-response-v1',

    outputSchemaVersion:
      1,

    attemptCount:
      1,

    generatedAt:
      '2026-07-21T20:00:00.000Z',
  };

export const validPlanProviderResult:
  PlanProviderResult = {
    text:
      JSON.stringify(
        validPlanStructuredOutput
      ),

    candidate:
      validPlanStructuredOutput,

    attemptCount:
      1,

    metadata:
      validPlanGenerationMetadata,
  };

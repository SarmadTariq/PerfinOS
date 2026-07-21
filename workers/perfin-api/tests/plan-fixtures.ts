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

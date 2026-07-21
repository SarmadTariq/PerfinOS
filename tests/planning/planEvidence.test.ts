import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  currencyFractionDigits,
  fromMinorUnits,
  resolvePlanEvidencePeriod,
  toMinorUnits,
} from '../../src/planning/planEvidence';

describe('Plan evidence money rules', () => {
  it('resolves currency-specific fraction digits', () => {
    expect(currencyFractionDigits('CAD')).toBe(2);
    expect(currencyFractionDigits('JPY')).toBe(0);
    expect(currencyFractionDigits('KWD')).toBe(3);
  });

  it('normalizes lowercase currency codes', () => {
    expect(currencyFractionDigits('cad')).toBe(2);
  });

  it('converts major amounts to integer minor units', () => {
    expect(toMinorUnits(12.34, 'CAD')).toBe(1234);
    expect(toMinorUnits(123.6, 'JPY')).toBe(124);
    expect(toMinorUnits(1.234, 'KWD')).toBe(1234);
  });

  it('rounds midpoint values away from zero', () => {
    expect(toMinorUnits(1.005, 'CAD')).toBe(101);
    expect(toMinorUnits(-1.005, 'CAD')).toBe(-101);
  });

  it('converts integer minor units back to major amounts', () => {
    expect(fromMinorUnits(1234, 'CAD')).toBe(12.34);
    expect(fromMinorUnits(124, 'JPY')).toBe(124);
    expect(fromMinorUnits(1234, 'KWD')).toBe(1.234);
  });

  it('rejects invalid or unsafe money values', () => {
    expect(() =>
      toMinorUnits(
        Number.NaN,
        'CAD'
      )
    ).toThrow(
      'Money value must be finite'
    );

    expect(() =>
      fromMinorUnits(
        12.5,
        'CAD'
      )
    ).toThrow(
      'Minor-unit value must be a safe integer'
    );

    expect(() =>
      currencyFractionDigits('CA')
    ).toThrow(
      'Currency must be a three-letter code'
    );
  });
});

describe('Plan evidence horizon rules', () => {
  it('creates a seven-day rolling period ending on the anchor date', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: '7_days',
        anchorDate: '2026-07-21',
      })
    ).toEqual({
      kind: '7_days',
      startDate: '2026-07-15',
      endDate: '2026-07-21',
      monthKey: '2026-07',
      dayCount: 7,
      isCompleteCalendarMonth: false,
    });
  });

  it('creates a fourteen-day rolling period ending on the anchor date', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: '14_days',
        anchorDate: '2026-07-21',
      })
    ).toEqual({
      kind: '14_days',
      startDate: '2026-07-08',
      endDate: '2026-07-21',
      monthKey: '2026-07',
      dayCount: 14,
      isCompleteCalendarMonth: false,
    });
  });

  it('supports short periods that cross a month boundary', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: '7_days',
        anchorDate: '2026-08-03',
      })
    ).toMatchObject({
      startDate: '2026-07-28',
      endDate: '2026-08-03',
      monthKey: null,
      dayCount: 7,
    });
  });

  it('creates a current month-to-date period', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: 'current_month',
        anchorDate: '2026-07-21',
      })
    ).toEqual({
      kind: 'current_month',
      startDate: '2026-07-01',
      endDate: '2026-07-21',
      monthKey: '2026-07',
      dayCount: 21,
      isCompleteCalendarMonth: false,
    });
  });

  it('creates a complete selected past month', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2026-07-21',
        month: '2026-06',
      })
    ).toEqual({
      kind: 'calendar_month',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      monthKey: '2026-06',
      dayCount: 30,
      isCompleteCalendarMonth: true,
    });
  });

  it('handles leap-year selected months', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2024-03-15',
        month: '2024-02',
      })
    ).toMatchObject({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
      dayCount: 29,
      isCompleteCalendarMonth: true,
    });
  });

  it('treats a selected current month as month-to-date', () => {
    expect(
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2026-07-21',
        month: '2026-07',
      })
    ).toEqual({
      kind: 'calendar_month',
      startDate: '2026-07-01',
      endDate: '2026-07-21',
      monthKey: '2026-07',
      dayCount: 21,
      isCompleteCalendarMonth: false,
    });
  });

  it('rejects future selected months', () => {
    expect(() =>
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2026-07-21',
        month: '2026-08',
      })
    ).toThrow(
      'Future calendar months are not supported'
    );
  });

  it('requires a month for selected-month evidence', () => {
    expect(() =>
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2026-07-21',
      })
    ).toThrow(
      'Calendar-month evidence requires a month'
    );
  });

  it('rejects invalid dates and month keys', () => {
    expect(() =>
      resolvePlanEvidencePeriod({
        kind: '7_days',
        anchorDate: '2026-02-30',
      })
    ).toThrow(
      'Anchor date must be a valid YYYY-MM-DD date'
    );

    expect(() =>
      resolvePlanEvidencePeriod({
        kind: 'calendar_month',
        anchorDate: '2026-07-21',
        month: '2026-13',
      })
    ).toThrow(
      'Month must be a valid YYYY-MM value'
    );
  });
});

import type {
  Budget,
  Category,
  SavingsGoal,
  Transaction,
} from '../../src/models/finance';
import {
  buildBaseEvidenceCoverage,
  calculateCategorySignals,
  calculateRecordedFinancials,
  calculateSavingsProgressEvidence,
  resolveBudgetContext,
  resolveExpectedIncome,
} from '../../src/planning/planEvidence';

const location = {
  name: 'Private place',
  formattedAddress: '100 Private Street',
  latitude: 43.65,
  longitude: -79.38,
  address: '100 Private Street',
  neighborhood: 'Downtown',
  source: 'google_place' as const,
};

const transaction = (
  overrides: Partial<Transaction> = {}
): Transaction => ({
  id: 'transaction-1',
  userId: 'alice',
  type: 'expense',
  amount: 10,
  categoryId: 'food',
  categoryName: 'Food',
  merchant: 'Private Merchant',
  date: '2026-07-20',
  notes: 'Private note',
  location,
  paymentMethod: 'Private Card',
  isRecurring: false,
  receipts: [],
  updateCount: 0,
  createdAt: '2026-07-20T12:00:00.000Z',
  updatedAt: '2026-07-20T12:00:00.000Z',
  ...overrides,
});

const category = (
  overrides: Partial<Category> = {}
): Category => ({
  id: 'food',
  name: 'Food',
  type: 'expense',
  color: '#000000',
  icon: 'restaurant',
  monthlyBudget: 500,
  isDefault: true,
  ...overrides,
});

const budget = (
  overrides: Partial<Budget> = {}
): Budget => ({
  id: 'budget-2026-07',
  userId: 'alice',
  month: '2026-07',
  totalBudget: 1200,
  categoryBudgets: {
    food: 450,
    transport: 250,
  },
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-07-01T12:00:00.000Z',
  ...overrides,
});

const savingsGoal = (
  overrides: Partial<SavingsGoal> = {}
): SavingsGoal => ({
  id: 'goal-1',
  userId: 'alice',
  name: 'Emergency fund',
  targetAmount: 1000,
  currentAmount: 250,
  targetDate: '2026-12-31',
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-07-01T12:00:00.000Z',
  ...overrides,
});

describe('Plan evidence recorded financials', () => {
  it('includes only transactions inside the evidence period', () => {
    const period = resolvePlanEvidencePeriod({
      kind: '7_days',
      anchorDate: '2026-07-21',
    });

    const result = calculateRecordedFinancials(
      [
        transaction({
          id: 'income-in-range',
          type: 'income',
          amount: 500,
          date: '2026-07-15',
        }),
        transaction({
          id: 'expense-in-range',
          amount: 125.55,
          date: '2026-07-21',
        }),
        transaction({
          id: 'expense-outside',
          amount: 999,
          date: '2026-07-14',
        }),
      ],
      period,
      'CAD'
    );

    expect(result).toEqual({
      recordedIncomeMinor: 50000,
      recordedExpensesMinor: 12555,
      netCashFlowMinor: 37445,
      horizonBudgetSpendMinor: 12555,
      transactionCount: 2,
      incomeTransactionCount: 1,
      expenseTransactionCount: 1,
    });
  });

  it('preserves negative cash flow deterministically', () => {
    const period = resolvePlanEvidencePeriod({
      kind: 'current_month',
      anchorDate: '2026-07-21',
    });

    expect(
      calculateRecordedFinancials(
        [
          transaction({
            id: 'income',
            type: 'income',
            amount: 100,
          }),
          transaction({
            id: 'expense',
            amount: 150,
          }),
        ],
        period,
        'CAD'
      ).netCashFlowMinor
    ).toBe(-5000);
  });
});

describe('Plan evidence expected income', () => {
  it('uses the profile monthly baseline for current-month evidence', () => {
    const request = {
      kind: 'current_month' as const,
      anchorDate: '2026-07-21',
    };

    expect(
      resolveExpectedIncome(
        request,
        resolvePlanEvidencePeriod(request),
        4200.1,
        'CAD'
      )
    ).toEqual({
      amountMinor: 420010,
      basis: 'profile_monthly_income',
    });
  });

  it('marks short-horizon expected income unavailable', () => {
    const request = {
      kind: '7_days' as const,
      anchorDate: '2026-07-21',
    };

    expect(
      resolveExpectedIncome(
        request,
        resolvePlanEvidencePeriod(request),
        4200,
        'CAD'
      )
    ).toEqual({
      amountMinor: null,
      basis: 'unavailable_short_horizon',
    });
  });

  it('does not apply the current profile baseline to a past month', () => {
    const request = {
      kind: 'calendar_month' as const,
      anchorDate: '2026-07-21',
      month: '2026-06',
    };

    expect(
      resolveExpectedIncome(
        request,
        resolvePlanEvidencePeriod(request),
        4200,
        'CAD'
      )
    ).toEqual({
      amountMinor: null,
      basis: 'unavailable_historical',
    });
  });
});

describe('Plan evidence budget context', () => {
  it('uses the full anchor-month budget for a short horizon', () => {
    const request = {
      kind: '7_days' as const,
      anchorDate: '2026-07-21',
    };

    expect(
      resolveBudgetContext(
        request,
        resolvePlanEvidencePeriod(request),
        [budget()],
        [category()],
        'CAD'
      )
    ).toEqual({
      monthKey: '2026-07',
      totalMinor: 120000,
      basis: 'explicit_budget',
      categoryBudgetMinor: {
        food: 45000,
        transport: 25000,
      },
    });
  });

  it('uses category defaults for current evidence without a Budget record', () => {
    const request = {
      kind: 'current_month' as const,
      anchorDate: '2026-07-21',
    };

    expect(
      resolveBudgetContext(
        request,
        resolvePlanEvidencePeriod(request),
        [],
        [
          category(),
          category({
            id: 'transport',
            name: 'Transport',
            monthlyBudget: 200,
          }),
        ],
        'CAD'
      )
    ).toEqual({
      monthKey: '2026-07',
      totalMinor: 70000,
      basis: 'category_baseline',
      categoryBudgetMinor: {
        food: 50000,
        transport: 20000,
      },
    });
  });

  it('does not apply current category defaults to a past month', () => {
    const request = {
      kind: 'calendar_month' as const,
      anchorDate: '2026-07-21',
      month: '2026-06',
    };

    expect(
      resolveBudgetContext(
        request,
        resolvePlanEvidencePeriod(request),
        [],
        [category()],
        'CAD'
      )
    ).toEqual({
      monthKey: '2026-06',
      totalMinor: null,
      basis: 'unavailable',
      categoryBudgetMinor: {},
    });
  });
});

describe('Plan evidence categories and savings', () => {
  it('aggregates category spend and remaining budget', () => {
    const request = {
      kind: 'current_month' as const,
      anchorDate: '2026-07-21',
    };

    const period =
      resolvePlanEvidencePeriod(request);

    const budgetContext =
      resolveBudgetContext(
        request,
        period,
        [budget()],
        [
          category(),
          category({
            id: 'transport',
            name: 'Transport',
            monthlyBudget: 200,
          }),
        ],
        'CAD'
      );

    expect(
      calculateCategorySignals(
        [
          transaction({
            id: 'food-1',
            amount: 100,
          }),
          transaction({
            id: 'food-2',
            amount: 50,
          }),
          transaction({
            id: 'transport-1',
            categoryId: 'transport',
            categoryName: 'Transport',
            amount: 300,
          }),
          transaction({
            id: 'income',
            type: 'income',
            categoryId: 'salary',
            categoryName: 'Salary',
            amount: 5000,
          }),
        ],
        [
          category(),
          category({
            id: 'transport',
            name: 'Transport',
            monthlyBudget: 200,
          }),
        ],
        period,
        'CAD',
        budgetContext
      )
    ).toEqual([
      {
        categoryId: 'transport',
        categoryName: 'Transport',
        transactionCount: 1,
        spendMinor: 30000,
        budgetMinor: 25000,
        remainingMinor: -5000,
      },
      {
        categoryId: 'food',
        categoryName: 'Food',
        transactionCount: 2,
        spendMinor: 15000,
        budgetMinor: 45000,
        remainingMinor: 30000,
      },
    ]);
  });

  it('calculates savings totals in minor units and caps completion', () => {
    expect(
      calculateSavingsProgressEvidence(
        [
          savingsGoal(),
          savingsGoal({
            id: 'goal-2',
            targetAmount: 500,
            currentAmount: 1400,
          }),
        ],
        'CAD'
      )
    ).toEqual({
      goalCount: 2,
      targetMinor: 150000,
      savedMinor: 165000,
      remainingMinor: 0,
      completionPercent: 100,
    });
  });
});

describe('Plan evidence base coverage', () => {
  it('returns deterministic warnings for partial evidence', () => {
    expect(
      buildBaseEvidenceCoverage({
        transactionCount: 2,
        incomeTransactionCount: 0,
        expenseTransactionCount: 2,
        locationEligibleTransactionCount: 0,
        expectedIncome: {
          amountMinor: null,
          basis: 'unavailable_short_horizon',
        },
        budgetAvailable: false,
        savingsGoalCount: 0,
      })
    ).toEqual({
      status: 'partial',
      transactionCount: 2,
      incomeTransactionCount: 0,
      expenseTransactionCount: 2,
      locationEligibleTransactionCount: 0,
      warnings: [
        {
          code:
            'EXPECTED_INCOME_UNAVAILABLE_SHORT_HORIZON',
          message:
            'Expected income is unavailable for short planning horizons.',
        },
        {
          code: 'NO_BUDGET',
          message:
            'No budget baseline is available for this evidence period.',
        },
        {
          code: 'NO_SAVINGS_GOALS',
          message:
            'No savings goals are available for planning evidence.',
        },
      ],
    });
  });

  it('marks an empty period as insufficient', () => {
    expect(
      buildBaseEvidenceCoverage({
        transactionCount: 0,
        incomeTransactionCount: 0,
        expenseTransactionCount: 0,
        locationEligibleTransactionCount: 0,
        expectedIncome: {
          amountMinor: null,
          basis: 'unavailable_historical',
        },
        budgetAvailable: false,
        savingsGoalCount: 0,
      }).status
    ).toBe('insufficient');
  });
});

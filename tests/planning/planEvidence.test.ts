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

import type {
  RecurringExpense,
} from '../../src/models/finance';
import {
  calculateAvailableAfterCommitments,
  calculateLocationEvidence,
  calculateRecurringEvidence,
  finalizeEvidenceCoverage,
  projectRecurringOccurrenceDates,
} from '../../src/planning/planEvidence';

const recurringExpense = (
  overrides: Partial<RecurringExpense> = {}
): RecurringExpense => ({
  id: 'recurring-1',
  userId: 'alice',
  merchant: 'Private Merchant',
  amount: 50,
  category: 'Food',
  frequency: 'weekly',
  nextDate: '2026-07-15',
  status: 'active',
  ...overrides,
});

describe('Plan recurring occurrence projection', () => {
  it('projects a weekly occurrence forward from a date before the horizon', () => {
    const period = resolvePlanEvidencePeriod({
      kind: '7_days',
      anchorDate: '2026-07-21',
    });

    expect(
      projectRecurringOccurrenceDates(
        recurringExpense({
          nextDate: '2026-07-01',
          frequency: 'weekly',
        }),
        period
      )
    ).toEqual([
      '2026-07-15',
    ]);
  });

  it('clamps a monthly occurrence to the end of February', () => {
    const period = resolvePlanEvidencePeriod({
      kind: 'calendar_month',
      anchorDate: '2026-03-15',
      month: '2026-02',
    });

    expect(
      projectRecurringOccurrenceDates(
        recurringExpense({
          nextDate: '2026-01-31',
          frequency: 'monthly',
        }),
        period
      )
    ).toEqual([
      '2026-02-28',
    ]);
  });

  it('returns to the original monthly day after a clamped month', () => {
    const period = resolvePlanEvidencePeriod({
      kind: 'calendar_month',
      anchorDate: '2026-04-15',
      month: '2026-03',
    });

    expect(
      projectRecurringOccurrenceDates(
        recurringExpense({
          nextDate: '2026-01-31',
          frequency: 'monthly',
        }),
        period
      )
    ).toEqual([
      '2026-03-31',
    ]);
  });

  it('clamps a leap-day annual recurrence in a non-leap year', () => {
    const period = resolvePlanEvidencePeriod({
      kind: 'calendar_month',
      anchorDate: '2025-03-15',
      month: '2025-02',
    });

    expect(
      projectRecurringOccurrenceDates(
        recurringExpense({
          nextDate: '2024-02-29',
          frequency: 'annual',
        }),
        period
      )
    ).toEqual([
      '2025-02-28',
    ]);
  });

  it('does not project inactive commitments', () => {
    const period = resolvePlanEvidencePeriod({
      kind: '7_days',
      anchorDate: '2026-07-21',
    });

    expect(
      projectRecurringOccurrenceDates(
        recurringExpense({
          status: 'inactive',
        }),
        period
      )
    ).toEqual([]);
  });
});

describe('Plan recurring reconciliation', () => {
  it('matches recorded occurrences without deducting them twice', () => {
    const period = resolvePlanEvidencePeriod({
      kind: '7_days',
      anchorDate: '2026-07-21',
    });

    const transactions = [
      transaction({
        id: 'income',
        type: 'income',
        amount: 1000,
        date: '2026-07-15',
      }),
      transaction({
        id: 'recorded-commitment',
        type: 'expense',
        amount: 50,
        merchant: '  private   merchant ',
        categoryId: 'food',
        categoryName: 'Food',
        date: '2026-07-15',
      }),
    ];

    const recorded =
      calculateRecordedFinancials(
        transactions,
        period,
        'CAD'
      );

    const recurring =
      calculateRecurringEvidence(
        [
          recurringExpense(),
          recurringExpense({
            id: 'recurring-rent',
            merchant: 'Private Rent',
            amount: 100,
            category: 'Housing',
            frequency: 'monthly',
            nextDate: '2026-07-18',
          }),
        ],
        transactions,
        period,
        'CAD'
      );

    expect(recurring).toMatchObject({
      projectedMinor: 15000,
      unmatchedMinor: 10000,
      occurrenceCount: 2,
      recordedMatchCount: 1,
    });

    expect(
      calculateAvailableAfterCommitments(
        recorded,
        recurring
      )
    ).toBe(85000);

    const serialized =
      JSON.stringify(recurring);

    expect(serialized).not.toContain(
      'Private Merchant'
    );

    expect(serialized).not.toContain(
      'Private Rent'
    );
  });

  it('does not use raw transaction recurring flags as commitment sources', () => {
    const period = resolvePlanEvidencePeriod({
      kind: '7_days',
      anchorDate: '2026-07-21',
    });

    const result =
      calculateRecurringEvidence(
        [],
        [
          transaction({
            amount: 100,
            isRecurring: true,
          }),
        ],
        period,
        'CAD'
      );

    expect(result).toEqual({
      projectedMinor: 0,
      unmatchedMinor: 0,
      occurrenceCount: 0,
      recordedMatchCount: 0,
      signals: [],
    });
  });
});

describe('Plan coarse location evidence', () => {
  it('includes only neighborhoods supported by at least three expenses', () => {
    const period = resolvePlanEvidencePeriod({
      kind: 'current_month',
      anchorDate: '2026-07-21',
    });

    const result =
      calculateLocationEvidence(
        [
          transaction({
            id: 'midtown-1',
            amount: 10,
            location: {
              ...location,
              neighborhood: 'Midtown',
            },
          }),
          transaction({
            id: 'midtown-2',
            amount: 20,
            location: {
              ...location,
              neighborhood: ' midtown ',
            },
          }),
          transaction({
            id: 'midtown-3',
            amount: 30,
            location: {
              ...location,
              neighborhood: 'MIDTOWN',
            },
          }),
          transaction({
            id: 'downtown-1',
            amount: 10,
            location: {
              ...location,
              neighborhood: 'Downtown',
            },
          }),
          transaction({
            id: 'downtown-2',
            amount: 20,
            location: {
              ...location,
              neighborhood: 'Downtown',
            },
          }),
          transaction({
            id: 'address-only',
            amount: 500,
            location: {
              ...location,
              neighborhood: undefined,
              formattedAddress:
                '100 Private Street',
              address:
                '100 Private Street',
            },
          }),
        ],
        period,
        'CAD'
      );

    expect(result).toEqual({
      eligibleTransactionCount: 5,
      signals: [
        {
          areaLabel: 'Midtown',
          transactionCount: 3,
          totalSpendMinor: 6000,
        },
      ],
    });

    const serialized =
      JSON.stringify(result);

    expect(serialized).not.toContain(
      '100 Private Street'
    );

    expect(serialized).not.toContain(
      'latitude'
    );

    expect(serialized).not.toContain(
      'longitude'
    );
  });

  it('excludes income transactions from location evidence', () => {
    const period = resolvePlanEvidencePeriod({
      kind: 'current_month',
      anchorDate: '2026-07-21',
    });

    const result =
      calculateLocationEvidence(
        [
          transaction({
            id: 'income-1',
            type: 'income',
            location: {
              ...location,
              neighborhood: 'Midtown',
            },
          }),
          transaction({
            id: 'income-2',
            type: 'income',
            location: {
              ...location,
              neighborhood: 'Midtown',
            },
          }),
          transaction({
            id: 'income-3',
            type: 'income',
            location: {
              ...location,
              neighborhood: 'Midtown',
            },
          }),
        ],
        period,
        'CAD'
      );

    expect(result).toEqual({
      eligibleTransactionCount: 0,
      signals: [],
    });
  });
});

describe('Plan recurring and location coverage', () => {
  it('adds deterministic warnings when both signals are unavailable', () => {
    const baseCoverage =
      buildBaseEvidenceCoverage({
        transactionCount: 1,
        incomeTransactionCount: 1,
        expenseTransactionCount: 0,
        locationEligibleTransactionCount: 0,
        expectedIncome: {
          amountMinor: 400000,
          basis:
            'profile_monthly_income',
        },
        budgetAvailable: true,
        savingsGoalCount: 1,
      });

    expect(
      finalizeEvidenceCoverage(
        baseCoverage,
        0,
        0
      )
    ).toMatchObject({
      status: 'partial',
      warnings: [
        {
          code:
            'NO_RECURRING_COMMITMENTS',
          message:
            'No recurring commitments are due in this evidence period.',
        },
        {
          code:
            'LOCATION_COVERAGE_UNAVAILABLE',
          message:
            'No coarse location area meets the minimum evidence threshold.',
        },
      ],
    });
  });

  it('preserves insufficient status for an empty evidence period', () => {
    const baseCoverage =
      buildBaseEvidenceCoverage({
        transactionCount: 0,
        incomeTransactionCount: 0,
        expenseTransactionCount: 0,
        locationEligibleTransactionCount: 0,
        expectedIncome: {
          amountMinor: null,
          basis:
            'unavailable_historical',
        },
        budgetAvailable: false,
        savingsGoalCount: 0,
      });

    expect(
      finalizeEvidenceCoverage(
        baseCoverage,
        0,
        0
      ).status
    ).toBe('insufficient');
  });
});

import type {
  User,
} from '../../src/models/finance';
import type {
  PlanEvidenceInput,
} from '../../src/planning/planEvidence.types';
import {
  buildPlanEvidenceSnapshot,
} from '../../src/planning/planEvidence';

const evidenceUser = (
  overrides: Partial<User> = {}
): User => ({
  id: 'alice',
  name: 'Private User',
  email: 'private@example.com',
  phone: '+1 416 555 0100',
  currency: 'CAD',
  monthlyIncome: 4200.1,
  monthlyBudget: 1200,
  createdAt: '2026-07-01T12:00:00.000Z',
  ...overrides,
});

const fullEvidenceInput = (
  overrides:
    Partial<PlanEvidenceInput> = {}
): PlanEvidenceInput => ({
  user: evidenceUser(),
  horizon: {
    kind: 'current_month',
    anchorDate: '2026-07-21',
  },
  transactions: [
    transaction({
      id: 'income',
      type: 'income',
      amount: 2000,
      categoryId: 'salary',
      categoryName: 'Salary',
      merchant: 'Private Employer',
      date: '2026-07-15',
    }),
    transaction({
      id: 'recorded-commitment',
      amount: 50,
      merchant: 'Private Merchant',
      categoryId: 'food',
      categoryName: 'Food',
      date: '2026-07-15',
      location: {
        ...location,
        neighborhood: 'Downtown',
      },
    }),
    transaction({
      id: 'midtown-1',
      amount: 10,
      date: '2026-07-18',
      location: {
        ...location,
        neighborhood: 'Midtown',
      },
    }),
    transaction({
      id: 'midtown-2',
      amount: 20,
      date: '2026-07-19',
      location: {
        ...location,
        neighborhood: ' midtown ',
      },
    }),
    transaction({
      id: 'midtown-3',
      amount: 30,
      date: '2026-07-20',
      location: {
        ...location,
        neighborhood: 'MIDTOWN',
      },
    }),
  ],
  categories: [
    category(),
    category({
      id: 'transport',
      name: 'Transport',
      monthlyBudget: 200,
    }),
  ],
  budgets: [
    budget(),
  ],
  savingsGoals: [
    savingsGoal(),
  ],
  recurringExpenses: [
    recurringExpense(),
    recurringExpense({
      id: 'recurring-rent',
      merchant: 'Private Rent',
      amount: 100,
      category: 'Housing',
      frequency: 'monthly',
      nextDate: '2026-07-18',
    }),
  ],
  ...overrides,
});

describe('Complete Plan evidence snapshot', () => {
  it('assembles all authoritative evidence before AI use', () => {
    const snapshot =
      buildPlanEvidenceSnapshot(
        fullEvidenceInput()
      );

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      period: {
        kind: 'current_month',
        startDate: '2026-07-01',
        endDate: '2026-07-21',
        monthKey: '2026-07',
        dayCount: 21,
        isCompleteCalendarMonth: false,
      },
      currency: 'CAD',
      currencyFractionDigits: 2,
      totals: {
        recordedIncomeMinor: 200000,
        expectedIncome: {
          amountMinor: 420010,
          basis:
            'profile_monthly_income',
        },
        recordedExpensesMinor: 11000,
        netCashFlowMinor: 189000,
        projectedRecurringCommitmentsMinor:
          15000,
        unmatchedRecurringCommitmentsMinor:
          10000,
        availableAfterCommitmentsMinor:
          179000,
        budgetTotalMinor: 120000,
        horizonBudgetSpendMinor: 11000,
      },
      savings: {
        goalCount: 1,
        targetMinor: 100000,
        savedMinor: 25000,
        remainingMinor: 75000,
        completionPercent: 25,
      },
      locations: [
        {
          areaLabel: 'Midtown',
          transactionCount: 3,
          totalSpendMinor: 6000,
        },
      ],
      coverage: {
        status: 'complete',
        transactionCount: 5,
        incomeTransactionCount: 1,
        expenseTransactionCount: 4,
        locationEligibleTransactionCount: 4,
        warnings: [],
      },
    });

    expect(
      snapshot.baselineRevision
    ).toMatch(
      /^pe1-[0-9a-f]{32}$/
    );
  });

  it('returns the same revision for equivalent input ordering', () => {
    const original =
      fullEvidenceInput();

    const reordered:
      PlanEvidenceInput = {
        ...original,
        transactions:
          original.transactions
            .slice()
            .reverse(),
        categories:
          original.categories
            .slice()
            .reverse(),
        budgets:
          original.budgets
            .slice()
            .reverse(),
        savingsGoals:
          original.savingsGoals
            .slice()
            .reverse(),
        recurringExpenses:
          original.recurringExpenses
            .slice()
            .reverse(),
      };

    const first =
      buildPlanEvidenceSnapshot(
        original
      );

    const second =
      buildPlanEvidenceSnapshot(
        reordered
      );

    expect(
      second.baselineRevision
    ).toBe(
      first.baselineRevision
    );

    expect(second).toEqual(first);
  });

  it('changes the revision when relevant financial evidence changes', () => {
    const original =
      fullEvidenceInput();

    const changed:
      PlanEvidenceInput = {
        ...original,
        transactions:
          original.transactions.map(
            (item) =>
              item.id ===
              'midtown-1'
                ? {
                    ...item,
                    amount: 11,
                  }
                : item
          ),
      };

    expect(
      buildPlanEvidenceSnapshot(
        changed
      ).baselineRevision
    ).not.toBe(
      buildPlanEvidenceSnapshot(
        original
      ).baselineRevision
    );
  });

  it('does not change the revision for excluded sensitive-only edits', () => {
    const original =
      fullEvidenceInput();

    const changed:
      PlanEvidenceInput = {
        ...original,
        user: {
          ...original.user,
          name:
            'Different Private User',
          email:
            'different@example.com',
          phone:
            '+1 647 555 9999',
        },
        transactions:
          original.transactions.map(
            (item) =>
              item.id ===
              'midtown-1'
                ? {
                    ...item,
                    notes:
                      'Different private note',
                    paymentMethod:
                      'Different Private Card',
                    receipts: [
                      {
                        id: 'receipt-private',
                        objectKey:
                          'private/object',
                        fileName:
                          'private.jpg',
                        mimeType:
                          'image/jpeg',
                        sizeBytes: 100,
                        uploadedAt:
                          '2026-07-21T12:00:00.000Z',
                        status: 'local',
                        uri:
                          'file://private',
                      },
                    ],
                    location: {
                      ...item.location,
                      placeId:
                        'private-place-id',
                      name:
                        'Different Private Place',
                      formattedAddress:
                        '999 Private Street',
                      address:
                        '999 Private Street',
                      latitude: 1,
                      longitude: 2,
                      source:
                        'imported',
                    },
                  }
                : item
          ),
        savingsGoals:
          original.savingsGoals.map(
            (goal) => ({
              ...goal,
              name:
                'Different Private Goal',
            })
          ),
      };

    expect(
      buildPlanEvidenceSnapshot(
        changed
      ).baselineRevision
    ).toBe(
      buildPlanEvidenceSnapshot(
        original
      ).baselineRevision
    );
  });

  it('does not expose prohibited source values in the snapshot', () => {
    const serialized =
      JSON.stringify(
        buildPlanEvidenceSnapshot(
          fullEvidenceInput()
        )
      );

    [
      'Private User',
      'private@example.com',
      '+1 416 555 0100',
      'Private Employer',
      'Private Merchant',
      'Private Rent',
      'Private note',
      'Private Card',
      '100 Private Street',
      'Emergency fund',
    ].forEach((value) => {
      expect(serialized)
        .not.toContain(value);
    });
  });

  it('returns an insufficient but usable empty snapshot', () => {
    const snapshot =
      buildPlanEvidenceSnapshot(
        fullEvidenceInput({
          transactions: [],
          categories: [],
          budgets: [],
          savingsGoals: [],
          recurringExpenses: [],
        })
      );

    expect(snapshot).toMatchObject({
      totals: {
        recordedIncomeMinor: 0,
        recordedExpensesMinor: 0,
        netCashFlowMinor: 0,
        projectedRecurringCommitmentsMinor:
          0,
        unmatchedRecurringCommitmentsMinor:
          0,
        availableAfterCommitmentsMinor:
          0,
        budgetTotalMinor: null,
        horizonBudgetSpendMinor: 0,
      },
      categories: [],
      recurring: [],
      locations: [],
      savings: {
        goalCount: 0,
        targetMinor: 0,
        savedMinor: 0,
        remainingMinor: 0,
        completionPercent: 0,
      },
      coverage: {
        status: 'insufficient',
      },
    });
  });
});

describe('Plan evidence revision scope', () => {
  it('ignores inactive recurring records that do not affect evidence', () => {
    const original =
      fullEvidenceInput({
        recurringExpenses: [
          ...fullEvidenceInput()
            .recurringExpenses,
          recurringExpense({
            id: 'inactive-record',
            status: 'inactive',
            amount: 10,
            nextDate: '2026-07-18',
          }),
        ],
      });

    const changed:
      PlanEvidenceInput = {
        ...original,
        recurringExpenses:
          original.recurringExpenses.map(
            (item) =>
              item.id ===
              'inactive-record'
                ? {
                    ...item,
                    amount: 999,
                    merchant:
                      'Different Private Merchant',
                  }
                : item
          ),
      };

    expect(
      buildPlanEvidenceSnapshot(
        changed
      ).baselineRevision
    ).toBe(
      buildPlanEvidenceSnapshot(
        original
      ).baselineRevision
    );
  });

  it('ignores future recurring records outside the evidence period', () => {
    const original =
      fullEvidenceInput({
        recurringExpenses: [
          ...fullEvidenceInput()
            .recurringExpenses,
          recurringExpense({
            id: 'future-record',
            amount: 10,
            nextDate: '2027-01-01',
          }),
        ],
      });

    const changed:
      PlanEvidenceInput = {
        ...original,
        recurringExpenses:
          original.recurringExpenses.map(
            (item) =>
              item.id ===
              'future-record'
                ? {
                    ...item,
                    amount: 999,
                  }
                : item
          ),
      };

    expect(
      buildPlanEvidenceSnapshot(
        changed
      ).baselineRevision
    ).toBe(
      buildPlanEvidenceSnapshot(
        original
      ).baselineRevision
    );
  });

  it('ignores an unrelated category when an explicit budget is authoritative', () => {
    const original =
      fullEvidenceInput({
        categories: [
          ...fullEvidenceInput()
            .categories,
          category({
            id: 'unused-category',
            name: 'Unused',
            monthlyBudget: 10,
          }),
        ],
      });

    const changed:
      PlanEvidenceInput = {
        ...original,
        categories:
          original.categories.map(
            (item) =>
              item.id ===
              'unused-category'
                ? {
                    ...item,
                    monthlyBudget: 999,
                  }
                : item
          ),
      };

    expect(
      buildPlanEvidenceSnapshot(
        changed
      ).baselineRevision
    ).toBe(
      buildPlanEvidenceSnapshot(
        original
      ).baselineRevision
    );
  });

  it('changes when an in-horizon recurring commitment changes', () => {
    const original =
      fullEvidenceInput();

    const changed:
      PlanEvidenceInput = {
        ...original,
        recurringExpenses:
          original.recurringExpenses.map(
            (item) =>
              item.id ===
              'recurring-rent'
                ? {
                    ...item,
                    amount: 110,
                  }
                : item
          ),
      };

    expect(
      buildPlanEvidenceSnapshot(
        changed
      ).baselineRevision
    ).not.toBe(
      buildPlanEvidenceSnapshot(
        original
      ).baselineRevision
    );
  });
});

describe('Plan evidence boundary matrix', () => {
  it('includes both horizon boundaries and excludes adjacent dates', () => {
    const period =
      resolvePlanEvidencePeriod({
        kind: '7_days',
        anchorDate: '2026-07-21',
      });

    expect(
      calculateRecordedFinancials(
        [
          transaction({
            id: 'before',
            amount: 100,
            date: '2026-07-14',
          }),
          transaction({
            id: 'start',
            amount: 10,
            date: '2026-07-15',
          }),
          transaction({
            id: 'end',
            amount: 20,
            date: '2026-07-21',
          }),
          transaction({
            id: 'after',
            amount: 100,
            date: '2026-07-22',
          }),
        ],
        period,
        'CAD'
      )
    ).toMatchObject({
      recordedExpensesMinor: 3000,
      transactionCount: 2,
      expenseTransactionCount: 2,
    });
  });

  it('keeps overlapping horizons independently deterministic', () => {
    const input =
      fullEvidenceInput({
        transactions: [
          transaction({
            id: 'early-month',
            amount: 40,
            date: '2026-07-05',
          }),
          transaction({
            id: 'recent',
            amount: 60,
            date: '2026-07-20',
          }),
        ],
        recurringExpenses: [],
      });

    const sevenDay =
      buildPlanEvidenceSnapshot({
        ...input,
        horizon: {
          kind: '7_days',
          anchorDate: '2026-07-21',
        },
      });

    const currentMonth =
      buildPlanEvidenceSnapshot({
        ...input,
        horizon: {
          kind: 'current_month',
          anchorDate: '2026-07-21',
        },
      });

    expect(
      sevenDay.totals
        .recordedExpensesMinor
    ).toBe(6000);

    expect(
      currentMonth.totals
        .recordedExpensesMinor
    ).toBe(10000);

    expect(
      sevenDay.baselineRevision
    ).not.toBe(
      currentMonth.baselineRevision
    );
  });
});

describe('Plan recurring duplicate reconciliation', () => {
  it('matches one recorded expense to at most one projected occurrence', () => {
    const period =
      resolvePlanEvidencePeriod({
        kind: '7_days',
        anchorDate: '2026-07-21',
      });

    const result =
      calculateRecurringEvidence(
        [
          recurringExpense({
            id: 'duplicate-1',
          }),
          recurringExpense({
            id: 'duplicate-2',
          }),
        ],
        [
          transaction({
            id: 'single-recorded-payment',
            amount: 50,
            merchant:
              'Private Merchant',
            categoryId: 'food',
            categoryName: 'Food',
            date: '2026-07-15',
          }),
        ],
        period,
        'CAD'
      );

    expect(result).toMatchObject({
      projectedMinor: 10000,
      unmatchedMinor: 5000,
      occurrenceCount: 2,
      recordedMatchCount: 1,
    });
  });
});

describe('Plan evidence financial invariants', () => {
  it('rejects a negative transaction amount', () => {
    expect(() =>
      buildPlanEvidenceSnapshot(
        fullEvidenceInput({
          transactions: [
            transaction({
              amount: -1,
            }),
          ],
        })
      )
    ).toThrow(
      'Transaction amount cannot be negative'
    );
  });

  it('rejects a negative monthly income baseline', () => {
    expect(() =>
      buildPlanEvidenceSnapshot(
        fullEvidenceInput({
          user: evidenceUser({
            monthlyIncome: -1,
          }),
        })
      )
    ).toThrow(
      'Monthly income cannot be negative'
    );
  });

  it('rejects a negative explicit budget total', () => {
    expect(() =>
      buildPlanEvidenceSnapshot(
        fullEvidenceInput({
          budgets: [
            budget({
              totalBudget: -1,
            }),
          ],
        })
      )
    ).toThrow(
      'Budget total cannot be negative'
    );
  });

  it('rejects a negative savings balance', () => {
    expect(() =>
      buildPlanEvidenceSnapshot(
        fullEvidenceInput({
          savingsGoals: [
            savingsGoal({
              currentAmount: -1,
            }),
          ],
        })
      )
    ).toThrow(
      'Savings current amount cannot be negative'
    );
  });

  it('rejects a negative recurring amount due in the horizon', () => {
    expect(() =>
      buildPlanEvidenceSnapshot(
        fullEvidenceInput({
          recurringExpenses: [
            recurringExpense({
              amount: -1,
            }),
          ],
        })
      )
    ).toThrow(
      'Recurring amount cannot be negative'
    );
  });
});

describe('Plan evidence output privacy keys', () => {
  it('contains no prohibited source fields at any output depth', () => {
    const prohibitedKeys =
      new Set([
        'merchant',
        'paymentMethod',
        'notes',
        'receipts',
        'latitude',
        'longitude',
        'formattedAddress',
        'address',
        'placeId',
        'transactionId',
        'userId',
        'email',
        'phone',
        'name',
      ]);

    const found =
      new Set<string>();

    const visit = (
      value: unknown
    ) => {
      if (
        value === null ||
        typeof value !== 'object'
      ) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }

      Object.entries(
        value as Record<
          string,
          unknown
        >
      ).forEach(
        ([key, nestedValue]) => {
          if (
            prohibitedKeys.has(key)
          ) {
            found.add(key);
          }

          visit(nestedValue);
        }
      );
    };

    visit(
      buildPlanEvidenceSnapshot(
        fullEvidenceInput()
      )
    );

    expect(
      Array.from(found).sort()
    ).toEqual([]);
  });
});

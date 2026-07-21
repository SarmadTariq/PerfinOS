import type {
  Budget,
  Category,
  SavingsGoal,
  Transaction,
} from '../models/finance';
import type {
  PlanEvidenceBudgetContext,
  PlanEvidenceCategorySignal,
  PlanEvidenceCoverage,
  PlanEvidenceCoverageInput,
  PlanEvidenceExpectedIncome,
  PlanEvidenceHorizonRequest,
  PlanEvidencePeriod,
  PlanEvidenceRecordedFinancials,
  PlanEvidenceSavingsProgress,
  PlanEvidenceWarning,
} from './planEvidence.types';

const ISO_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_KEY_PATTERN =
  /^(\d{4})-(\d{2})$/;

const normalizeCurrency = (
  currency: string
) => {
  const normalized =
    currency.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error(
      'Currency must be a three-letter code'
    );
  }

  return normalized;
};

export const currencyFractionDigits = (
  currency: string
): number => {
  const normalized =
    normalizeCurrency(currency);

  try {
    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency: normalized,
        currencyDisplay: 'code',
      }
    ).resolvedOptions()
      .maximumFractionDigits;
  } catch {
    throw new Error(
      `Unsupported currency code: ${normalized}`
    );
  }
};

const assertFiniteMoneyValue = (
  value: number
) => {
  if (!Number.isFinite(value)) {
    throw new Error(
      'Money value must be finite'
    );
  }
};

const assertSafeMinorUnits = (
  value: number
) => {
  if (!Number.isSafeInteger(value)) {
    throw new Error(
      'Minor-unit value must be a safe integer'
    );
  }
};

const roundHalfAwayFromZero = (
  value: number
) => {
  if (value === 0) return 0;

  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value);
  const correction =
    Number.EPSILON *
    Math.max(1, absolute);

  return sign * Math.round(
    absolute + correction
  );
};

export const toMinorUnits = (
  value: number,
  currency: string
): number => {
  assertFiniteMoneyValue(value);

  const fractionDigits =
    currencyFractionDigits(currency);

  const factor =
    10 ** fractionDigits;

  const minorUnits =
    roundHalfAwayFromZero(
      value * factor
    );

  assertSafeMinorUnits(minorUnits);

  return minorUnits;
};

export const fromMinorUnits = (
  minorUnits: number,
  currency: string
): number => {
  assertSafeMinorUnits(minorUnits);

  const fractionDigits =
    currencyFractionDigits(currency);

  return (
    minorUnits /
    10 ** fractionDigits
  );
};

const parseIsoDate = (
  value: string,
  label: string
) => {
  const match =
    ISO_DATE_PATTERN.exec(value);

  if (!match) {
    throw new Error(
      `${label} must be a valid YYYY-MM-DD date`
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(
      `${label} must be a valid YYYY-MM-DD date`
    );
  }

  return date;
};

const parseMonthKey = (
  value: string
) => {
  const match =
    MONTH_KEY_PATTERN.exec(value);

  if (!match) {
    throw new Error(
      'Month must be a valid YYYY-MM value'
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (
    year < 1 ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      'Month must be a valid YYYY-MM value'
    );
  }

  return {
    year,
    month,
  };
};

const toIsoDate = (
  date: Date
) =>
  date.toISOString().slice(0, 10);

const addUtcDays = (
  date: Date,
  days: number
) => {
  const result = new Date(
    date.getTime()
  );

  result.setUTCDate(
    result.getUTCDate() + days
  );

  return result;
};

const inclusiveDayCount = (
  startDate: Date,
  endDate: Date
) =>
  Math.floor(
    (
      endDate.getTime() -
      startDate.getTime()
    ) /
      86_400_000
  ) + 1;

const monthKeyForDate = (
  date: Date
) =>
  `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, '0')}`;

const startOfUtcMonth = (
  date: Date
) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1
    )
  );

const endOfUtcMonth = (
  year: number,
  month: number
) =>
  new Date(
    Date.UTC(
      year,
      month,
      0
    )
  );

const createPeriod = (
  request: PlanEvidenceHorizonRequest,
  startDate: Date,
  endDate: Date,
  monthKey: string | null,
  isCompleteCalendarMonth: boolean
): PlanEvidencePeriod => ({
  kind: request.kind,
  startDate: toIsoDate(startDate),
  endDate: toIsoDate(endDate),
  monthKey,
  dayCount: inclusiveDayCount(
    startDate,
    endDate
  ),
  isCompleteCalendarMonth,
});

export const resolvePlanEvidencePeriod = (
  request: PlanEvidenceHorizonRequest
): PlanEvidencePeriod => {
  const anchorDate = parseIsoDate(
    request.anchorDate,
    'Anchor date'
  );

  if (request.kind === '7_days') {
    const startDate = addUtcDays(
      anchorDate,
      -6
    );

    const startMonth =
      monthKeyForDate(startDate);

    const endMonth =
      monthKeyForDate(anchorDate);

    return createPeriod(
      request,
      startDate,
      anchorDate,
      startMonth === endMonth
        ? endMonth
        : null,
      false
    );
  }

  if (request.kind === '14_days') {
    const startDate = addUtcDays(
      anchorDate,
      -13
    );

    const startMonth =
      monthKeyForDate(startDate);

    const endMonth =
      monthKeyForDate(anchorDate);

    return createPeriod(
      request,
      startDate,
      anchorDate,
      startMonth === endMonth
        ? endMonth
        : null,
      false
    );
  }

  if (
    request.kind === 'current_month'
  ) {
    return createPeriod(
      request,
      startOfUtcMonth(anchorDate),
      anchorDate,
      monthKeyForDate(anchorDate),
      false
    );
  }

  if (!request.month) {
    throw new Error(
      'Calendar-month evidence requires a month'
    );
  }

  const {
    year,
    month,
  } = parseMonthKey(request.month);

  const anchorMonth =
    monthKeyForDate(anchorDate);

  if (request.month > anchorMonth) {
    throw new Error(
      'Future calendar months are not supported'
    );
  }

  const startDate = new Date(
    Date.UTC(
      year,
      month - 1,
      1
    )
  );

  const isCurrentMonth =
    request.month === anchorMonth;

  const endDate = isCurrentMonth
    ? anchorDate
    : endOfUtcMonth(year, month);

  return createPeriod(
    request,
    startDate,
    endDate,
    request.month,
    !isCurrentMonth
  );
};


const transactionIsInPeriod = (
  transaction: Transaction,
  period: PlanEvidencePeriod
) =>
  transaction.date >= period.startDate &&
  transaction.date <= period.endDate;

export const calculateRecordedFinancials = (
  transactions: Transaction[],
  period: PlanEvidencePeriod,
  currency: string
): PlanEvidenceRecordedFinancials => {
  const periodTransactions =
    transactions.filter((transaction) =>
      transactionIsInPeriod(
        transaction,
        period
      )
    );

  const incomeTransactions =
    periodTransactions.filter(
      (transaction) =>
        transaction.type === 'income'
    );

  const expenseTransactions =
    periodTransactions.filter(
      (transaction) =>
        transaction.type === 'expense'
    );

  const recordedIncomeMinor =
    incomeTransactions.reduce(
      (sum, transaction) =>
        sum +
        toMinorUnits(
          transaction.amount,
          currency
        ),
      0
    );

  const recordedExpensesMinor =
    expenseTransactions.reduce(
      (sum, transaction) =>
        sum +
        toMinorUnits(
          transaction.amount,
          currency
        ),
      0
    );

  return {
    recordedIncomeMinor,
    recordedExpensesMinor,
    netCashFlowMinor:
      recordedIncomeMinor -
      recordedExpensesMinor,
    horizonBudgetSpendMinor:
      recordedExpensesMinor,
    transactionCount:
      periodTransactions.length,
    incomeTransactionCount:
      incomeTransactions.length,
    expenseTransactionCount:
      expenseTransactions.length,
  };
};

export const resolveExpectedIncome = (
  request: PlanEvidenceHorizonRequest,
  period: PlanEvidencePeriod,
  monthlyIncome: number,
  currency: string
): PlanEvidenceExpectedIncome => {
  if (
    request.kind === '7_days' ||
    request.kind === '14_days'
  ) {
    return {
      amountMinor: null,
      basis:
        'unavailable_short_horizon',
    };
  }

  if (
    request.kind === 'calendar_month' &&
    period.isCompleteCalendarMonth
  ) {
    return {
      amountMinor: null,
      basis:
        'unavailable_historical',
    };
  }

  return {
    amountMinor: toMinorUnits(
      monthlyIncome,
      currency
    ),
    basis:
      'profile_monthly_income',
  };
};

const evidenceBudgetMonthKey = (
  request: PlanEvidenceHorizonRequest
) =>
  request.kind === 'calendar_month'
    ? request.month as string
    : request.anchorDate.slice(0, 7);

export const resolveBudgetContext = (
  request: PlanEvidenceHorizonRequest,
  period: PlanEvidencePeriod,
  budgets: Budget[],
  categories: Category[],
  currency: string
): PlanEvidenceBudgetContext => {
  const monthKey =
    evidenceBudgetMonthKey(request);

  const explicitBudget =
    budgets.find(
      (budget) =>
        budget.month === monthKey
    );

  if (explicitBudget) {
    const categoryBudgetMinor =
      Object.fromEntries(
        Object.entries(
          explicitBudget.categoryBudgets
        )
          .filter(
            ([, value]) =>
              Number.isFinite(value)
          )
          .sort(
            ([left], [right]) =>
              left.localeCompare(right)
          )
          .map(
            ([categoryId, value]) => [
              categoryId,
              toMinorUnits(
                value,
                currency
              ),
            ]
          )
      );

    return {
      monthKey,
      totalMinor: toMinorUnits(
        explicitBudget.totalBudget,
        currency
      ),
      basis: 'explicit_budget',
      categoryBudgetMinor,
    };
  }

  const isHistoricalMonth =
    request.kind ===
      'calendar_month' &&
    period.isCompleteCalendarMonth;

  if (isHistoricalMonth) {
    return {
      monthKey,
      totalMinor: null,
      basis: 'unavailable',
      categoryBudgetMinor: {},
    };
  }

  const budgetCategories =
    categories
      .filter(
        (category) =>
          category.type === 'expense' &&
          category.monthlyBudget > 0
      )
      .sort(
        (left, right) =>
          left.id.localeCompare(right.id)
      );

  if (budgetCategories.length === 0) {
    return {
      monthKey,
      totalMinor: null,
      basis: 'unavailable',
      categoryBudgetMinor: {},
    };
  }

  const categoryBudgetMinor =
    Object.fromEntries(
      budgetCategories.map(
        (category) => [
          category.id,
          toMinorUnits(
            category.monthlyBudget,
            currency
          ),
        ]
      )
    );

  return {
    monthKey,
    totalMinor:
      Object.values(
        categoryBudgetMinor
      ).reduce(
        (sum, value) =>
          sum + value,
        0
      ),
    basis: 'category_baseline',
    categoryBudgetMinor,
  };
};

export const calculateCategorySignals = (
  transactions: Transaction[],
  categories: Category[],
  period: PlanEvidencePeriod,
  currency: string,
  budgetContext: PlanEvidenceBudgetContext
): PlanEvidenceCategorySignal[] => {
  const categoryNames =
    new Map(
      categories.map((category) => [
        category.id,
        category.name,
      ])
    );

  const spending =
    transactions
      .filter(
        (transaction) =>
          transaction.type ===
            'expense' &&
          transactionIsInPeriod(
            transaction,
            period
          )
      )
      .reduce<
        Record<
          string,
          {
            categoryName: string;
            transactionCount: number;
            spendMinor: number;
          }
        >
      >((groups, transaction) => {
        const existing =
          groups[
            transaction.categoryId
          ];

        const categoryName =
          categoryNames.get(
            transaction.categoryId
          ) ||
          transaction.categoryName ||
          'Uncategorized';

        groups[
          transaction.categoryId
        ] = {
          categoryName:
            existing?.categoryName ||
            categoryName,
          transactionCount:
            (
              existing
                ?.transactionCount || 0
            ) + 1,
          spendMinor:
            (
              existing?.spendMinor || 0
            ) +
            toMinorUnits(
              transaction.amount,
              currency
            ),
        };

        return groups;
      }, {});

  const categoryIds =
    Array.from(
      new Set([
        ...Object.keys(spending),
        ...Object.keys(
          budgetContext
            .categoryBudgetMinor
        ),
      ])
    );

  return categoryIds
    .map((categoryId) => {
      const spend =
        spending[categoryId];

      const budgetMinor =
        budgetContext
          .categoryBudgetMinor[
          categoryId
        ] ?? null;

      const spendMinor =
        spend?.spendMinor || 0;

      return {
        categoryId,
        categoryName:
          categoryNames.get(
            categoryId
          ) ||
          spend?.categoryName ||
          'Uncategorized',
        transactionCount:
          spend?.transactionCount || 0,
        spendMinor,
        budgetMinor,
        remainingMinor:
          budgetMinor === null
            ? null
            : budgetMinor -
              spendMinor,
      };
    })
    .filter(
      (signal) =>
        signal.spendMinor > 0 ||
        signal.budgetMinor !== null
    )
    .sort(
      (left, right) =>
        right.spendMinor -
          left.spendMinor ||
        left.categoryName.localeCompare(
          right.categoryName
        ) ||
        left.categoryId.localeCompare(
          right.categoryId
        )
    );
};

export const calculateSavingsProgressEvidence = (
  goals: SavingsGoal[],
  currency: string
): PlanEvidenceSavingsProgress => {
  const targetMinor =
    goals.reduce(
      (sum, goal) =>
        sum +
        toMinorUnits(
          goal.targetAmount,
          currency
        ),
      0
    );

  const savedMinor =
    goals.reduce(
      (sum, goal) =>
        sum +
        toMinorUnits(
          goal.currentAmount,
          currency
        ),
      0
    );

  return {
    goalCount: goals.length,
    targetMinor,
    savedMinor,
    remainingMinor: Math.max(
      targetMinor - savedMinor,
      0
    ),
    completionPercent:
      targetMinor === 0
        ? 0
        : Math.min(
            100,
            Math.round(
              (
                savedMinor /
                targetMinor
              ) * 100
            )
          ),
  };
};

export const buildBaseEvidenceCoverage = (
  input: PlanEvidenceCoverageInput
): PlanEvidenceCoverage => {
  const warnings:
    PlanEvidenceWarning[] = [];

  if (
    input.expectedIncome.basis ===
    'unavailable_short_horizon'
  ) {
    warnings.push({
      code:
        'EXPECTED_INCOME_UNAVAILABLE_SHORT_HORIZON',
      message:
        'Expected income is unavailable for short planning horizons.',
    });
  }

  if (
    input.expectedIncome.basis ===
    'unavailable_historical'
  ) {
    warnings.push({
      code:
        'HISTORICAL_INCOME_BASELINE_UNAVAILABLE',
      message:
        'A historical expected-income baseline is unavailable for this month.',
    });
  }

  if (input.transactionCount === 0) {
    warnings.push({
      code:
        'NO_RECORDED_TRANSACTIONS',
      message:
        'No recorded transactions are available for this evidence period.',
    });
  }

  if (!input.budgetAvailable) {
    warnings.push({
      code: 'NO_BUDGET',
      message:
        'No budget baseline is available for this evidence period.',
    });
  }

  if (
    input.savingsGoalCount === 0
  ) {
    warnings.push({
      code: 'NO_SAVINGS_GOALS',
      message:
        'No savings goals are available for planning evidence.',
    });
  }

  return {
    status:
      input.transactionCount === 0
        ? 'insufficient'
        : warnings.length > 0
          ? 'partial'
          : 'complete',
    transactionCount:
      input.transactionCount,
    incomeTransactionCount:
      input.incomeTransactionCount,
    expenseTransactionCount:
      input.expenseTransactionCount,
    locationEligibleTransactionCount:
      input
        .locationEligibleTransactionCount,
    warnings,
  };
};

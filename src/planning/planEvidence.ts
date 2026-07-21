import type {
  Budget,
  Category,
  RecurringExpense,
  RecurringFrequency,
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
  PlanEvidenceInput,
  PlanEvidenceLocationResult,
  PlanEvidencePeriod,
  PlanEvidenceRecurringResult,
  PlanEvidenceSnapshot,
  PlanEvidenceRecurringSignal,
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

  let fractionDigits:
    number | undefined;

  try {
    fractionDigits =
      new Intl.NumberFormat(
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

  if (
    fractionDigits === undefined
  ) {
    throw new Error(
      `Currency fraction digits are unavailable: ${normalized}`
    );
  }

  return fractionDigits;
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

const toNonNegativeMinorUnits = (
  value: number,
  currency: string,
  label: string
) => {
  assertFiniteMoneyValue(value);

  if (value < 0) {
    throw new Error(
      `${label} cannot be negative`
    );
  }

  return toMinorUnits(
    value,
    currency
  );
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
        toNonNegativeMinorUnits(
          transaction.amount,
          currency,
          'Transaction amount'
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
    amountMinor:
      toNonNegativeMinorUnits(
        monthlyIncome,
        currency,
        'Monthly income'
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
              toNonNegativeMinorUnits(
                value,
                currency,
                'Category budget'
              ),
            ]
          )
      );

    return {
      monthKey,
      totalMinor:
        toNonNegativeMinorUnits(
          explicitBudget.totalBudget,
          currency,
          'Budget total'
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
          toNonNegativeMinorUnits(
            category.monthlyBudget,
            currency,
            'Category budget'
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
            toNonNegativeMinorUnits(
              transaction.amount,
              currency,
              'Transaction amount'
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
        toNonNegativeMinorUnits(
          goal.targetAmount,
          currency,
          'Savings target amount'
        ),
      0
    );

  const savedMinor =
    goals.reduce(
      (sum, goal) =>
        sum +
        toNonNegativeMinorUnits(
          goal.currentAmount,
          currency,
          'Savings current amount'
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


const millisecondsPerDay =
  86_400_000;

const compareUtcDates = (
  left: Date,
  right: Date
) =>
  left.getTime() -
  right.getTime();

const daysBetweenUtcDates = (
  startDate: Date,
  endDate: Date
) =>
  Math.floor(
    (
      endDate.getTime() -
      startDate.getTime()
    ) /
      millisecondsPerDay
  );

const daysInUtcMonth = (
  year: number,
  monthIndex: number
) =>
  new Date(
    Date.UTC(
      year,
      monthIndex + 1,
      0
    )
  ).getUTCDate();

const addMonthsFromRecurrenceAnchor = (
  anchorDate: Date,
  monthOffset: number
) => {
  const targetMonthStart =
    new Date(
      Date.UTC(
        anchorDate.getUTCFullYear(),
        anchorDate.getUTCMonth() +
          monthOffset,
        1
      )
    );

  const targetYear =
    targetMonthStart.getUTCFullYear();

  const targetMonth =
    targetMonthStart.getUTCMonth();

  const targetDay =
    Math.min(
      anchorDate.getUTCDate(),
      daysInUtcMonth(
        targetYear,
        targetMonth
      )
    );

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay
    )
  );
};

const recurrenceDayStep = (
  frequency: RecurringFrequency
) => {
  if (frequency === 'weekly') {
    return 7;
  }

  if (frequency === 'biweekly') {
    return 14;
  }

  return null;
};

const recurrenceMonthStep = (
  frequency: RecurringFrequency
) => {
  if (frequency === 'monthly') {
    return 1;
  }

  if (frequency === 'quarterly') {
    return 3;
  }

  if (frequency === 'annual') {
    return 12;
  }

  return null;
};

export const projectRecurringOccurrenceDates = (
  recurringExpense: RecurringExpense,
  period: PlanEvidencePeriod
): string[] => {
  if (
    recurringExpense.status !==
    'active'
  ) {
    return [];
  }

  const recurrenceAnchor =
    parseIsoDate(
      recurringExpense.nextDate,
      'Recurring next date'
    );

  const periodStart =
    parseIsoDate(
      period.startDate,
      'Evidence start date'
    );

  const periodEnd =
    parseIsoDate(
      period.endDate,
      'Evidence end date'
    );

  if (
    compareUtcDates(
      recurrenceAnchor,
      periodEnd
    ) > 0
  ) {
    return [];
  }

  const dayStep =
    recurrenceDayStep(
      recurringExpense.frequency
    );

  if (dayStep !== null) {
    const difference =
      Math.max(
        0,
        daysBetweenUtcDates(
          recurrenceAnchor,
          periodStart
        )
      );

    let jumpCount =
      Math.floor(
        difference / dayStep
      );

    let occurrence =
      addUtcDays(
        recurrenceAnchor,
        jumpCount * dayStep
      );

    if (
      compareUtcDates(
        occurrence,
        periodStart
      ) < 0
    ) {
      jumpCount += 1;
      occurrence =
        addUtcDays(
          recurrenceAnchor,
          jumpCount * dayStep
        );
    }

    const dates: string[] = [];

    while (
      compareUtcDates(
        occurrence,
        periodEnd
      ) <= 0
    ) {
      dates.push(
        toIsoDate(occurrence)
      );

      occurrence =
        addUtcDays(
          occurrence,
          dayStep
        );
    }

    return dates;
  }

  const monthStep =
    recurrenceMonthStep(
      recurringExpense.frequency
    );

  if (monthStep === null) {
    return [];
  }

  const monthDifference =
    (
      periodStart.getUTCFullYear() -
      recurrenceAnchor.getUTCFullYear()
    ) *
      12 +
    (
      periodStart.getUTCMonth() -
      recurrenceAnchor.getUTCMonth()
    );

  let jumpCount =
    Math.max(
      0,
      Math.floor(
        monthDifference /
          monthStep
      )
    );

  let occurrence =
    addMonthsFromRecurrenceAnchor(
      recurrenceAnchor,
      jumpCount * monthStep
    );

  while (
    compareUtcDates(
      occurrence,
      periodStart
    ) < 0
  ) {
    jumpCount += 1;

    occurrence =
      addMonthsFromRecurrenceAnchor(
        recurrenceAnchor,
        jumpCount * monthStep
      );
  }

  const dates: string[] = [];

  while (
    compareUtcDates(
      occurrence,
      periodEnd
    ) <= 0
  ) {
    dates.push(
      toIsoDate(occurrence)
    );

    jumpCount += 1;

    occurrence =
      addMonthsFromRecurrenceAnchor(
        recurrenceAnchor,
        jumpCount * monthStep
      );
  }

  return dates;
};

const normalizeMatchValue = (
  value: string
) =>
  value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');

const transactionMatchesCommitment = (
  transaction: Transaction,
  recurringExpense:
    RecurringExpense,
  occurrenceDate: string,
  amountMinor: number,
  currency: string
) => {
  if (
    transaction.type !== 'expense' ||
    transaction.date !==
      occurrenceDate
  ) {
    return false;
  }

  if (
    toMinorUnits(
      transaction.amount,
      currency
    ) !== amountMinor
  ) {
    return false;
  }

  const recurringMerchant =
    normalizeMatchValue(
      recurringExpense.merchant
    );

  const transactionMerchant =
    normalizeMatchValue(
      transaction.merchant
    );

  if (
    recurringMerchant !==
    transactionMerchant
  ) {
    return false;
  }

  const recurringCategory =
    normalizeMatchValue(
      recurringExpense.category
    );

  const transactionCategoryName =
    normalizeMatchValue(
      transaction.categoryName
    );

  const transactionCategoryId =
    normalizeMatchValue(
      transaction.categoryId
    );

  return (
    recurringCategory ===
      transactionCategoryName ||
    recurringCategory ===
      transactionCategoryId
  );
};

export const calculateRecurringEvidence = (
  recurringExpenses:
    RecurringExpense[],
  transactions: Transaction[],
  period: PlanEvidencePeriod,
  currency: string
): PlanEvidenceRecurringResult => {
  const matchableTransactions =
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
      .map((transaction) => ({
        transaction,
        matched: false,
      }));

  const signals =
    new Map<
      string,
      PlanEvidenceRecurringSignal
    >();

  let projectedMinor = 0;
  let unmatchedMinor = 0;
  let occurrenceCount = 0;
  let recordedMatchCount = 0;

  const activeRecurringExpenses =
    recurringExpenses
      .filter(
        (recurringExpense) =>
          recurringExpense.status ===
          'active'
      )
      .slice()
      .sort(
        (left, right) =>
          left.id.localeCompare(
            right.id
          )
      );

  activeRecurringExpenses.forEach(
    (recurringExpense) => {
      const occurrenceDates =
        projectRecurringOccurrenceDates(
          recurringExpense,
          period
        );

      if (
        occurrenceDates.length === 0
      ) {
        return;
      }

      if (
        occurrenceDates.length === 0
      ) {
        return;
      }

      const amountMinor =
        toNonNegativeMinorUnits(
          recurringExpense.amount,
          currency,
          'Recurring amount'
        );

      const categoryName =
        recurringExpense.category
          .trim() ||
        'Uncategorized';

      const signalKey =
        `${normalizeMatchValue(
          categoryName
        )}|${
          recurringExpense.frequency
        }`;

      const existingSignal =
        signals.get(signalKey);

      const signal:
        PlanEvidenceRecurringSignal =
          existingSignal || {
            categoryName,
            frequency:
              recurringExpense
                .frequency,
            occurrenceCount: 0,
            recordedMatchCount: 0,
            projectedMinor: 0,
            unmatchedMinor: 0,
          };

      occurrenceDates.forEach(
        (occurrenceDate) => {
          occurrenceCount += 1;
          projectedMinor +=
            amountMinor;

          signal.occurrenceCount += 1;
          signal.projectedMinor +=
            amountMinor;

          const matchingIndex =
            matchableTransactions
              .findIndex(
                ({
                  transaction,
                  matched,
                }) =>
                  !matched &&
                  transactionMatchesCommitment(
                    transaction,
                    recurringExpense,
                    occurrenceDate,
                    amountMinor,
                    currency
                  )
              );

          if (matchingIndex >= 0) {
            matchableTransactions[
              matchingIndex
            ].matched = true;

            recordedMatchCount += 1;
            signal.recordedMatchCount +=
              1;

            return;
          }

          unmatchedMinor +=
            amountMinor;

          signal.unmatchedMinor +=
            amountMinor;
        }
      );

      if (
        signal.occurrenceCount > 0
      ) {
        signals.set(
          signalKey,
          signal
        );
      }
    }
  );

  return {
    projectedMinor,
    unmatchedMinor,
    occurrenceCount,
    recordedMatchCount,
    signals:
      Array.from(
        signals.values()
      ).sort(
        (left, right) =>
          right.projectedMinor -
            left.projectedMinor ||
          left.categoryName.localeCompare(
            right.categoryName
          ) ||
          left.frequency.localeCompare(
            right.frequency
          )
      ),
  };
};

export const calculateAvailableAfterCommitments = (
  recordedFinancials:
    PlanEvidenceRecordedFinancials,
  recurringEvidence:
    PlanEvidenceRecurringResult
) =>
  recordedFinancials
    .recordedIncomeMinor -
  recordedFinancials
    .recordedExpensesMinor -
  recurringEvidence.unmatchedMinor;

const canonicalAreaLabel = (
  value: string | undefined
) => {
  const normalized =
    value
      ?.trim()
      .replace(/\s+/g, ' ');

  if (!normalized) {
    return null;
  }

  return normalized
    .split(' ')
    .map((word) =>
      word.length === 0
        ? word
        : `${word
            .slice(0, 1)
            .toLocaleUpperCase(
              'en-US'
            )}${word
            .slice(1)
            .toLocaleLowerCase(
              'en-US'
            )}`
    )
    .join(' ');
};

export const calculateLocationEvidence = (
  transactions: Transaction[],
  period: PlanEvidencePeriod,
  currency: string
): PlanEvidenceLocationResult => {
  const groupedAreas =
    new Map<
      string,
      {
        areaLabel: string;
        transactionCount: number;
        totalSpendMinor: number;
      }
    >();

  let eligibleTransactionCount = 0;

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
    .forEach((transaction) => {
      const areaLabel =
        canonicalAreaLabel(
          transaction.location
            .neighborhood
        );

      if (!areaLabel) {
        return;
      }

      eligibleTransactionCount += 1;

      const areaKey =
        normalizeMatchValue(
          areaLabel
        );

      const existing =
        groupedAreas.get(areaKey);

      groupedAreas.set(
        areaKey,
        {
          areaLabel:
            existing?.areaLabel ||
            areaLabel,
          transactionCount:
            (
              existing
                ?.transactionCount || 0
            ) + 1,
          totalSpendMinor:
            (
              existing
                ?.totalSpendMinor || 0
            ) +
            toNonNegativeMinorUnits(
              transaction.amount,
              currency,
              'Transaction amount'
            ),
        }
      );
    });

  return {
    eligibleTransactionCount,
    signals:
      Array.from(
        groupedAreas.values()
      )
        .filter(
          (area) =>
            area.transactionCount >= 3
        )
        .sort(
          (left, right) =>
            right.totalSpendMinor -
              left.totalSpendMinor ||
            left.areaLabel.localeCompare(
              right.areaLabel
            )
        ),
  };
};

export const finalizeEvidenceCoverage = (
  coverage: PlanEvidenceCoverage,
  recurringOccurrenceCount: number,
  locationSignalCount: number
): PlanEvidenceCoverage => {
  const warnings =
    coverage.warnings.slice();

  const warningCodes =
    new Set(
      warnings.map(
        (warning) =>
          warning.code
      )
    );

  if (
    recurringOccurrenceCount === 0 &&
    !warningCodes.has(
      'NO_RECURRING_COMMITMENTS'
    )
  ) {
    warnings.push({
      code:
        'NO_RECURRING_COMMITMENTS',
      message:
        'No recurring commitments are due in this evidence period.',
    });
  }

  if (
    locationSignalCount === 0 &&
    !warningCodes.has(
      'LOCATION_COVERAGE_UNAVAILABLE'
    )
  ) {
    warnings.push({
      code:
        'LOCATION_COVERAGE_UNAVAILABLE',
      message:
        'No coarse location area meets the minimum evidence threshold.',
    });
  }

  return {
    ...coverage,
    status:
      coverage.status ===
      'insufficient'
        ? 'insufficient'
        : warnings.length > 0
          ? 'partial'
          : 'complete',
    warnings,
  };
};


const stableSerialize = (
  value: unknown
): string => {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `[${value
      .map(stableSerialize)
      .join(',')}]`;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(
        'Revision values must be finite'
      );
    }

    return JSON.stringify(value);
  }

  if (typeof value === 'object') {
    const record =
      value as Record<
        string,
        unknown
      >;

    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(
            key
          )}:${stableSerialize(
            record[key]
          )}`
      )
      .join(',')}}`;
  }

  throw new Error(
    'Unsupported revision value'
  );
};

const revisionHash32 = (
  value: string,
  seed: number
) => {
  let hash = seed >>> 0;

  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    hash ^=
      value.charCodeAt(index);

    hash =
      Math.imul(
        hash,
        0x01000193
      ) >>> 0;
  }

  return hash
    .toString(16)
    .padStart(8, '0');
};

const deterministicRevision = (
  payload: unknown
) => {
  const serialized =
    stableSerialize(payload);

  const seeds = [
    0x811c9dc5,
    0x9e3779b9,
    0x85ebca6b,
    0xc2b2ae35,
  ];

  return `pe1-${seeds
    .map((seed) =>
      revisionHash32(
        serialized,
        seed
      )
    )
    .join('')}`;
};

const createEvidenceRevision = (
  snapshot:
    Omit<
      PlanEvidenceSnapshot,
      'baselineRevision'
    >
) =>
  deterministicRevision(snapshot);

export const buildPlanEvidenceSnapshot = (
  input: PlanEvidenceInput
): PlanEvidenceSnapshot => {
  const currency =
    normalizeCurrency(
      input.user.currency
    );

  const period =
    resolvePlanEvidencePeriod(
      input.horizon
    );

  const recordedFinancials =
    calculateRecordedFinancials(
      input.transactions,
      period,
      currency
    );

  const expectedIncome =
    resolveExpectedIncome(
      input.horizon,
      period,
      input.user.monthlyIncome,
      currency
    );

  const budgetContext =
    resolveBudgetContext(
      input.horizon,
      period,
      input.budgets,
      input.categories,
      currency
    );

  const categories =
    calculateCategorySignals(
      input.transactions,
      input.categories,
      period,
      currency,
      budgetContext
    );

  const savings =
    calculateSavingsProgressEvidence(
      input.savingsGoals,
      currency
    );

  const recurringEvidence =
    calculateRecurringEvidence(
      input.recurringExpenses,
      input.transactions,
      period,
      currency
    );

  const locations =
    calculateLocationEvidence(
      input.transactions,
      period,
      currency
    );

  const baseCoverage =
    buildBaseEvidenceCoverage({
      transactionCount:
        recordedFinancials
          .transactionCount,
      incomeTransactionCount:
        recordedFinancials
          .incomeTransactionCount,
      expenseTransactionCount:
        recordedFinancials
          .expenseTransactionCount,
      locationEligibleTransactionCount:
        locations
          .eligibleTransactionCount,
      expectedIncome,
      budgetAvailable:
        budgetContext.totalMinor !==
        null,
      savingsGoalCount:
        savings.goalCount,
    });

  const coverage =
    finalizeEvidenceCoverage(
      baseCoverage,
      recurringEvidence
        .occurrenceCount,
      locations.signals.length
    );

  const snapshot:
    Omit<
      PlanEvidenceSnapshot,
      'baselineRevision'
    > = {
    schemaVersion: 1,
    period,
    currency,
    currencyFractionDigits:
      currencyFractionDigits(
        currency
      ),
    totals: {
      recordedIncomeMinor:
        recordedFinancials
          .recordedIncomeMinor,
      expectedIncome,
      recordedExpensesMinor:
        recordedFinancials
          .recordedExpensesMinor,
      netCashFlowMinor:
        recordedFinancials
          .netCashFlowMinor,
      projectedRecurringCommitmentsMinor:
        recurringEvidence
          .projectedMinor,
      unmatchedRecurringCommitmentsMinor:
        recurringEvidence
          .unmatchedMinor,
      availableAfterCommitmentsMinor:
        calculateAvailableAfterCommitments(
          recordedFinancials,
          recurringEvidence
        ),
      budgetTotalMinor:
        budgetContext.totalMinor,
      horizonBudgetSpendMinor:
        recordedFinancials
          .horizonBudgetSpendMinor,
    },
    categories,
    recurring:
      recurringEvidence.signals,
    savings,
    locations:
      locations.signals,
    coverage,
  };

  return {
    schemaVersion:
      snapshot.schemaVersion,
    baselineRevision:
      createEvidenceRevision(
        snapshot
      ),
    period: snapshot.period,
    currency: snapshot.currency,
    currencyFractionDigits:
      snapshot.currencyFractionDigits,
    totals: snapshot.totals,
    categories:
      snapshot.categories,
    recurring:
      snapshot.recurring,
    savings: snapshot.savings,
    locations:
      snapshot.locations,
    coverage: snapshot.coverage,
  };
};

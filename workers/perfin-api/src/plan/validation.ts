import type {
  PlanGatewayAction,
} from './contracts';

type JsonRecord =
  Record<string, unknown>;

export class PlanRequestValidationError
  extends Error {}

export type PlanEvidenceHorizonKind =
  | '7_days'
  | '14_days'
  | 'current_month'
  | 'calendar_month';

export type PlanEvidenceWarningCode =
  | 'EXPECTED_INCOME_UNAVAILABLE_SHORT_HORIZON'
  | 'HISTORICAL_INCOME_BASELINE_UNAVAILABLE'
  | 'NO_RECORDED_TRANSACTIONS'
  | 'NO_BUDGET'
  | 'NO_SAVINGS_GOALS'
  | 'NO_RECURRING_COMMITMENTS'
  | 'LOCATION_COVERAGE_UNAVAILABLE'
  | 'PARTIAL_PERIOD_COVERAGE';

export interface PlanEvidenceContract {
  readonly schemaVersion: 1;

  readonly baselineRevision:
    string;

  readonly period: {
    readonly kind:
      PlanEvidenceHorizonKind;

    readonly startDate:
      string;

    readonly endDate:
      string;

    readonly monthKey:
      string | null;

    readonly dayCount:
      number;

    readonly isCompleteCalendarMonth:
      boolean;
  };

  readonly currency:
    string;

  readonly currencyFractionDigits:
    number;

  readonly totals: {
    readonly recordedIncomeMinor:
      number;

    readonly expectedIncome: {
      readonly amountMinor:
        number | null;

      readonly basis:
        | 'profile_monthly_income'
        | 'unavailable_short_horizon'
        | 'unavailable_historical';
    };

    readonly recordedExpensesMinor:
      number;

    readonly netCashFlowMinor:
      number;

    readonly projectedRecurringCommitmentsMinor:
      number;

    readonly unmatchedRecurringCommitmentsMinor:
      number;

    readonly availableAfterCommitmentsMinor:
      number;

    readonly budgetTotalMinor:
      number | null;

    readonly horizonBudgetSpendMinor:
      number;
  };

  readonly categories:
    Array<{
      readonly categoryId:
        string;

      readonly categoryName:
        string;

      readonly transactionCount:
        number;

      readonly spendMinor:
        number;

      readonly budgetMinor:
        number | null;

      readonly remainingMinor:
        number | null;
    }>;

  readonly recurring:
    Array<{
      readonly categoryName:
        string;

      readonly frequency:
        | 'weekly'
        | 'biweekly'
        | 'monthly'
        | 'quarterly'
        | 'annual';

      readonly occurrenceCount:
        number;

      readonly recordedMatchCount:
        number;

      readonly projectedMinor:
        number;

      readonly unmatchedMinor:
        number;
    }>;

  readonly savings: {
    readonly goalCount:
      number;

    readonly targetMinor:
      number;

    readonly savedMinor:
      number;

    readonly remainingMinor:
      number;

    readonly completionPercent:
      number;
  };

  readonly locations:
    Array<{
      readonly areaLabel:
        string;

      readonly transactionCount:
        number;

      readonly totalSpendMinor:
        number;
    }>;

  readonly coverage: {
    readonly status:
      | 'complete'
      | 'partial'
      | 'insufficient';

    readonly transactionCount:
      number;

    readonly incomeTransactionCount:
      number;

    readonly expenseTransactionCount:
      number;

    readonly locationEligibleTransactionCount:
      number;

    readonly warnings:
      Array<{
        readonly code:
          PlanEvidenceWarningCode;

        readonly message:
          string;
      }>;
  };
}

export interface PlanSessionRequest {
  readonly schemaVersion: 1;

  readonly evidence:
    PlanEvidenceContract;
}

export interface PlanTurnRequest {
  readonly schemaVersion: 1;

  readonly sessionId:
    string;

  readonly baselineRevision:
    string;

  readonly message:
    string;

  readonly evidence:
    PlanEvidenceContract;
}

export interface PlanGenerateRequest {
  readonly schemaVersion: 1;

  readonly sessionId:
    string;

  readonly baselineRevision:
    string;

  readonly evidence:
    PlanEvidenceContract;
}

export interface PlanReviseRequest {
  readonly schemaVersion: 1;

  readonly sessionId:
    string;

  readonly baselineRevision:
    string;

  readonly instruction:
    string;

  readonly evidence:
    PlanEvidenceContract;
}

export type PlanActionRequest =
  | PlanSessionRequest
  | PlanTurnRequest
  | PlanGenerateRequest
  | PlanReviseRequest;

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

const MONTH_KEY_PATTERN =
  /^\d{4}-\d{2}$/;

const REVISION_PATTERN =
  /^pe1-[0-9a-f]{32}$/;

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const WARNING_MESSAGES:
  Record<
    PlanEvidenceWarningCode,
    string
  > = {
    EXPECTED_INCOME_UNAVAILABLE_SHORT_HORIZON:
      'Expected income is unavailable for short planning horizons.',

    HISTORICAL_INCOME_BASELINE_UNAVAILABLE:
      'A historical expected-income baseline is unavailable for this month.',

    NO_RECORDED_TRANSACTIONS:
      'No recorded transactions are available for this evidence period.',

    NO_BUDGET:
      'No budget baseline is available for this evidence period.',

    NO_SAVINGS_GOALS:
      'No savings goals are available for planning evidence.',

    NO_RECURRING_COMMITMENTS:
      'No recurring commitments are due in this evidence period.',

    LOCATION_COVERAGE_UNAVAILABLE:
      'No coarse location area meets the minimum evidence threshold.',

    PARTIAL_PERIOD_COVERAGE:
      'This evidence period contains partial calendar-month coverage.',
  };

const PROHIBITED_EVIDENCE_KEYS =
  new Set([
    'userid',
    'uid',
    'user',
    'email',
    'phone',
    'name',
    'merchant',
    'paymentmethod',
    'notes',
    'receipts',
    'latitude',
    'longitude',
    'formattedaddress',
    'address',
    'placeid',
    'transactionid',
    'transactions',
    'rawtransactions',
    'goalname',
    'prompt',
    'token',
    'authorization',
  ]);

const invalid = (
  path: string,
  reason: string
): never => {
  throw new PlanRequestValidationError(
    `${path}: ${reason}`
  );
};

const expectRecord = (
  value: unknown,
  path: string
): JsonRecord => {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    invalid(
      path,
      'must be an object'
    );
  }

  return value as JsonRecord;
};

const expectArray = (
  value: unknown,
  path: string,
  maximumLength: number
): unknown[] => {
  if (!Array.isArray(value)) {
    invalid(
      path,
      'must be an array'
    );
  }

  const arrayValue =
    value as unknown[];

  if (
    arrayValue.length >
    maximumLength
  ) {
    invalid(
      path,
      `must contain at most ${maximumLength} items`
    );
  }

  return arrayValue;
};


const assertExactKeys = (
  record: JsonRecord,
  allowedKeys:
    readonly string[],
  path: string
) => {
  const allowed =
    new Set(allowedKeys);

  Object.keys(record)
    .forEach((key) => {
      if (!allowed.has(key)) {
        invalid(
          `${path}.${key}`,
          'is not allowed'
        );
      }
    });

  allowedKeys.forEach(
    (key) => {
      if (!(key in record)) {
        invalid(
          `${path}.${key}`,
          'is required'
        );
      }
    }
  );
};

const expectString = (
  value: unknown,
  path: string,
  minimumLength: number,
  maximumLength: number,
  pattern?: RegExp,
  trimOutput = false
): string => {
  if (
    typeof value !== 'string'
  ) {
    invalid(
      path,
      'must be a string'
    );
  }

  const stringValue =
    value as string;

  const normalized =
    stringValue.trim();

  if (
    normalized.length <
      minimumLength ||
    normalized.length >
      maximumLength
  ) {
    invalid(
      path,
      `must contain ${minimumLength}-${maximumLength} characters`
    );
  }

  if (
    pattern &&
    !pattern.test(
      stringValue
    )
  ) {
    invalid(
      path,
      'has an invalid format'
    );
  }

  return trimOutput
    ? normalized
    : stringValue;
};


const expectBoolean = (
  value: unknown,
  path: string
): boolean => {
  if (
    typeof value !== 'boolean'
  ) {
    invalid(
      path,
      'must be a boolean'
    );
  }

  return value as boolean;
};


const expectFiniteNumber = (
  value: unknown,
  path: string,
  minimum:
    number | null = null,
  maximum:
    number | null = null
): number => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    invalid(
      path,
      'must be a finite number'
    );
  }

  const numberValue =
    value as number;

  if (
    minimum !== null &&
    numberValue < minimum
  ) {
    invalid(
      path,
      `must be at least ${minimum}`
    );
  }

  if (
    maximum !== null &&
    numberValue > maximum
  ) {
    invalid(
      path,
      `must be at most ${maximum}`
    );
  }

  return numberValue;
};


const expectSafeInteger = (
  value: unknown,
  path: string,
  minimum:
    number | null = null,
  maximum:
    number | null = null
): number => {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value)
  ) {
    invalid(
      path,
      'must be a safe integer'
    );
  }

  const numberValue =
    value as number;

  if (
    minimum !== null &&
    numberValue < minimum
  ) {
    invalid(
      path,
      `must be at least ${minimum}`
    );
  }

  if (
    maximum !== null &&
    numberValue > maximum
  ) {
    invalid(
      path,
      `must be at most ${maximum}`
    );
  }

  return numberValue;
};


const expectNullableSafeInteger =
  (
    value: unknown,
    path: string,
    minimum:
      number | null = null
  ): number | null => {
    if (value === null) {
      return null;
    }

    return expectSafeInteger(
      value,
      path,
      minimum
    );
  };

const expectEnum = <
  Value extends string,
>(
  value: unknown,
  values:
    readonly Value[],
  path: string
): Value => {
  if (
    typeof value !== 'string' ||
    !values.includes(
      value as Value
    )
  ) {
    invalid(
      path,
      'contains an unsupported value'
    );
  }

  return value as Value;
};

const assertNoProhibitedEvidenceKeys =
  (
    value: unknown,
    path = 'evidence',
    depth = 0
  ) => {
    if (depth > 16) {
      invalid(
        path,
        'exceeds the maximum nesting depth'
      );
    }

    if (
      value === null ||
      typeof value !== 'object'
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(
        (item, index) => {
          assertNoProhibitedEvidenceKeys(
            item,
            `${path}[${index}]`,
            depth + 1
          );
        }
      );

      return;
    }

    Object.entries(
      value as JsonRecord
    ).forEach(
      ([key, nested]) => {
        if (
          PROHIBITED_EVIDENCE_KEYS.has(
            key
              .replace(
                /[^A-Za-z0-9]/g,
                ''
              )
              .toLowerCase()
          )
        ) {
          invalid(
            `${path}.${key}`,
            'is prohibited'
          );
        }

        assertNoProhibitedEvidenceKeys(
          nested,
          `${path}.${key}`,
          depth + 1
        );
      }
    );
  };

const validatePeriod = (
  value: unknown
): PlanEvidenceContract[
  'period'
] => {
  const record =
    expectRecord(
      value,
      'evidence.period'
    );

  assertExactKeys(
    record,
    [
      'kind',
      'startDate',
      'endDate',
      'monthKey',
      'dayCount',
      'isCompleteCalendarMonth',
    ],
    'evidence.period'
  );

  const monthKey =
    record.monthKey === null
      ? null
      : expectString(
          record.monthKey,
          'evidence.period.monthKey',
          7,
          7,
          MONTH_KEY_PATTERN
        );

  return {
    kind:
      expectEnum(
        record.kind,
        [
          '7_days',
          '14_days',
          'current_month',
          'calendar_month',
        ] as const,
        'evidence.period.kind'
      ),

    startDate:
      expectString(
        record.startDate,
        'evidence.period.startDate',
        10,
        10,
        ISO_DATE_PATTERN
      ),

    endDate:
      expectString(
        record.endDate,
        'evidence.period.endDate',
        10,
        10,
        ISO_DATE_PATTERN
      ),

    monthKey,

    dayCount:
      expectSafeInteger(
        record.dayCount,
        'evidence.period.dayCount',
        1,
        366
      ),

    isCompleteCalendarMonth:
      expectBoolean(
        record
          .isCompleteCalendarMonth,
        'evidence.period.isCompleteCalendarMonth'
      ),
  };
};

const validateExpectedIncome = (
  value: unknown
): PlanEvidenceContract[
  'totals'
]['expectedIncome'] => {
  const record =
    expectRecord(
      value,
      'evidence.totals.expectedIncome'
    );

  assertExactKeys(
    record,
    [
      'amountMinor',
      'basis',
    ],
    'evidence.totals.expectedIncome'
  );

  return {
    amountMinor:
      expectNullableSafeInteger(
        record.amountMinor,
        'evidence.totals.expectedIncome.amountMinor',
        0
      ),

    basis:
      expectEnum(
        record.basis,
        [
          'profile_monthly_income',
          'unavailable_short_horizon',
          'unavailable_historical',
        ] as const,
        'evidence.totals.expectedIncome.basis'
      ),
  };
};

const validateTotals = (
  value: unknown
): PlanEvidenceContract[
  'totals'
] => {
  const record =
    expectRecord(
      value,
      'evidence.totals'
    );

  assertExactKeys(
    record,
    [
      'recordedIncomeMinor',
      'expectedIncome',
      'recordedExpensesMinor',
      'netCashFlowMinor',
      'projectedRecurringCommitmentsMinor',
      'unmatchedRecurringCommitmentsMinor',
      'availableAfterCommitmentsMinor',
      'budgetTotalMinor',
      'horizonBudgetSpendMinor',
    ],
    'evidence.totals'
  );

  return {
    recordedIncomeMinor:
      expectSafeInteger(
        record
          .recordedIncomeMinor,
        'evidence.totals.recordedIncomeMinor',
        0
      ),

    expectedIncome:
      validateExpectedIncome(
        record.expectedIncome
      ),

    recordedExpensesMinor:
      expectSafeInteger(
        record
          .recordedExpensesMinor,
        'evidence.totals.recordedExpensesMinor',
        0
      ),

    netCashFlowMinor:
      expectSafeInteger(
        record.netCashFlowMinor,
        'evidence.totals.netCashFlowMinor'
      ),

    projectedRecurringCommitmentsMinor:
      expectSafeInteger(
        record
          .projectedRecurringCommitmentsMinor,
        'evidence.totals.projectedRecurringCommitmentsMinor',
        0
      ),

    unmatchedRecurringCommitmentsMinor:
      expectSafeInteger(
        record
          .unmatchedRecurringCommitmentsMinor,
        'evidence.totals.unmatchedRecurringCommitmentsMinor',
        0
      ),

    availableAfterCommitmentsMinor:
      expectSafeInteger(
        record
          .availableAfterCommitmentsMinor,
        'evidence.totals.availableAfterCommitmentsMinor'
      ),

    budgetTotalMinor:
      expectNullableSafeInteger(
        record.budgetTotalMinor,
        'evidence.totals.budgetTotalMinor',
        0
      ),

    horizonBudgetSpendMinor:
      expectSafeInteger(
        record
          .horizonBudgetSpendMinor,
        'evidence.totals.horizonBudgetSpendMinor',
        0
      ),
  };
};

const validateCategory = (
  value: unknown,
  index: number
): PlanEvidenceContract[
  'categories'
][number] => {
  const path =
    `evidence.categories[${index}]`;

  const record =
    expectRecord(
      value,
      path
    );

  assertExactKeys(
    record,
    [
      'categoryId',
      'categoryName',
      'transactionCount',
      'spendMinor',
      'budgetMinor',
      'remainingMinor',
    ],
    path
  );

  return {
    categoryId:
      expectString(
        record.categoryId,
        `${path}.categoryId`,
        1,
        128
      ),

    categoryName:
      expectString(
        record.categoryName,
        `${path}.categoryName`,
        1,
        120
      ),

    transactionCount:
      expectSafeInteger(
        record.transactionCount,
        `${path}.transactionCount`,
        0
      ),

    spendMinor:
      expectSafeInteger(
        record.spendMinor,
        `${path}.spendMinor`,
        0
      ),

    budgetMinor:
      expectNullableSafeInteger(
        record.budgetMinor,
        `${path}.budgetMinor`,
        0
      ),

    remainingMinor:
      expectNullableSafeInteger(
        record.remainingMinor,
        `${path}.remainingMinor`
      ),
  };
};

const validateRecurring = (
  value: unknown,
  index: number
): PlanEvidenceContract[
  'recurring'
][number] => {
  const path =
    `evidence.recurring[${index}]`;

  const record =
    expectRecord(
      value,
      path
    );

  assertExactKeys(
    record,
    [
      'categoryName',
      'frequency',
      'occurrenceCount',
      'recordedMatchCount',
      'projectedMinor',
      'unmatchedMinor',
    ],
    path
  );

  const occurrenceCount =
    expectSafeInteger(
      record.occurrenceCount,
      `${path}.occurrenceCount`,
      0
    );

  const recordedMatchCount =
    expectSafeInteger(
      record.recordedMatchCount,
      `${path}.recordedMatchCount`,
      0
    );

  if (
    recordedMatchCount >
    occurrenceCount
  ) {
    invalid(
      `${path}.recordedMatchCount`,
      'cannot exceed occurrenceCount'
    );
  }

  return {
    categoryName:
      expectString(
        record.categoryName,
        `${path}.categoryName`,
        1,
        120
      ),

    frequency:
      expectEnum(
        record.frequency,
        [
          'weekly',
          'biweekly',
          'monthly',
          'quarterly',
          'annual',
        ] as const,
        `${path}.frequency`
      ),

    occurrenceCount,
    recordedMatchCount,

    projectedMinor:
      expectSafeInteger(
        record.projectedMinor,
        `${path}.projectedMinor`,
        0
      ),

    unmatchedMinor:
      expectSafeInteger(
        record.unmatchedMinor,
        `${path}.unmatchedMinor`,
        0
      ),
  };
};

const validateSavings = (
  value: unknown
): PlanEvidenceContract[
  'savings'
] => {
  const record =
    expectRecord(
      value,
      'evidence.savings'
    );

  assertExactKeys(
    record,
    [
      'goalCount',
      'targetMinor',
      'savedMinor',
      'remainingMinor',
      'completionPercent',
    ],
    'evidence.savings'
  );

  return {
    goalCount:
      expectSafeInteger(
        record.goalCount,
        'evidence.savings.goalCount',
        0
      ),

    targetMinor:
      expectSafeInteger(
        record.targetMinor,
        'evidence.savings.targetMinor',
        0
      ),

    savedMinor:
      expectSafeInteger(
        record.savedMinor,
        'evidence.savings.savedMinor',
        0
      ),

    remainingMinor:
      expectSafeInteger(
        record.remainingMinor,
        'evidence.savings.remainingMinor',
        0
      ),

    completionPercent:
      expectFiniteNumber(
        record.completionPercent,
        'evidence.savings.completionPercent',
        0,
        100
      ),
  };
};

const validateLocation = (
  value: unknown,
  index: number
): PlanEvidenceContract[
  'locations'
][number] => {
  const path =
    `evidence.locations[${index}]`;

  const record =
    expectRecord(
      value,
      path
    );

  assertExactKeys(
    record,
    [
      'areaLabel',
      'transactionCount',
      'totalSpendMinor',
    ],
    path
  );

  const transactionCount =
    expectSafeInteger(
      record.transactionCount,
      `${path}.transactionCount`,
      3
    );

  return {
    areaLabel:
      expectString(
        record.areaLabel,
        `${path}.areaLabel`,
        1,
        120
      ),

    transactionCount,

    totalSpendMinor:
      expectSafeInteger(
        record.totalSpendMinor,
        `${path}.totalSpendMinor`,
        0
      ),
  };
};

const validateWarning = (
  value: unknown,
  index: number
): PlanEvidenceContract[
  'coverage'
]['warnings'][number] => {
  const path =
    `evidence.coverage.warnings[${index}]`;

  const record =
    expectRecord(
      value,
      path
    );

  assertExactKeys(
    record,
    [
      'code',
      'message',
    ],
    path
  );

  const code =
    expectEnum(
      record.code,
      Object.keys(
        WARNING_MESSAGES
      ) as PlanEvidenceWarningCode[],
      `${path}.code`
    );

  const message =
    expectString(
      record.message,
      `${path}.message`,
      1,
      240
    );

  if (
    message !==
    WARNING_MESSAGES[code]
  ) {
    invalid(
      `${path}.message`,
      'does not match the warning code'
    );
  }

  return {
    code,
    message,
  };
};

const validateCoverage = (
  value: unknown
): PlanEvidenceContract[
  'coverage'
] => {
  const record =
    expectRecord(
      value,
      'evidence.coverage'
    );

  assertExactKeys(
    record,
    [
      'status',
      'transactionCount',
      'incomeTransactionCount',
      'expenseTransactionCount',
      'locationEligibleTransactionCount',
      'warnings',
    ],
    'evidence.coverage'
  );

  return {
    status:
      expectEnum(
        record.status,
        [
          'complete',
          'partial',
          'insufficient',
        ] as const,
        'evidence.coverage.status'
      ),

    transactionCount:
      expectSafeInteger(
        record.transactionCount,
        'evidence.coverage.transactionCount',
        0
      ),

    incomeTransactionCount:
      expectSafeInteger(
        record.incomeTransactionCount,
        'evidence.coverage.incomeTransactionCount',
        0
      ),

    expenseTransactionCount:
      expectSafeInteger(
        record.expenseTransactionCount,
        'evidence.coverage.expenseTransactionCount',
        0
      ),

    locationEligibleTransactionCount:
      expectSafeInteger(
        record
          .locationEligibleTransactionCount,
        'evidence.coverage.locationEligibleTransactionCount',
        0
      ),

    warnings:
      expectArray(
        record.warnings,
        'evidence.coverage.warnings',
        20
      ).map(
        validateWarning
      ),
  };
};

export const validatePlanEvidence = (
  value: unknown
): PlanEvidenceContract => {
  assertNoProhibitedEvidenceKeys(
    value
  );

  const record =
    expectRecord(
      value,
      'evidence'
    );

  assertExactKeys(
    record,
    [
      'schemaVersion',
      'baselineRevision',
      'period',
      'currency',
      'currencyFractionDigits',
      'totals',
      'categories',
      'recurring',
      'savings',
      'locations',
      'coverage',
    ],
    'evidence'
  );

  if (
    record.schemaVersion !== 1
  ) {
    invalid(
      'evidence.schemaVersion',
      'must equal 1'
    );
  }

  return {
    schemaVersion: 1,

    baselineRevision:
      expectString(
        record.baselineRevision,
        'evidence.baselineRevision',
        36,
        36,
        REVISION_PATTERN
      ),

    period:
      validatePeriod(
        record.period
      ),

    currency:
      expectString(
        record.currency,
        'evidence.currency',
        3,
        3,
        /^[A-Z]{3}$/
      ),

    currencyFractionDigits:
      expectSafeInteger(
        record
          .currencyFractionDigits,
        'evidence.currencyFractionDigits',
        0,
        3
      ),

    totals:
      validateTotals(
        record.totals
      ),

    categories:
      expectArray(
        record.categories,
        'evidence.categories',
        200
      ).map(
        validateCategory
      ),

    recurring:
      expectArray(
        record.recurring,
        'evidence.recurring',
        200
      ).map(
        validateRecurring
      ),

    savings:
      validateSavings(
        record.savings
      ),

    locations:
      expectArray(
        record.locations,
        'evidence.locations',
        100
      ).map(
        validateLocation
      ),

    coverage:
      validateCoverage(
        record.coverage
      ),
  };
};

const validateSchemaVersion = (
  record: JsonRecord
) => {
  if (
    record.schemaVersion !== 1
  ) {
    invalid(
      'request.schemaVersion',
      'must equal 1'
    );
  }
};

const validateSessionId = (
  value: unknown
) =>
  expectString(
    value,
    'request.sessionId',
    36,
    36,
    SESSION_ID_PATTERN
  );

const validateRevision = (
  value: unknown,
  path:
    string = 'request.baselineRevision'
) =>
  expectString(
    value,
    path,
    36,
    36,
    REVISION_PATTERN
  );

const assertRevisionMatches = (
  revision: string,
  evidence:
    PlanEvidenceContract
) => {
  if (
    revision !==
    evidence.baselineRevision
  ) {
    invalid(
      'request.baselineRevision',
      'must match evidence.baselineRevision'
    );
  }
};

export const validatePlanActionRequest =
  (
    action:
      PlanGatewayAction,
    value: unknown
  ): PlanActionRequest => {
    const record =
      expectRecord(
        value,
        'request'
      );

    validateSchemaVersion(
      record
    );

    if (action === 'session') {
      assertExactKeys(
        record,
        [
          'schemaVersion',
          'evidence',
        ],
        'request'
      );

      return {
        schemaVersion: 1,
        evidence:
          validatePlanEvidence(
            record.evidence
          ),
      };
    }

    if (action === 'turn') {
      assertExactKeys(
        record,
        [
          'schemaVersion',
          'sessionId',
          'baselineRevision',
          'message',
          'evidence',
        ],
        'request'
      );

      const evidence =
        validatePlanEvidence(
          record.evidence
        );

      const baselineRevision =
        validateRevision(
          record.baselineRevision
        );

      assertRevisionMatches(
        baselineRevision,
        evidence
      );

      return {
        schemaVersion: 1,

        sessionId:
          validateSessionId(
            record.sessionId
          ),

        baselineRevision,

        message:
          expectString(
            record.message,
            'request.message',
            1,
            2_000,
            undefined,
            true
          ),

        evidence,
      };
    }

    if (action === 'generate') {
      assertExactKeys(
        record,
        [
          'schemaVersion',
          'sessionId',
          'baselineRevision',
          'evidence',
        ],
        'request'
      );

      const evidence =
        validatePlanEvidence(
          record.evidence
        );

      const baselineRevision =
        validateRevision(
          record.baselineRevision
        );

      assertRevisionMatches(
        baselineRevision,
        evidence
      );

      return {
        schemaVersion: 1,

        sessionId:
          validateSessionId(
            record.sessionId
          ),

        baselineRevision,
        evidence,
      };
    }

    assertExactKeys(
      record,
      [
        'schemaVersion',
        'sessionId',
        'baselineRevision',
        'instruction',
        'evidence',
      ],
      'request'
    );

    const evidence =
      validatePlanEvidence(
        record.evidence
      );

    const baselineRevision =
      validateRevision(
        record.baselineRevision
      );

    assertRevisionMatches(
      baselineRevision,
      evidence
    );

    return {
      schemaVersion: 1,

      sessionId:
        validateSessionId(
          record.sessionId
        ),

      baselineRevision,

      instruction:
        expectString(
          record.instruction,
          'request.instruction',
          1,
          2_000,
          undefined,
          true
        ),

      evidence,
    };
  };

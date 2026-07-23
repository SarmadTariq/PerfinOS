import {
  PLAN_OUTPUT_SCHEMA_VERSION,
  PLAN_PROMPT_VERSION,
  PLAN_RESPONSE_SCHEMA_VERSION,
  type PlanGenerationMetadata,
  type PlanStructuredActionProposal,
  type PlanStructuredAllocation,
  type PlanStructuredCommitment,
  type PlanStructuredObservation,
  type PlanStructuredOutput,
  type PlanStructuredRecommendation,
  type PlanStructuredWarning,
  type ValidatedPlanProviderResult,
} from './outputContracts';

import type {
  PlanProviderAction,
  PlanProviderRequest,
  PlanProviderResult,
} from './provider';

import type {
  PlanEvidenceContract,
} from './validation';

import {
  detectSensitiveText,
} from './privacy';

type JsonRecord =
  Record<string, unknown>;

export type PlanOutputValidationErrorCode =
  | 'OUTPUT_STRUCTURE_INVALID'
  | 'OUTPUT_METADATA_INVALID'
  | 'STALE_EVIDENCE'
  | 'EVIDENCE_REFERENCE_INVALID'
  | 'ARITHMETIC_BOUND_INVALID'
  | 'OUTPUT_CONTENT_PROHIBITED'
  | 'ACTION_PROPOSAL_INVALID';

export class PlanOutputValidationError
  extends Error {
  constructor(
    readonly code:
      PlanOutputValidationErrorCode,
    readonly path:
      string
  ) {
    super(code);
  }
}

export interface PlanOutputValidationInput {
  readonly action:
    PlanProviderAction;

  readonly request:
    PlanProviderRequest[
      'request'
    ];

  readonly result:
    PlanProviderResult;
}

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

const LOCAL_ID_PATTERN =
  /^[A-Za-z][A-Za-z0-9_-]{2,63}$/;

const MODEL_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]{1,100}$/;

const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const PROHIBITED_OUTPUT_PATTERNS = [
  /\bignore\s+(?:all|any|the|your)?\s*(?:previous|prior|earlier|system|developer)\s+(?:instructions?|messages?|rules?)\b/i,

  /\b(?:system|developer|hidden|internal)\s+(?:prompt|message|instructions?|configuration)\b/i,

  /\b(?:api\s*key|private\s*key|bearer\s*token|authorization\s*header|firebase\s*token|app\s*check\s*token)\b/i,

  /\b(?:jailbreak|prompt\s*injection|system\s*override)\b/i,

  /\b(?:i|we|perfin(?:\s+os)?)\s+(?:(?:have|has)\s+)?(?:executed|applied|saved|transferred|paid|scheduled|updated|changed|created|deleted)\b/i,

  /\b(?:legal|tax|investment|securities|credit|banking)\s+advice\b/i,

  /\b(?:buy|sell|short|trade)\s+(?:a\s+|the\s+|this\s+)?(?:stock|shares?|crypto|cryptocurrency|bond|security)\b/i,

  /\b(?:guaranteed|risk[- ]free)\s+(?:return|investment|profit)\b/i,

  /\b(?:evade|hide)\s+(?:tax|taxes|income|assets?)\b/i,
] as const;

const invalid = (
  code:
    PlanOutputValidationErrorCode,
  path: string
): never => {
  throw new PlanOutputValidationError(
    code,
    path
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
      'OUTPUT_STRUCTURE_INVALID',
      path
    );
  }

  return value as JsonRecord;
};

const expectArray = (
  value: unknown,
  path: string,
  minimumLength: number,
  maximumLength: number
): unknown[] => {
  if (!Array.isArray(value)) {
    invalid(
      'OUTPUT_STRUCTURE_INVALID',
      path
    );
  }

  const arrayValue =
    value as unknown[];

  if (
    arrayValue.length <
      minimumLength ||
    arrayValue.length >
      maximumLength
  ) {
    invalid(
      'OUTPUT_STRUCTURE_INVALID',
      path
    );
  }

  return arrayValue;
};

const assertExactKeys = (
  record: JsonRecord,
  keys:
    readonly string[],
  path: string
) => {
  const allowed =
    new Set(keys);

  for (
    const key
    of Object.keys(record)
  ) {
    if (!allowed.has(key)) {
      invalid(
        'OUTPUT_STRUCTURE_INVALID',
        `${path}.${key}`
      );
    }
  }

  for (
    const key
    of keys
  ) {
    if (!(key in record)) {
      invalid(
        'OUTPUT_STRUCTURE_INVALID',
        `${path}.${key}`
      );
    }
  }
};

const expectString = (
  value: unknown,
  path: string,
  minimumLength: number,
  maximumLength: number
): string => {
  if (
    typeof value !== 'string'
  ) {
    invalid(
      'OUTPUT_STRUCTURE_INVALID',
      path
    );
  }

  const normalized =
    (
      value as string
    ).trim();

  if (
    normalized.length <
      minimumLength ||
    normalized.length >
      maximumLength ||
    CONTROL_CHARACTER_PATTERN.test(
      normalized
    )
  ) {
    invalid(
      'OUTPUT_STRUCTURE_INVALID',
      path
    );
  }

  return normalized;
};

const expectNullableString = (
  value: unknown,
  path: string,
  maximumLength: number
): string | null => {
  if (value === null) {
    return null;
  }

  return expectString(
    value,
    path,
    1,
    maximumLength
  );
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
      'OUTPUT_STRUCTURE_INVALID',
      path
    );
  }

  const integer =
    value as number;

  if (
    minimum !== null &&
    integer < minimum
  ) {
    invalid(
      'ARITHMETIC_BOUND_INVALID',
      path
    );
  }

  if (
    maximum !== null &&
    integer > maximum
  ) {
    invalid(
      'ARITHMETIC_BOUND_INVALID',
      path
    );
  }

  return integer;
};

const expectNullableSafeInteger =
  (
    value: unknown,
    path: string,
    minimum:
      number | null = null,
    maximum:
      number | null = null
  ): number | null => {
    if (value === null) {
      return null;
    }

    return expectSafeInteger(
      value,
      path,
      minimum,
      maximum
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
      'OUTPUT_STRUCTURE_INVALID',
      path
    );
  }

  return value as Value;
};

const assertSafeOutputText = (
  value: string,
  path: string
) => {
  if (
    PROHIBITED_OUTPUT_PATTERNS
      .some(
        (pattern) =>
          pattern.test(value)
      ) ||
    detectSensitiveText(value) !== null
  ) {
    invalid(
      'OUTPUT_CONTENT_PROHIBITED',
      path
    );
  }
};

const safeText = (
  value: unknown,
  path: string,
  maximumLength: number
): string => {
  const text =
    expectString(
      value,
      path,
      1,
      maximumLength
    );

  assertSafeOutputText(
    text,
    path
  );

  return text;
};

const registerId = (
  value: unknown,
  path: string,
  knownIds:
    Set<string>
): string => {
  const id =
    expectString(
      value,
      path,
      3,
      64
    );

  if (
    !LOCAL_ID_PATTERN.test(id) ||
    knownIds.has(id)
  ) {
    invalid(
      'OUTPUT_STRUCTURE_INVALID',
      path
    );
  }

  knownIds.add(id);

  return id;
};

const buildEvidenceReferenceCatalog =
  (
    evidence:
      PlanEvidenceContract
  ): Set<string> => {
    const references =
      new Set<string>();

    const visit = (
      value: unknown,
      path: string,
      depth: number
    ) => {
      if (depth > 16) {
        return;
      }

      if (
        path ===
          'schemaVersion' ||
        path ===
          'baselineRevision'
      ) {
        return;
      }

      if (
        value === null ||
        typeof value !== 'object'
      ) {
        if (path) {
          references.add(path);
        }

        return;
      }

      if (Array.isArray(value)) {
        value.forEach(
          (item, index) => {
            visit(
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
          visit(
            nested,
            path
              ? `${path}.${key}`
              : key,
            depth + 1
          );
        }
      );
    };

    visit(
      evidence,
      '',
      0
    );

    return references;
  };

const validateEvidenceRefs = (
  value: unknown,
  path: string,
  catalog:
    Set<string>
): readonly string[] => {
  const items =
    expectArray(
      value,
      path,
      1,
      12
    );

  const seen =
    new Set<string>();

  return items.map(
    (item, index) => {
      const ref =
        expectString(
          item,
          `${path}[${index}]`,
          1,
          160
        );

      if (
        seen.has(ref) ||
        !catalog.has(ref)
      ) {
        invalid(
          'EVIDENCE_REFERENCE_INVALID',
          `${path}[${index}]`
        );
      }

      seen.add(ref);

      return ref;
    }
  );
};

const parseIsoDate = (
  value: unknown,
  path: string,
  minimumDate: string,
  maximumDate: string
): string | null => {
  if (value === null) {
    return null;
  }

  const date =
    expectString(
      value,
      path,
      10,
      10
    );

  if (
    !ISO_DATE_PATTERN.test(date)
  ) {
    invalid(
      'OUTPUT_STRUCTURE_INVALID',
      path
    );
  }

  const parsed =
    new Date(
      `${date}T00:00:00.000Z`
    );

  if (
    Number.isNaN(
      parsed.getTime()
    ) ||
    parsed
      .toISOString()
      .slice(0, 10) !==
      date ||
    date < minimumDate ||
    date > maximumDate
  ) {
    invalid(
      'OUTPUT_STRUCTURE_INVALID',
      path
    );
  }

  return date;
};

const addSafe = (
  current: number,
  addition: number,
  path: string
): number => {
  const result =
    current + addition;

  if (
    !Number.isSafeInteger(
      result
    )
  ) {
    invalid(
      'ARITHMETIC_BOUND_INVALID',
      path
    );
  }

  return result;
};

const validateObservation = (
  value: unknown,
  index: number,
  catalog:
    Set<string>,
  knownIds:
    Set<string>
): PlanStructuredObservation => {
  const path =
    `output.observations[${index}]`;

  const record =
    expectRecord(
      value,
      path
    );

  assertExactKeys(
    record,
    [
      'id',
      'statement',
      'evidenceRefs',
    ],
    path
  );

  return {
    id:
      registerId(
        record.id,
        `${path}.id`,
        knownIds
      ),

    statement:
      safeText(
        record.statement,
        `${path}.statement`,
        500
      ),

    evidenceRefs:
      validateEvidenceRefs(
        record.evidenceRefs,
        `${path}.evidenceRefs`,
        catalog
      ),
  };
};

const validateAllocation = (
  value: unknown,
  index: number,
  catalog:
    Set<string>,
  knownIds:
    Set<string>,
  categoryIds:
    Set<string>,
  amountCeiling: number
): PlanStructuredAllocation => {
  const path =
    `output.allocations[${index}]`;

  const record =
    expectRecord(
      value,
      path
    );

  assertExactKeys(
    record,
    [
      'id',
      'label',
      'categoryId',
      'amountMinor',
      'period',
      'evidenceRefs',
    ],
    path
  );

  const categoryId =
    expectNullableString(
      record.categoryId,
      `${path}.categoryId`,
      128
    );

  if (
    categoryId !== null &&
    !categoryIds.has(
      categoryId
    )
  ) {
    invalid(
      'EVIDENCE_REFERENCE_INVALID',
      `${path}.categoryId`
    );
  }

  return {
    id:
      registerId(
        record.id,
        `${path}.id`,
        knownIds
      ),

    label:
      safeText(
        record.label,
        `${path}.label`,
        160
      ),

    categoryId,

    amountMinor:
      expectSafeInteger(
        record.amountMinor,
        `${path}.amountMinor`,
        0,
        amountCeiling
      ),

    period:
      expectEnum(
        record.period,
        [
          'plan',
          'week',
          'month',
        ] as const,
        `${path}.period`
      ),

    evidenceRefs:
      validateEvidenceRefs(
        record.evidenceRefs,
        `${path}.evidenceRefs`,
        catalog
      ),
  };
};

const validateCommitment = (
  value: unknown,
  index: number,
  catalog:
    Set<string>,
  knownIds:
    Set<string>,
  amountCeiling: number,
  minimumDate: string,
  maximumDate: string
): PlanStructuredCommitment => {
  const path =
    `output.commitments[${index}]`;

  const record =
    expectRecord(
      value,
      path
    );

  assertExactKeys(
    record,
    [
      'id',
      'title',
      'description',
      'amountMinor',
      'dueDate',
      'evidenceRefs',
    ],
    path
  );

  return {
    id:
      registerId(
        record.id,
        `${path}.id`,
        knownIds
      ),

    title:
      safeText(
        record.title,
        `${path}.title`,
        160
      ),

    description:
      safeText(
        record.description,
        `${path}.description`,
        800
      ),

    amountMinor:
      expectNullableSafeInteger(
        record.amountMinor,
        `${path}.amountMinor`,
        0,
        amountCeiling
      ),

    dueDate:
      parseIsoDate(
        record.dueDate,
        `${path}.dueDate`,
        minimumDate,
        maximumDate
      ),

    evidenceRefs:
      validateEvidenceRefs(
        record.evidenceRefs,
        `${path}.evidenceRefs`,
        catalog
      ),
  };
};

const validateRecommendation = (
  value: unknown,
  index: number,
  catalog:
    Set<string>,
  knownIds:
    Set<string>
): PlanStructuredRecommendation => {
  const path =
    `output.recommendations[${index}]`;

  const record =
    expectRecord(
      value,
      path
    );

  assertExactKeys(
    record,
    [
      'id',
      'title',
      'description',
      'priority',
      'evidenceRefs',
    ],
    path
  );

  return {
    id:
      registerId(
        record.id,
        `${path}.id`,
        knownIds
      ),

    title:
      safeText(
        record.title,
        `${path}.title`,
        160
      ),

    description:
      safeText(
        record.description,
        `${path}.description`,
        800
      ),

    priority:
      expectEnum(
        record.priority,
        [
          'low',
          'medium',
          'high',
        ] as const,
        `${path}.priority`
      ),

    evidenceRefs:
      validateEvidenceRefs(
        record.evidenceRefs,
        `${path}.evidenceRefs`,
        catalog
      ),
  };
};

const validateActionProposal = (
  value: unknown,
  index: number,
  catalog:
    Set<string>,
  knownIds:
    Set<string>,
  categoryIds:
    Set<string>,
  availableMinor: number,
  budgetCeilingMinor:
    number,
  savingsRemainingMinor:
    number,
  minimumDate: string,
  maximumDate: string
): PlanStructuredActionProposal => {
  const path =
    `output.actionProposals[${index}]`;

  const record =
    expectRecord(
      value,
      path
    );

  assertExactKeys(
    record,
    [
      'id',
      'type',
      'title',
      'description',
      'targetEntityId',
      'proposedAmountMinor',
      'effectiveDate',
      'requiresConfirmation',
      'executionState',
      'evidenceRefs',
    ],
    path
  );

  const type =
    expectEnum(
      record.type,
      [
        'budget_adjustment',
        'savings_contribution',
        'recurring_review',
      ] as const,
      `${path}.type`
    );

  const targetEntityId =
    expectNullableString(
      record.targetEntityId,
      `${path}.targetEntityId`,
      128
    );

  const proposedAmountMinor =
    expectNullableSafeInteger(
      record.proposedAmountMinor,
      `${path}.proposedAmountMinor`,
      0
    );

  if (
    record.requiresConfirmation !==
      true ||
    record.executionState !==
      'proposal_only'
  ) {
    invalid(
      'ACTION_PROPOSAL_INVALID',
      path
    );
  }

  if (
    type ===
      'budget_adjustment'
  ) {
    if (
      (
        targetEntityId !== null &&
        !categoryIds.has(
          targetEntityId
        )
      ) ||
      proposedAmountMinor ===
        null ||
      proposedAmountMinor >
        budgetCeilingMinor
    ) {
      invalid(
        'ACTION_PROPOSAL_INVALID',
        path
      );
    }
  }

  if (
    type ===
      'savings_contribution'
  ) {
    const savingsCeiling =
      Math.min(
        availableMinor,
        savingsRemainingMinor
      );

    if (
      targetEntityId !== null ||
      proposedAmountMinor ===
        null ||
      proposedAmountMinor >
        savingsCeiling
    ) {
      invalid(
        'ACTION_PROPOSAL_INVALID',
        path
      );
    }
  }

  if (
    type ===
      'recurring_review' &&
    (
      targetEntityId !== null ||
      proposedAmountMinor !==
        null
    )
  ) {
    invalid(
      'ACTION_PROPOSAL_INVALID',
      path
    );
  }

  return {
    id:
      registerId(
        record.id,
        `${path}.id`,
        knownIds
      ),

    type,

    title:
      safeText(
        record.title,
        `${path}.title`,
        160
      ),

    description:
      safeText(
        record.description,
        `${path}.description`,
        800
      ),

    targetEntityId,
    proposedAmountMinor,

    effectiveDate:
      parseIsoDate(
        record.effectiveDate,
        `${path}.effectiveDate`,
        minimumDate,
        maximumDate
      ),

    requiresConfirmation:
      true,

    executionState:
      'proposal_only',

    evidenceRefs:
      validateEvidenceRefs(
        record.evidenceRefs,
        `${path}.evidenceRefs`,
        catalog
      ),
  };
};

const validateWarning = (
  value: unknown,
  index: number,
  catalog:
    Set<string>,
  knownIds:
    Set<string>
): PlanStructuredWarning => {
  const path =
    `output.warnings[${index}]`;

  const record =
    expectRecord(
      value,
      path
    );

  assertExactKeys(
    record,
    [
      'id',
      'code',
      'message',
      'evidenceRefs',
    ],
    path
  );

  return {
    id:
      registerId(
        record.id,
        `${path}.id`,
        knownIds
      ),

    code:
      expectEnum(
        record.code,
        [
          'EVIDENCE_INSUFFICIENT',
          'EVIDENCE_PARTIAL',
          'EXPECTED_INCOME_UNAVAILABLE',
          'BUDGET_UNAVAILABLE',
          'SAVINGS_GOALS_UNAVAILABLE',
          'RECURRING_COMMITMENTS_UNAVAILABLE',
          'LOCATION_EVIDENCE_UNAVAILABLE',
          'REQUEST_UNSUPPORTED',
          'PROFESSIONAL_GUIDANCE_REQUIRED',
        ] as const,
        `${path}.code`
      ),

    message:
      safeText(
        record.message,
        `${path}.message`,
        800
      ),

    evidenceRefs:
      validateEvidenceRefs(
        record.evidenceRefs,
        `${path}.evidenceRefs`,
        catalog
      ),
  };
};

const validateMetadata = (
  metadata:
    PlanGenerationMetadata,
  attemptCount: number
): PlanGenerationMetadata => {
  if (
    !MODEL_ID_PATTERN.test(
      metadata.modelId
    ) ||
    metadata.promptVersion !==
      PLAN_PROMPT_VERSION ||
    metadata
      .responseSchemaVersion !==
      PLAN_RESPONSE_SCHEMA_VERSION ||
    metadata
      .outputSchemaVersion !==
      PLAN_OUTPUT_SCHEMA_VERSION ||
    !Number.isSafeInteger(
      metadata.attemptCount
    ) ||
    metadata.attemptCount < 1 ||
    metadata.attemptCount > 2 ||
    metadata.attemptCount !==
      attemptCount
  ) {
    invalid(
      'OUTPUT_METADATA_INVALID',
      'metadata'
    );
  }

  const generatedAt =
    new Date(
      metadata.generatedAt
    );

  if (
    Number.isNaN(
      generatedAt.getTime()
    ) ||
    generatedAt
      .toISOString() !==
      metadata.generatedAt
  ) {
    invalid(
      'OUTPUT_METADATA_INVALID',
      'metadata.generatedAt'
    );
  }

  return {
    modelId:
      metadata.modelId,

    promptVersion:
      PLAN_PROMPT_VERSION,

    responseSchemaVersion:
      PLAN_RESPONSE_SCHEMA_VERSION,

    outputSchemaVersion:
      PLAN_OUTPUT_SCHEMA_VERSION,

    attemptCount:
      metadata.attemptCount,

    generatedAt:
      metadata.generatedAt,
  };
};

const assertRequiredWarnings = (
  output:
    PlanStructuredOutput,
  evidence:
    PlanEvidenceContract
) => {
  const codes =
    new Set(
      output.warnings.map(
        (warning) =>
          warning.code
      )
    );

  const requireCode = (
    condition: boolean,
    code:
      PlanStructuredWarning[
        'code'
      ]
  ) => {
    if (
      condition &&
      !codes.has(code)
    ) {
      invalid(
        'OUTPUT_STRUCTURE_INVALID',
        `output.warnings.${code}`
      );
    }
  };

  requireCode(
    evidence.coverage.status ===
      'insufficient',
    'EVIDENCE_INSUFFICIENT'
  );

  requireCode(
    evidence.coverage.status ===
      'partial',
    'EVIDENCE_PARTIAL'
  );

  requireCode(
    evidence
      .totals
      .expectedIncome
      .amountMinor ===
      null,
    'EXPECTED_INCOME_UNAVAILABLE'
  );

  requireCode(
    evidence
      .totals
      .budgetTotalMinor ===
      null,
    'BUDGET_UNAVAILABLE'
  );

  requireCode(
    evidence
      .savings
      .goalCount ===
      0,
    'SAVINGS_GOALS_UNAVAILABLE'
  );

  requireCode(
    evidence
      .recurring
      .length ===
      0,
    'RECURRING_COMMITMENTS_UNAVAILABLE'
  );

  requireCode(
    evidence
      .locations
      .length ===
      0,
    'LOCATION_EVIDENCE_UNAVAILABLE'
  );
};

export const validatePlanProviderResult =
  (
    input:
      PlanOutputValidationInput
  ): ValidatedPlanProviderResult => {
    const evidence =
      input.request.evidence;

    const candidate =
      expectRecord(
        input.result.candidate,
        'output'
      );

    assertExactKeys(
      candidate,
      [
        'schemaVersion',
        'action',
        'baselineRevision',
        'currency',
        'periodKind',
        'summary',
        'observations',
        'allocations',
        'commitments',
        'recommendations',
        'actionProposals',
        'warnings',
      ],
      'output'
    );

    if (
      candidate.schemaVersion !==
        PLAN_OUTPUT_SCHEMA_VERSION
    ) {
      invalid(
        'OUTPUT_STRUCTURE_INVALID',
        'output.schemaVersion'
      );
    }

    const action =
      expectEnum(
        candidate.action,
        [
          'turn',
          'generate',
          'revise',
        ] as const,
        'output.action'
      );

    if (
      action !==
      input.action
    ) {
      invalid(
        'STALE_EVIDENCE',
        'output.action'
      );
    }

    const baselineRevision =
      expectString(
        candidate.baselineRevision,
        'output.baselineRevision',
        36,
        36
      );

    if (
      baselineRevision !==
        evidence
          .baselineRevision ||
      (
        'baselineRevision' in
          input.request &&
        input.request
          .baselineRevision !==
          evidence
            .baselineRevision
      )
    ) {
      invalid(
        'STALE_EVIDENCE',
        'output.baselineRevision'
      );
    }

    const currency =
      expectString(
        candidate.currency,
        'output.currency',
        3,
        3
      );

    if (
      currency !==
      evidence.currency
    ) {
      invalid(
        'STALE_EVIDENCE',
        'output.currency'
      );
    }

    const periodKind =
      expectEnum(
        candidate.periodKind,
        [
          '7_days',
          '14_days',
          'current_month',
          'calendar_month',
        ] as const,
        'output.periodKind'
      );

    if (
      periodKind !==
      evidence.period.kind
    ) {
      invalid(
        'STALE_EVIDENCE',
        'output.periodKind'
      );
    }

    const catalog =
      buildEvidenceReferenceCatalog(
        evidence
      );

    const knownIds =
      new Set<string>();

    const categoryIds =
      new Set(
        evidence.categories.map(
          (category) =>
            category.categoryId
        )
      );

    const availableMinor =
      Math.max(
        0,
        evidence
          .totals
          .availableAfterCommitmentsMinor
      );

    const budgetCeilingMinor =
      Math.max(
        availableMinor,
        evidence
          .totals
          .budgetTotalMinor ??
          0,
        evidence
          .totals
          .horizonBudgetSpendMinor,
        evidence
          .totals
          .recordedExpensesMinor
      );

    const recurringCeilingMinor =
      evidence
        .totals
        .projectedRecurringCommitmentsMinor;

    const observations =
      expectArray(
        candidate.observations,
        'output.observations',
        1,
        20
      ).map(
        (item, index) =>
          validateObservation(
            item,
            index,
            catalog,
            knownIds
          )
      );

    const allocations =
      expectArray(
        candidate.allocations,
        'output.allocations',
        0,
        50
      ).map(
        (item, index) =>
          validateAllocation(
            item,
            index,
            catalog,
            knownIds,
            categoryIds,
            availableMinor
          )
      );

    let allocationTotal = 0;

    allocations.forEach(
      (allocation, index) => {
        allocationTotal =
          addSafe(
            allocationTotal,
            allocation.amountMinor,
            `output.allocations[${index}].amountMinor`
          );
      }
    );

    if (
      allocationTotal >
      availableMinor
    ) {
      invalid(
        'ARITHMETIC_BOUND_INVALID',
        'output.allocations'
      );
    }

    const commitments =
      expectArray(
        candidate.commitments,
        'output.commitments',
        0,
        50
      ).map(
        (item, index) =>
          validateCommitment(
            item,
            index,
            catalog,
            knownIds,
            recurringCeilingMinor,
            evidence
              .period
              .startDate,
            evidence
              .period
              .endDate
          )
      );

    let commitmentTotal = 0;

    commitments.forEach(
      (commitment, index) => {
        if (
          commitment.amountMinor !==
          null
        ) {
          commitmentTotal =
            addSafe(
              commitmentTotal,
              commitment.amountMinor,
              `output.commitments[${index}].amountMinor`
            );
        }
      }
    );

    if (
      commitmentTotal >
      recurringCeilingMinor
    ) {
      invalid(
        'ARITHMETIC_BOUND_INVALID',
        'output.commitments'
      );
    }

    const recommendations =
      expectArray(
        candidate.recommendations,
        'output.recommendations',
        0,
        30
      ).map(
        (item, index) =>
          validateRecommendation(
            item,
            index,
            catalog,
            knownIds
          )
      );

    const actionProposals =
      expectArray(
        candidate.actionProposals,
        'output.actionProposals',
        0,
        20
      ).map(
        (item, index) =>
          validateActionProposal(
            item,
            index,
            catalog,
            knownIds,
            categoryIds,
            availableMinor,
            budgetCeilingMinor,
            evidence
              .savings
              .remainingMinor,
            evidence
              .period
              .startDate,
            evidence
              .period
              .endDate
          )
      );

    const warnings =
      expectArray(
        candidate.warnings,
        'output.warnings',
        0,
        20
      ).map(
        (item, index) =>
          validateWarning(
            item,
            index,
            catalog,
            knownIds
          )
      );

    const output:
      PlanStructuredOutput = {
      schemaVersion:
        PLAN_OUTPUT_SCHEMA_VERSION,

      action,
      baselineRevision,
      currency,
      periodKind,

      summary:
        safeText(
          candidate.summary,
          'output.summary',
          1_000
        ),

      observations,
      allocations,
      commitments,
      recommendations,
      actionProposals,
      warnings,
    };

    assertRequiredWarnings(
      output,
      evidence
    );

    let parsedText:
      unknown;

    try {
      parsedText =
        JSON.parse(
          input.result.text
        );
    } catch {
      invalid(
        'OUTPUT_STRUCTURE_INVALID',
        'provider.text'
      );
    }

    if (
      JSON.stringify(
        parsedText
      ) !==
      JSON.stringify(
        input.result.candidate
      )
    ) {
      invalid(
        'OUTPUT_STRUCTURE_INVALID',
        'provider.candidate'
      );
    }

    const metadata =
      validateMetadata(
        input.result.metadata,
        input.result
          .attemptCount
      );

    return {
      output,
      metadata,
      validationState:
        'valid',
    };
  };

import {
  PLAN_OUTPUT_SCHEMA_VERSION,
} from './outputContracts';

const idSchema = {
  type: 'string',
  minLength: 3,
  maxLength: 64,
  description:
    'A response-local identifier. It is not a database identifier.',
} as const;

const shortTextSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 160,
} as const;

const descriptionSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 800,
} as const;

const nullableIdentifierSchema = {
  type: [
    'string',
    'null',
  ],
  maxLength: 128,
} as const;

const nullableDateSchema = {
  type: [
    'string',
    'null',
  ],
  maxLength: 10,
  description:
    'An ISO calendar date or null.',
} as const;

const nullableMoneySchema = {
  type: [
    'integer',
    'null',
  ],
  minimum: 0,
  description:
    'A non-negative monetary value in integer minor units, or null.',
} as const;

const evidenceRefsSchema = {
  type: 'array',
  minItems: 1,
  maxItems: 12,
  items: {
    type: 'string',
    minLength: 1,
    maxLength: 160,
    description:
      'A reference to a verified field in the submitted evidence snapshot.',
  },
} as const;

const observationSchema = {
  type: 'object',
  properties: {
    id:
      idSchema,

    statement: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
    },

    evidenceRefs:
      evidenceRefsSchema,
  },
  required: [
    'id',
    'statement',
    'evidenceRefs',
  ],
} as const;

const allocationSchema = {
  type: 'object',
  properties: {
    id:
      idSchema,

    label:
      shortTextSchema,

    categoryId:
      nullableIdentifierSchema,

    amountMinor: {
      type: 'integer',
      minimum: 0,
      description:
        'A non-negative allocation amount in integer minor units.',
    },

    period: {
      type: 'string',
      enum: [
        'plan',
        'week',
        'month',
      ],
    },

    evidenceRefs:
      evidenceRefsSchema,
  },
  required: [
    'id',
    'label',
    'categoryId',
    'amountMinor',
    'period',
    'evidenceRefs',
  ],
} as const;

const commitmentSchema = {
  type: 'object',
  properties: {
    id:
      idSchema,

    title:
      shortTextSchema,

    description:
      descriptionSchema,

    amountMinor:
      nullableMoneySchema,

    dueDate:
      nullableDateSchema,

    evidenceRefs:
      evidenceRefsSchema,
  },
  required: [
    'id',
    'title',
    'description',
    'amountMinor',
    'dueDate',
    'evidenceRefs',
  ],
} as const;

const recommendationSchema = {
  type: 'object',
  properties: {
    id:
      idSchema,

    title:
      shortTextSchema,

    description:
      descriptionSchema,

    priority: {
      type: 'string',
      enum: [
        'low',
        'medium',
        'high',
      ],
    },

    evidenceRefs:
      evidenceRefsSchema,
  },
  required: [
    'id',
    'title',
    'description',
    'priority',
    'evidenceRefs',
  ],
} as const;

const actionProposalSchema = {
  type: 'object',
  properties: {
    id:
      idSchema,

    type: {
      type: 'string',
      enum: [
        'budget_adjustment',
        'savings_contribution',
        'recurring_review',
      ],
    },

    title:
      shortTextSchema,

    description:
      descriptionSchema,

    targetEntityId:
      nullableIdentifierSchema,

    proposedAmountMinor:
      nullableMoneySchema,

    effectiveDate:
      nullableDateSchema,

    requiresConfirmation: {
      type: 'boolean',
      enum: [
        true,
      ],
    },

    executionState: {
      type: 'string',
      enum: [
        'proposal_only',
      ],
    },

    evidenceRefs:
      evidenceRefsSchema,
  },
  required: [
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
} as const;

const warningSchema = {
  type: 'object',
  properties: {
    id:
      idSchema,

    code: {
      type: 'string',
      enum: [
        'EVIDENCE_INSUFFICIENT',
        'EVIDENCE_PARTIAL',
        'EXPECTED_INCOME_UNAVAILABLE',
        'BUDGET_UNAVAILABLE',
        'SAVINGS_GOALS_UNAVAILABLE',
        'RECURRING_COMMITMENTS_UNAVAILABLE',
        'LOCATION_EVIDENCE_UNAVAILABLE',
        'REQUEST_UNSUPPORTED',
        'PROFESSIONAL_GUIDANCE_REQUIRED',
      ],
    },

    message:
      descriptionSchema,

    evidenceRefs:
      evidenceRefsSchema,
  },
  required: [
    'id',
    'code',
    'message',
    'evidenceRefs',
  ],
} as const;

export const PLAN_STRUCTURED_OUTPUT_JSON_SCHEMA = {
  type: 'object',

  title:
    'PerFinPlanStructuredOutput',

  description:
    'Educational Plan guidance derived only from submitted deterministic evidence.',

  properties: {
    schemaVersion: {
      type: 'integer',
      enum: [
        PLAN_OUTPUT_SCHEMA_VERSION,
      ],
    },

    action: {
      type: 'string',
      enum: [
        'turn',
        'generate',
        'revise',
      ],
    },

    baselineRevision: {
      type: 'string',
      minLength: 36,
      maxLength: 36,
    },

    currency: {
      type: 'string',
      minLength: 3,
      maxLength: 3,
    },

    periodKind: {
      type: 'string',
      enum: [
        '7_days',
        '14_days',
        'current_month',
        'calendar_month',
      ],
    },

    summary: {
      type: 'string',
      minLength: 1,
      maxLength: 1_000,
    },

    observations: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items:
        observationSchema,
    },

    allocations: {
      type: 'array',
      maxItems: 50,
      items:
        allocationSchema,
    },

    commitments: {
      type: 'array',
      maxItems: 50,
      items:
        commitmentSchema,
    },

    recommendations: {
      type: 'array',
      maxItems: 30,
      items:
        recommendationSchema,
    },

    actionProposals: {
      type: 'array',
      maxItems: 20,
      items:
        actionProposalSchema,
    },

    warnings: {
      type: 'array',
      maxItems: 20,
      items:
        warningSchema,
    },
  },

  required: [
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
} as const;

export const PLAN_PROVIDER_RESPONSE_FORMAT = {
  text: {
    mimeType:
      'application/json',

    schema:
      PLAN_STRUCTURED_OUTPUT_JSON_SCHEMA,
  },
} as const;

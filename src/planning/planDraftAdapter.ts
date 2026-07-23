import type {
  FinancialPlan,
  PlanActionProposal,
  PlanAllocation,
  PlanCommitment,
  PlanRecommendation,
  PlanVersion,
} from '../models/planning';

import {
  fromMinorUnits,
} from './planEvidence';

import type {
  PlanEvidenceSnapshot,
} from './planEvidence.types';

import type {
  PlanDraftResponse,
  PlanStructuredActionProposal,
  PlanStructuredAllocation,
  PlanStructuredCommitment,
  PlanStructuredObservation,
  PlanStructuredRecommendation,
  PlanStructuredWarning,
} from '../services/plan';

export interface PlanEditableDraft {
  readonly schemaVersion:
    1;

  readonly action:
    'turn';

  readonly baselineRevision:
    string;

  readonly currency:
    string;

  readonly periodKind:
    | '7_days'
    | '14_days'
    | 'current_month'
    | 'calendar_month';

  readonly summary:
    string;

  readonly observations:
    readonly PlanStructuredObservation[];

  readonly allocations:
    readonly PlanStructuredAllocation[];

  readonly commitments:
    readonly PlanStructuredCommitment[];

  readonly recommendations:
    readonly PlanStructuredRecommendation[];

  readonly actionProposals:
    readonly PlanStructuredActionProposal[];

  readonly warnings:
    readonly PlanStructuredWarning[];
}

export interface BuildInitialPlanRecordsInput {
  readonly userId:
    string;

  readonly primaryGoal:
    string;

  readonly evidence:
    PlanEvidenceSnapshot;

  readonly response:
    PlanDraftResponse;

  readonly draft:
    PlanEditableDraft;

  readonly planId:
    string;

  readonly versionId:
    string;

  readonly createdAt:
    string;
}

export interface InitialPlanRecords {
  readonly plan:
    FinancialPlan;

  readonly version:
    PlanVersion;
}

const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const normalizeText = (
  value: string,
  label: string,
  minimumLength: number,
  maximumLength: number
): string => {
  const normalized =
    value
      .normalize('NFKC')
      .trim();

  if (
    normalized.length <
      minimumLength ||
    normalized.length >
      maximumLength ||
    CONTROL_CHARACTER_PATTERN.test(
      normalized
    )
  ) {
    throw new Error(
      `${label} is invalid`
    );
  }

  return normalized;
};

const requireId = (
  value: string,
  label: string
): string => {
  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.includes('/')
  ) {
    throw new Error(
      `${label} is invalid`
    );
  }

  return normalized;
};

const assertIsoTimestamp = (
  value: string,
  label: string
): string => {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    ) ||
    parsed.toISOString() !==
      value
  ) {
    throw new Error(
      `${label} is invalid`
    );
  }

  return value;
};

const planHorizonFor = (
  periodKind:
    PlanEditableDraft[
      'periodKind'
    ]
): FinancialPlan[
  'horizon'
] => {
  switch (periodKind) {
    case '7_days':
      return '7_days';

    case '14_days':
      return '14_days';

    case 'current_month':
    case 'calendar_month':
      return 'monthly';
  }
};

const cloneStrings = (
  values:
    readonly string[]
): string[] =>
  values.slice();

const allocationFor = (
  allocation:
    PlanStructuredAllocation,
  currency: string
): PlanAllocation => ({
  id:
    requireId(
      allocation.id,
      'Allocation id'
    ),

  label:
    normalizeText(
      allocation.label,
      'Allocation label',
      1,
      160
    ),

  categoryId:
    allocation.categoryId,

  amount:
    fromMinorUnits(
      allocation.amountMinor,
      currency
    ),

  period:
    allocation.period,
});

const commitmentFor = (
  commitment:
    PlanStructuredCommitment,
  currency: string
): PlanCommitment => ({
  id:
    requireId(
      commitment.id,
      'Commitment id'
    ),

  title:
    normalizeText(
      commitment.title,
      'Commitment title',
      1,
      160
    ),

  description:
    normalizeText(
      commitment.description,
      'Commitment description',
      1,
      800
    ),

  amount:
    commitment.amountMinor ===
      null
      ? null
      : fromMinorUnits(
          commitment.amountMinor,
          currency
        ),

  dueDate:
    commitment.dueDate,
});

const recommendationFor = (
  recommendation:
    PlanStructuredRecommendation
): PlanRecommendation => ({
  id:
    requireId(
      recommendation.id,
      'Recommendation id'
    ),

  title:
    normalizeText(
      recommendation.title,
      'Recommendation title',
      1,
      160
    ),

  description:
    normalizeText(
      recommendation.description,
      'Recommendation description',
      1,
      800
    ),

  priority:
    recommendation.priority,

  source:
    'ai_assisted',

  evidenceRefs:
    cloneStrings(
      recommendation
        .evidenceRefs
    ),
});

const actionProposalFor = (
  proposal:
    PlanStructuredActionProposal,
  currency: string
): PlanActionProposal => {
  if (
    proposal.requiresConfirmation !==
      true ||
    proposal.executionState !==
      'proposal_only'
  ) {
    throw new Error(
      'Action proposal is not proposal-only'
    );
  }

  return {
    id:
      requireId(
        proposal.id,
        'Action proposal id'
      ),

    type:
      proposal.type,

    title:
      normalizeText(
        proposal.title,
        'Action proposal title',
        1,
        160
      ),

    description:
      normalizeText(
        proposal.description,
        'Action proposal description',
        1,
        800
      ),

    targetEntityId:
      proposal.targetEntityId,

    proposedAmount:
      proposal
        .proposedAmountMinor ===
        null
        ? null
        : fromMinorUnits(
            proposal
              .proposedAmountMinor,
            currency
          ),

    effectiveDate:
      proposal.effectiveDate,

    requiresConfirmation:
      true,

    executionState:
      'proposal_only',
  };
};

export const createEditablePlanDraft =
  (
    response:
      PlanDraftResponse
  ): PlanEditableDraft => ({
    schemaVersion:
      response
        .result
        .schemaVersion,

    action:
      response
        .result
        .action,

    baselineRevision:
      response
        .result
        .baselineRevision,

    currency:
      response
        .result
        .currency,

    periodKind:
      response
        .result
        .periodKind,

    summary:
      response
        .result
        .summary,

    observations:
      response
        .result
        .observations
        .map(
          (observation) => ({
            ...observation,

            evidenceRefs:
              cloneStrings(
                observation
                  .evidenceRefs
              ),
          })
        ),

    allocations:
      response
        .result
        .allocations
        .map(
          (allocation) => ({
            ...allocation,

            evidenceRefs:
              cloneStrings(
                allocation
                  .evidenceRefs
              ),
          })
        ),

    commitments:
      response
        .result
        .commitments
        .map(
          (commitment) => ({
            ...commitment,

            evidenceRefs:
              cloneStrings(
                commitment
                  .evidenceRefs
              ),
          })
        ),

    recommendations:
      response
        .result
        .recommendations
        .map(
          (recommendation) => ({
            ...recommendation,

            evidenceRefs:
              cloneStrings(
                recommendation
                  .evidenceRefs
              ),
          })
        ),

    actionProposals:
      response
        .result
        .actionProposals
        .map(
          (proposal) => ({
            ...proposal,

            evidenceRefs:
              cloneStrings(
                proposal
                  .evidenceRefs
              ),
          })
        ),

    warnings:
      response
        .result
        .warnings
        .map(
          (warning) => ({
            ...warning,

            evidenceRefs:
              cloneStrings(
                warning
                  .evidenceRefs
              ),
          })
        ),
  });

export const buildInitialPlanRecords =
  (
    input:
      BuildInitialPlanRecordsInput
  ): InitialPlanRecords => {
    const userId =
      requireId(
        input.userId,
        'User id'
      );

    const planId =
      requireId(
        input.planId,
        'Plan id'
      );

    const versionId =
      requireId(
        input.versionId,
        'Plan version id'
      );

    const createdAt =
      assertIsoTimestamp(
        input.createdAt,
        'Created timestamp'
      );

    const goal =
      normalizeText(
        input.primaryGoal,
        'Primary goal',
        3,
        160
      );

    const {
      evidence,
      response,
      draft,
    } =
      input;

    if (
      response.validationState !==
        'valid' ||
      response.baselineRevision !==
        evidence
          .baselineRevision ||
      response
        .result
        .baselineRevision !==
        evidence
          .baselineRevision ||
      draft.baselineRevision !==
        evidence
          .baselineRevision ||
      draft.currency !==
        evidence.currency ||
      draft.periodKind !==
        evidence.period.kind
    ) {
      throw new Error(
        'Draft evidence is stale or invalid'
      );
    }

    const title =
      normalizeText(
        goal,
        'Plan title',
        3,
        120
      );

    const plan:
      FinancialPlan = {
      id:
        planId,

      userId,

      title,

      currency:
        evidence.currency,

      horizon:
        planHorizonFor(
          draft.periodKind
        ),

      startDate:
        evidence
          .period
          .startDate,

      endDate:
        evidence
          .period
          .endDate,

      status:
        'draft',

      currentVersionId:
        versionId,

      versionCount:
        1,

      replacedPlanId:
        null,

      createdAt,
      updatedAt:
        createdAt,

      activatedAt:
        null,

      completedAt:
        null,

      archivedAt:
        null,
    };

    const version:
      PlanVersion = {
      id:
        versionId,

      userId,
      planId,

      versionNumber:
        1,

      createdAt,

      createdBy:
        'ai_assisted',

      sourceRevision:
        evidence
          .baselineRevision,

      generation: {
        modelId:
          normalizeText(
            response
              .generation
              .modelId,
            'Generation model id',
            1,
            120
          ),

        promptVersion:
          normalizeText(
            response
              .generation
              .promptVersion,
            'Prompt version',
            1,
            120
          ),

        responseSchemaVersion:
          normalizeText(
            response
              .generation
              .responseSchemaVersion,
            'Response schema version',
            1,
            120
          ),

        outputSchemaVersion:
          response
            .generation
            .outputSchemaVersion,

        attemptCount:
          response
            .generation
            .attemptCount,

        generatedAt:
          assertIsoTimestamp(
            response
              .generation
              .generatedAt,
            'Generation timestamp'
          ),
      },

      summary:
        normalizeText(
          draft.summary,
          'Plan summary',
          1,
          1_000
        ),

      assumptions:
        [],

      allocations:
        draft
          .allocations
          .map(
            (allocation) =>
              allocationFor(
                allocation,
                draft.currency
              )
          ),

      commitments:
        draft
          .commitments
          .map(
            (commitment) =>
              commitmentFor(
                commitment,
                draft.currency
              )
          ),

      recommendations:
        draft
          .recommendations
          .map(
            recommendationFor
          ),

      actionProposals:
        draft
          .actionProposals
          .map(
            (proposal) =>
              actionProposalFor(
                proposal,
                draft.currency
              )
          ),

      validation: {
        schemaVersion:
          1,

        state:
          'valid',

        validatedAt:
          response
            .generation
            .generatedAt,

        errors:
          [],

        warnings:
          draft
            .warnings
            .map(
              (warning) =>
                warning.code
            ),
      },
    };

    return {
      plan,
      version,
    };
  };

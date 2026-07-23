import type {
  FinancialPlan,
  PlanVersion,
} from '../../models/planning';
import type { PlanEvidenceSnapshot } from '../../planning/planEvidence.types';
import {
  comparePlanEvidence,
  findOverlappingActivePlans,
  sortSavedPlans,
} from '../../planning/planWorkspace';
import type {
  CreatePlanInput,
  PlanVersionCreationResult,
  UpdatePlanLifecycleInput,
} from '../firebase';

export interface PlanWorkspaceRepository {
  listPlans:
    (userId: string) => Promise<FinancialPlan[]>;
  getPlan:
    (
      userId: string,
      planId: string
    ) => Promise<FinancialPlan | null>;
  listPlanVersions:
    (
      userId: string,
      planId: string
    ) => Promise<PlanVersion[]>;
  createPlan:
    (
      userId: string,
      input: CreatePlanInput
    ) => Promise<PlanVersionCreationResult>;
  createPlanVersion:
    (
      userId: string,
      planId: string,
      version: PlanVersion
    ) => Promise<PlanVersionCreationResult>;
  updatePlanLifecycle:
    (
      userId: string,
      planId: string,
      input: UpdatePlanLifecycleInput
    ) => Promise<FinancialPlan>;
}

const defaultRepository: PlanWorkspaceRepository = {
  listPlans: async (userId) => {
    const repository = await import(
      '../firebase/planRepository'
    );
    return repository.listPlans(userId);
  },
  getPlan: async (userId, planId) => {
    const repository = await import(
      '../firebase/planRepository'
    );
    return repository.getPlan(
      userId,
      planId
    );
  },
  listPlanVersions:
    async (userId, planId) => {
      const repository = await import(
        '../firebase/planRepository'
      );
      return repository.listPlanVersions(
        userId,
        planId
      );
    },
  createPlan:
    async (userId, input) => {
      const repository = await import(
        '../firebase/planRepository'
      );
      return repository.createPlan(
        userId,
        input
      );
    },
  createPlanVersion:
    async (
      userId,
      planId,
      version
    ) => {
      const repository = await import(
        '../firebase/planRepository'
      );
      return repository.createPlanVersion(
        userId,
        planId,
        version
      );
    },
  updatePlanLifecycle:
    async (userId, planId, input) => {
      const repository = await import(
        '../firebase/planRepository'
      );
      return repository.updatePlanLifecycle(
        userId,
        planId,
        input
      );
    },
};

export type PlanWorkspaceErrorCode =
  | 'confirmation_required'
  | 'invalid_input'
  | 'not_found'
  | 'stale_baseline'
  | 'overlapping_active_plan';

export class PlanWorkspaceError extends Error {
  constructor(
    public readonly code:
      PlanWorkspaceErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'PlanWorkspaceError';
  }
}

const requireId = (
  value: string,
  label: string
): string => {
  const normalized = value.trim();

  if (
    !normalized ||
    normalized.includes('/')
  ) {
    throw new PlanWorkspaceError(
      'invalid_input',
      `${label} is invalid`
    );
  }

  return normalized;
};

const requireIsoTimestamp = (
  value: string
): string => {
  if (
    !value.includes('T') ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new PlanWorkspaceError(
      'invalid_input',
      'Plan change timestamp must be an ISO datetime'
    );
  }

  return value;
};

const requireSummary = (
  value: string
): string => {
  const normalized = value
    .normalize('NFKC')
    .trim();

  if (
    normalized.length < 3 ||
    normalized.length > 1_000
  ) {
    throw new PlanWorkspaceError(
      'invalid_input',
      'Plan summary must contain 3 to 1000 characters'
    );
  }

  return normalized;
};

const cloneVersionContent = (
  source: PlanVersion,
  fallbackEffectiveMonth: string
): Pick<
  PlanVersion,
  | 'assumptions'
  | 'allocations'
  | 'commitments'
  | 'recommendations'
  | 'actionProposals'
  | 'actionProposalIds'
  | 'actionProposalApplications'
  | 'validation'
> => ({
  assumptions: source.assumptions.map(
    (assumption) => ({ ...assumption })
  ),
  allocations: source.allocations.map(
    (allocation) => ({ ...allocation })
  ),
  commitments: source.commitments.map(
    (commitment) => ({ ...commitment })
  ),
  recommendations:
    source.recommendations.map(
      (recommendation) => ({
        ...recommendation,
        evidenceRefs: [
          ...recommendation.evidenceRefs,
        ],
      })
    ),
  actionProposals:
    source.actionProposals.map(
      (proposal) => ({ ...proposal })
    ),
  actionProposalIds:
    source.actionProposalIds
      ? [...source.actionProposalIds]
      : source.actionProposals
          .filter(
            (proposal) =>
              proposal.schemaVersion === 2
          )
          .map((proposal) => proposal.id),
  actionProposalApplications:
    source.actionProposalApplications
      ? Object.fromEntries(
          Object.entries(
            source.actionProposalApplications
          ).map(([id, binding]) => [
            id,
            { ...binding },
          ])
        )
      : Object.fromEntries(
          source.actionProposals
            .filter(
              (proposal) =>
                proposal.schemaVersion === 2
            )
            .map((proposal) => [
              proposal.id,
              {
                schemaVersion: 2 as const,
                type: proposal.type,
                targetEntityId:
                  proposal.targetEntityId,
                proposedAmount:
                  proposal.proposedAmount,
                effectiveMonth:
                  (
                    proposal.effectiveDate ||
                    `${fallbackEffectiveMonth}-01`
                  ).slice(0, 7),
              },
            ])
        ),
  validation: {
    ...source.validation,
    errors: [...source.validation.errors],
    warnings: [...source.validation.warnings],
  },
});

export const loadPlanDetail = async (
  userId: string,
  planId: string,
  repository:
    PlanWorkspaceRepository =
      defaultRepository
): Promise<{
  plan: FinancialPlan;
  versions: PlanVersion[];
}> => {
  const ownerId = requireId(
    userId,
    'User id'
  );
  const savedPlanId = requireId(
    planId,
    'Plan id'
  );

  const [savedPlan, versions] =
    await Promise.all([
      repository.getPlan(
        ownerId,
        savedPlanId
      ),
      repository.listPlanVersions(
        ownerId,
        savedPlanId
      ),
    ]);

  if (!savedPlan) {
    throw new PlanWorkspaceError(
      'not_found',
      'Saved Plan was not found'
    );
  }

  return {
    plan: savedPlan,
    versions: [...versions].sort(
      (left, right) =>
        right.versionNumber -
        left.versionNumber
    ),
  };
};

export const loadSavedPlans = async (
  userId: string,
  repository:
    PlanWorkspaceRepository =
      defaultRepository
): Promise<FinancialPlan[]> =>
  sortSavedPlans(
    await repository.listPlans(
      requireId(userId, 'User id')
    )
  );

export interface CreateManualPlanRevisionInput {
  userId: string;
  plan: FinancialPlan;
  currentVersion: PlanVersion;
  summary: string;
  versionId: string;
  occurredAt: string;
}

export const createManualPlanRevision =
  async (
    input: CreateManualPlanRevisionInput,
    repository:
      PlanWorkspaceRepository =
        defaultRepository
  ): Promise<PlanVersionCreationResult> => {
    const userId = requireId(
      input.userId,
      'User id'
    );
    const versionId = requireId(
      input.versionId,
      'Plan version id'
    );
    const occurredAt =
      requireIsoTimestamp(
        input.occurredAt
      );

    if (
      input.plan.userId !== userId ||
      input.currentVersion.userId !==
        userId ||
      input.currentVersion.planId !==
        input.plan.id ||
      input.currentVersion.id !==
        input.plan.currentVersionId
    ) {
      throw new PlanWorkspaceError(
        'invalid_input',
        'Current Plan version does not match the saved Plan'
      );
    }

    const nextVersion: PlanVersion = {
      id: versionId,
      userId,
      planId: input.plan.id,
      versionNumber:
        input.plan.versionCount + 1,
      createdAt: occurredAt,
      createdBy: 'user',
      sourceRevision:
        input.currentVersion
          .sourceRevision,
      evidenceSummary:
        input.currentVersion
          .evidenceSummary
          ? {
              ...input.currentVersion
                .evidenceSummary,
              componentRevisions:
                input.currentVersion
                  .evidenceSummary
                  .componentRevisions
                  ? {
                      ...input
                        .currentVersion
                        .evidenceSummary
                        .componentRevisions,
                    }
                  : undefined,
            }
          : null,
      generation: null,
      summary: requireSummary(
        input.summary
      ),
      ...cloneVersionContent(
        input.currentVersion,
        input.plan.startDate.slice(0, 7)
      ),
      validation: {
        schemaVersion: 1,
        state: 'valid',
        validatedAt: occurredAt,
        errors: [],
        warnings: [],
      },
    };

    return repository.createPlanVersion(
      userId,
      input.plan.id,
      nextVersion
    );
  };

export interface DuplicatePlanInput {
  userId: string;
  sourcePlan: FinancialPlan;
  sourceVersion: PlanVersion;
  planId: string;
  versionId: string;
  occurredAt: string;
}

export const duplicatePlan = async (
  input: DuplicatePlanInput,
  repository:
    PlanWorkspaceRepository =
      defaultRepository
): Promise<PlanVersionCreationResult> => {
  const userId = requireId(
    input.userId,
    'User id'
  );
  const planId = requireId(
    input.planId,
    'Plan id'
  );
  const versionId = requireId(
    input.versionId,
    'Plan version id'
  );
  const occurredAt =
    requireIsoTimestamp(input.occurredAt);

  if (
    input.sourcePlan.userId !== userId ||
    input.sourceVersion.userId !== userId ||
    input.sourceVersion.planId !==
      input.sourcePlan.id
  ) {
    throw new PlanWorkspaceError(
      'invalid_input',
      'Source Plan does not belong to the authenticated user'
    );
  }

  const title = `${input.sourcePlan.title} copy`
    .slice(0, 120)
    .trim();

  const duplicate: FinancialPlan = {
    ...input.sourcePlan,
    id: planId,
    title,
    status: 'draft',
    currentVersionId: versionId,
    versionCount: 1,
    replacedPlanId: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    activatedAt: null,
    completedAt: null,
    archivedAt: null,
  };

  const initialVersion: PlanVersion = {
    ...cloneVersionContent(
      input.sourceVersion,
      input.sourcePlan.startDate.slice(0, 7)
    ),
    id: versionId,
    userId,
    planId,
    versionNumber: 1,
    createdAt: occurredAt,
    createdBy: 'user',
    sourceRevision:
      input.sourceVersion.sourceRevision,
    evidenceSummary:
      input.sourceVersion.evidenceSummary
        ? {
            ...input.sourceVersion
              .evidenceSummary,
            componentRevisions:
              input.sourceVersion
                .evidenceSummary
                .componentRevisions
                ? {
                    ...input
                      .sourceVersion
                      .evidenceSummary
                      .componentRevisions,
                  }
                : undefined,
          }
        : null,
    generation:
      input.sourceVersion.generation
        ? {
            ...input.sourceVersion
              .generation,
          }
        : null,
    summary:
      input.sourceVersion.summary,
  };

  return repository.createPlan(
    userId,
    {
      plan: duplicate,
      initialVersion,
    }
  );
};

export interface ApplyPlanLifecycleChangeInput {
  userId: string;
  plan: FinancialPlan;
  currentVersion: PlanVersion;
  currentEvidence: PlanEvidenceSnapshot;
  status: UpdatePlanLifecycleInput['status'];
  confirmed: boolean;
  occurredAt: string;
  replacementPlanId: string | null;
}

export const applyPlanLifecycleChange =
  async (
    input: ApplyPlanLifecycleChangeInput,
    repository:
      PlanWorkspaceRepository =
        defaultRepository
  ): Promise<FinancialPlan> => {
    if (!input.confirmed) {
      throw new PlanWorkspaceError(
        'confirmation_required',
        'Confirm the Plan lifecycle change before continuing'
      );
    }

    const userId = requireId(
      input.userId,
      'User id'
    );
    const occurredAt =
      requireIsoTimestamp(
        input.occurredAt
      );

    if (
      input.plan.userId !== userId ||
      input.currentVersion.userId !==
        userId ||
      input.currentVersion.planId !==
        input.plan.id ||
      input.currentVersion.id !==
        input.plan.currentVersionId
    ) {
      throw new PlanWorkspaceError(
        'invalid_input',
        'Current Plan version does not match the saved Plan'
      );
    }

    let replacementPlanId: string | null =
      null;

    if (input.status === 'active') {
      if (
        input.currentVersion
          .sourceRevision !==
        input.currentEvidence
          .baselineRevision
      ) {
        const comparison =
          input.currentVersion
            .evidenceSummary
            ? comparePlanEvidence(
                input.currentVersion
                  .evidenceSummary,
                input.currentEvidence
              )
            : null;

        const changeCount =
          comparison?.changes.length ?? 0;

        throw new PlanWorkspaceError(
          'stale_baseline',
          changeCount > 0
            ? `Plan evidence is stale with ${changeCount} material change${changeCount === 1 ? '' : 's'}`
            : 'Plan evidence is stale and must be revised before activation'
        );
      }

      const overlaps =
        findOverlappingActivePlans(
          await repository.listPlans(
            userId
          ),
          input.plan
        );

      if (overlaps.length > 1) {
        throw new PlanWorkspaceError(
          'overlapping_active_plan',
          'More than one active Plan overlaps this period and must be resolved separately'
        );
      }

      if (overlaps.length === 1) {
        if (
          input.replacementPlanId !==
          overlaps[0].id
        ) {
          throw new PlanWorkspaceError(
            'overlapping_active_plan',
            `Active Plan "${overlaps[0].title}" overlaps this period`
          );
        }

        replacementPlanId =
          overlaps[0].id;
      } else if (
        input.replacementPlanId !== null
      ) {
        throw new PlanWorkspaceError(
          'invalid_input',
          'No overlapping active Plan exists to replace'
        );
      }
    } else if (
      input.replacementPlanId !== null
    ) {
      throw new PlanWorkspaceError(
        'invalid_input',
        'Only activation can replace an overlapping Plan'
      );
    }

    return repository.updatePlanLifecycle(
      userId,
      input.plan.id,
      {
        status: input.status,
        occurredAt,
        replacedPlanId:
          replacementPlanId,
        expectedCurrentVersionId:
          input.currentVersion.id,
      }
    );
  };

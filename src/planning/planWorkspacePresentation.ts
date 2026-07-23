import type {
  PlanStatus,
  PlanVersion,
} from '../models/planning';

export type PlanLifecycleTarget = Exclude<
  PlanStatus,
  'draft'
>;

export const PLAN_STATUS_LABEL: Record<
  PlanStatus,
  string
> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

export const PLAN_LIFECYCLE_LABEL: Record<
  PlanLifecycleTarget,
  string
> = {
  active: 'Activate',
  completed: 'Complete',
  archived: 'Archive',
};

export const planLifecycleActions = (
  status: PlanStatus
): PlanLifecycleTarget[] => {
  switch (status) {
    case 'draft':
      return ['active', 'archived'];
    case 'active':
      return ['completed', 'archived'];
    case 'completed':
      return ['archived'];
    case 'archived':
      return [];
  }
};

export const PLAN_SAVED_STATE_COPY = {
  signedOut: {
    title: 'Cloud-saved Plans need an account',
    message:
      'Guest mode can review planning context and create a preview. Sign in to save and reopen Plan history.',
  },
  empty: {
    title: 'No saved Plans yet',
    message:
      'Create and review a Plan draft. Saving creates owner-only immutable version history.',
  },
  error: {
    title: 'Saved Plans unavailable',
    message:
      'PerFin OS could not read saved Plans. Check the connection and try again.',
  },
  loading: 'Loading saved Plans...',
} as const;

export const PLAN_VERSION_EMPTY_COPY = {
  allocations: 'No allocations in this version.',
  commitments: 'No commitments in this version.',
  recommendations: 'No recommendations in this version.',
  proposals: 'No pending proposals in this version.',
  appliedActions:
    'No applied actions are recorded for this version.',
  legacyEvidence:
    'This older version keeps its baseline revision, but an aggregated evidence summary was not stored. It remains readable and can be revised without a provider request.',
  manualGeneration:
    'This version was created manually. No model request was made.',
} as const;

export const planVersionPresentationState = (
  version: PlanVersion
) => ({
  hasEvidenceSummary:
    version.evidenceSummary != null,
  hasGenerationMetadata:
    version.generation != null,
  emptySections: {
    allocations:
      version.allocations.length === 0,
    commitments:
      version.commitments.length === 0,
    recommendations:
      version.recommendations.length === 0,
    proposals:
      version.actionProposals.length === 0,
  },
});

export const shouldApplySavedPlansResult =
  ({
    requestId,
    latestRequestId,
    requestedUserId,
    currentUserId,
  }: {
    requestId: number;
    latestRequestId: number;
    requestedUserId: string;
    currentUserId: string | null;
  }): boolean =>
    requestId === latestRequestId &&
    requestedUserId === currentUserId;

export const planWorkspaceOwnershipKey =
  (
    userId: string | null
  ): string =>
    userId
      ? `plan-owner:${userId}`
      : 'plan-owner:signed-out';

export const planDetailOwnershipKey = (
  userId: string,
  planId: string
): string =>
  `${planWorkspaceOwnershipKey(
    userId
  )}:plan:${planId}`;

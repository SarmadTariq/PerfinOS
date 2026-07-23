export const PLAN_SYNTHETIC_PROFILE_IDS = [
  'empty',
  'partial',
  'low_income',
  'negative_cash_flow',
  'high_recurring_load',
  'budget_pressure',
  'savings_goal',
  'no_place',
  'stale_evidence',
  'conflicting_active_plan',
] as const;

export type PlanSyntheticProfileId =
  (typeof PLAN_SYNTHETIC_PROFILE_IDS)[number];

export type PlanReleaseCheckStatus =
  | 'pass'
  | 'fail'
  | 'unknown';

export interface PlanReleaseCheck {
  id: string;
  label: string;
  status: PlanReleaseCheckStatus;
  requiredForLocalReview: boolean;
  evidence: string;
}

export interface PlanReleaseDecision {
  localReviewStatus:
    | 'ready_for_human_review'
    | 'blocked';
  productionReleaseStatus:
    'blocked';
  blockers: PlanReleaseCheck[];
  unknowns: PlanReleaseCheck[];
}

export const evaluatePlanReleaseChecks = (
  checks: readonly PlanReleaseCheck[]
): PlanReleaseDecision => {
  const blockers = checks.filter(
    (check) =>
      check.status === 'fail' ||
      (
        check.requiredForLocalReview &&
        check.status !== 'pass'
      )
  );
  const unknowns = checks.filter(
    (check) => check.status === 'unknown'
  );

  return {
    localReviewStatus:
      blockers.length === 0
        ? 'ready_for_human_review'
        : 'blocked',
    productionReleaseStatus: 'blocked',
    blockers,
    unknowns,
  };
};

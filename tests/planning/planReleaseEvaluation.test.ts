import { describe, expect, it } from 'vitest';
import {
  evaluatePlanReleaseChecks,
  PLAN_SYNTHETIC_PROFILE_IDS,
} from '../../src/planning/planReleaseEvaluation';

describe('PF-213 Plan release evidence', () => {
  it('keeps the required synthetic profile inventory complete and unique', () => {
    expect(PLAN_SYNTHETIC_PROFILE_IDS).toEqual([
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
    ]);
    expect(new Set(PLAN_SYNTHETIC_PROFILE_IDS).size).toBe(
      PLAN_SYNTHETIC_PROFILE_IDS.length
    );
  });

  it('allows local human review while production remains blocked by unknowns', () => {
    expect(
      evaluatePlanReleaseChecks([
        {
          id: 'automated',
          label: 'Automated Plan gates',
          status: 'pass',
          requiredForLocalReview: true,
          evidence: 'npm run test:pf213',
        },
        {
          id: 'provider-retention',
          label: 'Provider project retention configuration',
          status: 'unknown',
          requiredForLocalReview: false,
          evidence: 'Console access not used',
        },
      ])
    ).toMatchObject({
      localReviewStatus: 'ready_for_human_review',
      productionReleaseStatus: 'blocked',
      blockers: [],
      unknowns: [{ id: 'provider-retention' }],
    });
  });

  it('blocks local review when a required gate fails or is unknown', () => {
    const decision = evaluatePlanReleaseChecks([
      {
        id: 'privacy',
        label: 'Plan privacy tests',
        status: 'fail',
        requiredForLocalReview: true,
        evidence: 'test failure',
      },
      {
        id: 'typecheck',
        label: 'Typecheck',
        status: 'unknown',
        requiredForLocalReview: true,
        evidence: 'not run',
      },
    ]);

    expect(decision.localReviewStatus).toBe('blocked');
    expect(decision.blockers.map((check) => check.id)).toEqual([
      'privacy',
      'typecheck',
    ]);
  });
});

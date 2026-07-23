import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PLAN_COACH_INPUT_MAX_LENGTH,
  PLAN_CREATION_STEPS,
  PLAN_CREATION_STEP_COUNT,
  acceptPlanDataUse,
  advancePlanCreationStep,
  canInvokePlanAI,
  completePlanGeneration,
  createPlanCreationState,
  failPlanGeneration,
  getPlanAIGuardReason,
  getPlanCreationProgress,
  markPlanDraftReviewed,
  markPlanDraftSaved,
  PlanCreationFlowError,
  reviewPlanFinancialContext,
  setPlanCoachInput,
  setPlanConstraints,
  setPlanCreationHorizon,
  setPlanPrimaryGoal,
  startPlanGeneration,
} from '../../src/planning/planCreationFlow';

const baselineRevision =
  `pe1-${'a'.repeat(32)}`;

const prepareGenerationState =
  () => {
    let state =
      createPlanCreationState(
        'authenticated'
      );

    state =
      setPlanCreationHorizon(
        state,
        {
          kind:
            'current_month',
        }
      );

    state =
      reviewPlanFinancialContext(
        state,
        baselineRevision
      );

    state =
      acceptPlanDataUse(
        state,
        true
      );

    state =
      setPlanPrimaryGoal(
        state,
        'Reduce discretionary spending'
      );

    return state;
  };

describe(
  'PF-210 Plan creation flow',
  () => {
    it(
      'defines exactly ten ordered steps',
      () => {
        expect(
          PLAN_CREATION_STEP_COUNT
        ).toBe(10);

        expect(
          PLAN_CREATION_STEPS
        ).toEqual([
          'overview',
          'horizon',
          'financial_context',
          'data_use',
          'primary_goal',
          'constraints',
          'coach_input',
          'generate',
          'review',
          'save',
        ]);
      }
    );

    it(
      'requires a valid selected month',
      () => {
        const state =
          createPlanCreationState(
            'authenticated'
          );

        expect(() =>
          setPlanCreationHorizon(
            state,
            {
              kind:
                'selected_month',
            }
          )
        ).toThrow(
          PlanCreationFlowError
        );

        expect(() =>
          setPlanCreationHorizon(
            state,
            {
              kind:
                'selected_month',

              selectedMonth:
                '2026-13',
            }
          )
        ).toThrow(
          PlanCreationFlowError
        );

        expect(() =>
          setPlanCreationHorizon(
            state,
            {
              kind:
                'selected_month',

              selectedMonth:
                '2026-08',

              latestAllowedMonth:
                '2026-07',
            }
          )
        ).toThrow(
          PlanCreationFlowError
        );
      }
    );

    it(
      'gates AI until context, disclosure, and goal are complete',
      () => {
        let state =
          createPlanCreationState(
            'authenticated'
          );

        expect(
          getPlanAIGuardReason(
            state
          )
        ).toBe(
          'horizon_required'
        );

        state =
          setPlanCreationHorizon(
            state,
            {
              kind:
                '14_days',
            }
          );

        expect(
          getPlanAIGuardReason(
            state
          )
        ).toBe(
          'context_review_required'
        );

        state =
          reviewPlanFinancialContext(
            state,
            baselineRevision
          );

        expect(
          getPlanAIGuardReason(
            state
          )
        ).toBe(
          'data_use_required'
        );

        state =
          acceptPlanDataUse(
            state,
            true
          );

        expect(
          getPlanAIGuardReason(
            state
          )
        ).toBe(
          'goal_required'
        );

        state =
          setPlanPrimaryGoal(
            state,
            'Build a weekly spending plan'
          );

        expect(
          canInvokePlanAI(
            state
          )
        ).toBe(true);
      }
    );

    it(
      'never lets a guest invoke AI',
      () => {
        let state =
          createPlanCreationState(
            'guest'
          );

        state =
          setPlanCreationHorizon(
            state,
            {
              kind:
                '7_days',
            }
          );

        state =
          reviewPlanFinancialContext(
            state,
            baselineRevision
          );

        state =
          acceptPlanDataUse(
            state,
            true
          );

        state =
          setPlanPrimaryGoal(
            state,
            'Review the next seven days'
          );

        expect(
          getPlanAIGuardReason(
            state
          )
        ).toBe(
          'account_required'
        );

        expect(() =>
          startPlanGeneration(
            state
          )
        ).toThrow(
          PlanCreationFlowError
        );
      }
    );

    it(
      'completes the ten-step flow in order',
      () => {
        let state =
          createPlanCreationState(
            'authenticated'
          );

        state =
          advancePlanCreationStep(
            state
          );

        expect(
          state.currentStep
        ).toBe('horizon');

        state =
          setPlanCreationHorizon(
            state,
            {
              kind:
                'current_month',
            }
          );

        state =
          advancePlanCreationStep(
            state
          );

        state =
          reviewPlanFinancialContext(
            state,
            baselineRevision
          );

        state =
          advancePlanCreationStep(
            state
          );

        state =
          acceptPlanDataUse(
            state,
            true
          );

        state =
          advancePlanCreationStep(
            state
          );

        state =
          setPlanPrimaryGoal(
            state,
            'Reduce avoidable spending'
          );

        state =
          advancePlanCreationStep(
            state
          );

        state =
          setPlanConstraints(
            state,
            [
              'Keep housing unchanged',
            ]
          );

        state =
          advancePlanCreationStep(
            state
          );

        state =
          setPlanCoachInput(
            state,
            'Focus on flexible categories.'
          );

        state =
          advancePlanCreationStep(
            state
          );

        state =
          startPlanGeneration(
            state
          );

        state =
          completePlanGeneration(
            state
          );

        state =
          advancePlanCreationStep(
            state
          );

        state =
          markPlanDraftReviewed(
            state
          );

        state =
          advancePlanCreationStep(
            state
          );

        state =
          markPlanDraftSaved(
            state
          );

        expect(
          state.currentStep
        ).toBe('save');

        expect(
          state.draftSaved
        ).toBe(true);

        expect(
          getPlanCreationProgress(
            state
          ).percent
        ).toBe(100);
      }
    );

    it(
      'preserves a recoverable provider failure',
      () => {
        let state =
          prepareGenerationState();

        state =
          startPlanGeneration(
            state
          );

        state =
          failPlanGeneration(
            state,
            'rate_limited',
            'RATE_LIMITED'
          );

        expect(state)
          .toMatchObject({
            generationStatus:
              'rate_limited',

            generationErrorCode:
              'RATE_LIMITED',

            hasStructuredDraft:
              false,

            financialContextReviewed:
              true,

            dataUseAccepted:
              true,
          });
      }
    );

    it(
      'rejects free text above the bounded limit',
      () => {
        const state =
          createPlanCreationState(
            'authenticated'
          );

        expect(() =>
          setPlanCoachInput(
            state,
            'a'.repeat(
              PLAN_COACH_INPUT_MAX_LENGTH +
                1
            )
          )
        ).toThrow(
          PlanCreationFlowError
        );
      }
    );

    it(
      'requires review before saving',
      () => {
        let state =
          prepareGenerationState();

        state =
          startPlanGeneration(
            state
          );

        state =
          completePlanGeneration(
            state
          );

        expect(() =>
          markPlanDraftSaved(
            state
          )
        ).toThrow(
          PlanCreationFlowError
        );
      }
    );
  }
);

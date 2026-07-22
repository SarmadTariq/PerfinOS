export const PLAN_CREATION_STEPS = [
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
] as const;

export type PlanCreationStepId =
  typeof PLAN_CREATION_STEPS[number];

export const PLAN_CREATION_STEP_COUNT =
  PLAN_CREATION_STEPS.length;

export type PlanCreationActor =
  | 'authenticated'
  | 'guest';

export type PlanCreationHorizon =
  | '7_days'
  | '14_days'
  | 'current_month'
  | 'selected_month';

export type PlanCreationGenerationStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'rate_limited'
  | 'validation_failed'
  | 'unavailable'
  | 'error';

export type PlanAIGuardReason =
  | 'account_required'
  | 'horizon_required'
  | 'context_review_required'
  | 'data_use_required'
  | 'goal_required'
  | 'generation_in_progress';

export type PlanCreationFlowErrorCode =
  | PlanAIGuardReason
  | 'selected_month_required'
  | 'selected_month_invalid'
  | 'selected_month_future'
  | 'baseline_revision_invalid'
  | 'primary_goal_invalid'
  | 'constraints_invalid'
  | 'coach_input_invalid'
  | 'generation_result_required'
  | 'draft_review_required'
  | 'invalid_generation_failure'
  | 'step_incomplete'
  | 'flow_complete';

export class PlanCreationFlowError
  extends Error {
  constructor(
    readonly code:
      PlanCreationFlowErrorCode
  ) {
    super(code);
  }
}

export interface PlanCreationState {
  readonly actor:
    PlanCreationActor;

  readonly currentStep:
    PlanCreationStepId;

  readonly horizon:
    PlanCreationHorizon | null;

  readonly selectedMonth:
    string | null;

  readonly baselineRevision:
    string | null;

  readonly financialContextReviewed:
    boolean;

  readonly dataUseAccepted:
    boolean;

  readonly primaryGoal:
    string;

  readonly constraints:
    readonly string[];

  readonly coachInput:
    string;

  readonly generationStatus:
    PlanCreationGenerationStatus;

  readonly generationErrorCode:
    string | null;

  readonly hasStructuredDraft:
    boolean;

  readonly draftReviewed:
    boolean;

  readonly draftSaved:
    boolean;
}

export interface PlanCreationHorizonInput {
  readonly kind:
    PlanCreationHorizon;

  readonly selectedMonth?:
    string | null;

  readonly latestAllowedMonth?:
    string | null;
}

export interface PlanCreationProgress {
  readonly step:
    PlanCreationStepId;

  readonly stepNumber:
    number;

  readonly totalSteps:
    number;

  readonly percent:
    number;
}

const MONTH_KEY_PATTERN =
  /^\d{4}-(0[1-9]|1[0-2])$/;

const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const normalizedText = (
  value: string,
  maximumLength: number,
  errorCode:
    PlanCreationFlowErrorCode,
  minimumLength = 0
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
    throw new PlanCreationFlowError(
      errorCode
    );
  }

  return normalized;
};

const currentStepIndex = (
  state:
    PlanCreationState
): number =>
  PLAN_CREATION_STEPS.indexOf(
    state.currentStep
  );

export const createPlanCreationState =
  (
    actor:
      PlanCreationActor
  ): PlanCreationState => ({
    actor,

    currentStep:
      'overview',

    horizon:
      null,

    selectedMonth:
      null,

    baselineRevision:
      null,

    financialContextReviewed:
      false,

    dataUseAccepted:
      false,

    primaryGoal:
      '',

    constraints:
      [],

    coachInput:
      '',

    generationStatus:
      'idle',

    generationErrorCode:
      null,

    hasStructuredDraft:
      false,

    draftReviewed:
      false,

    draftSaved:
      false,
  });

export const resetPlanCreationState =
  (
    state:
      PlanCreationState
  ): PlanCreationState =>
  createPlanCreationState(
    state.actor
  );

export const setPlanCreationHorizon =
  (
    state:
      PlanCreationState,
    input:
      PlanCreationHorizonInput
  ): PlanCreationState => {
    if (
      input.kind !==
      'selected_month'
    ) {
      return {
        ...state,

        horizon:
          input.kind,

        selectedMonth:
          null,
      };
    }

    const selectedMonth =
      input.selectedMonth
        ?.trim() ??
      '';

    if (!selectedMonth) {
      throw new PlanCreationFlowError(
        'selected_month_required'
      );
    }

    if (
      !MONTH_KEY_PATTERN.test(
        selectedMonth
      )
    ) {
      throw new PlanCreationFlowError(
        'selected_month_invalid'
      );
    }

    const latestAllowedMonth =
      input.latestAllowedMonth
        ?.trim() ??
      null;

    if (
      latestAllowedMonth !==
        null &&
      (
        !MONTH_KEY_PATTERN.test(
          latestAllowedMonth
        ) ||
        selectedMonth >
          latestAllowedMonth
      )
    ) {
      throw new PlanCreationFlowError(
        'selected_month_future'
      );
    }

    return {
      ...state,

      horizon:
        'selected_month',

      selectedMonth,
    };
  };

export const reviewPlanFinancialContext =
  (
    state:
      PlanCreationState,
    baselineRevision: string
  ): PlanCreationState => ({
    ...state,

    baselineRevision:
      normalizedText(
        baselineRevision,
        128,
        'baseline_revision_invalid',
        1
      ),

    financialContextReviewed:
      true,

    hasStructuredDraft:
      false,

    draftReviewed:
      false,

    draftSaved:
      false,
  });

export const acceptPlanDataUse =
  (
    state:
      PlanCreationState,
    accepted: boolean
  ): PlanCreationState => ({
    ...state,

    dataUseAccepted:
      accepted,
  });

export const setPlanPrimaryGoal =
  (
    state:
      PlanCreationState,
    goal: string
  ): PlanCreationState => ({
    ...state,

    primaryGoal:
      normalizedText(
        goal,
        160,
        'primary_goal_invalid',
        3
      ),

    hasStructuredDraft:
      false,

    draftReviewed:
      false,

    draftSaved:
      false,
  });

export const setPlanConstraints =
  (
    state:
      PlanCreationState,
    constraints:
      readonly string[]
  ): PlanCreationState => {
    if (
      constraints.length >
      5
    ) {
      throw new PlanCreationFlowError(
        'constraints_invalid'
      );
    }

    const normalized =
      constraints
        .map(
          (constraint) =>
            normalizedText(
              constraint,
              120,
              'constraints_invalid'
            )
        )
        .filter(Boolean);

    return {
      ...state,

      constraints:
        normalized,

      hasStructuredDraft:
        false,

      draftReviewed:
        false,

      draftSaved:
        false,
    };
  };

export const setPlanCoachInput =
  (
    state:
      PlanCreationState,
    coachInput: string
  ): PlanCreationState => ({
    ...state,

    coachInput:
      normalizedText(
        coachInput,
        2_000,
        'coach_input_invalid'
      ),

    hasStructuredDraft:
      false,

    draftReviewed:
      false,

    draftSaved:
      false,
  });

export const getPlanAIGuardReason =
  (
    state:
      PlanCreationState
  ): PlanAIGuardReason | null => {
    if (
      state.actor ===
      'guest'
    ) {
      return 'account_required';
    }

    if (!state.horizon) {
      return 'horizon_required';
    }

    if (
      !state
        .financialContextReviewed ||
      !state.baselineRevision
    ) {
      return 'context_review_required';
    }

    if (
      !state.dataUseAccepted
    ) {
      return 'data_use_required';
    }

    if (
      !state.primaryGoal
    ) {
      return 'goal_required';
    }

    if (
      state.generationStatus ===
      'loading'
    ) {
      return 'generation_in_progress';
    }

    return null;
  };

export const canInvokePlanAI =
  (
    state:
      PlanCreationState
  ): boolean =>
  getPlanAIGuardReason(
    state
  ) === null;

export const startPlanGeneration =
  (
    state:
      PlanCreationState
  ): PlanCreationState => {
    const guard =
      getPlanAIGuardReason(
        state
      );

    if (guard) {
      throw new PlanCreationFlowError(
        guard
      );
    }

    return {
      ...state,

      generationStatus:
        'loading',

      generationErrorCode:
        null,

      hasStructuredDraft:
        false,

      draftReviewed:
        false,

      draftSaved:
        false,
    };
  };

export const completePlanGeneration =
  (
    state:
      PlanCreationState
  ): PlanCreationState => {
    if (
      state.generationStatus !==
      'loading'
    ) {
      throw new PlanCreationFlowError(
        'generation_result_required'
      );
    }

    return {
      ...state,

      generationStatus:
        'success',

      generationErrorCode:
        null,

      hasStructuredDraft:
        true,

      draftReviewed:
        false,

      draftSaved:
        false,
    };
  };

export const failPlanGeneration =
  (
    state:
      PlanCreationState,
    status:
      Exclude<
        PlanCreationGenerationStatus,
        | 'idle'
        | 'loading'
        | 'success'
      >,
    errorCode: string
  ): PlanCreationState => {
    if (
      ![
        'rate_limited',
        'validation_failed',
        'unavailable',
        'error',
      ].includes(status)
    ) {
      throw new PlanCreationFlowError(
        'invalid_generation_failure'
      );
    }

    return {
      ...state,

      generationStatus:
        status,

      generationErrorCode:
        normalizedText(
          errorCode,
          80,
          'invalid_generation_failure',
          1
        ),

      hasStructuredDraft:
        false,

      draftReviewed:
        false,

      draftSaved:
        false,
    };
  };

export const markPlanDraftReviewed =
  (
    state:
      PlanCreationState
  ): PlanCreationState => {
    if (
      !state.hasStructuredDraft ||
      state.generationStatus !==
        'success'
    ) {
      throw new PlanCreationFlowError(
        'generation_result_required'
      );
    }

    return {
      ...state,

      draftReviewed:
        true,

      draftSaved:
        false,
    };
  };

export const markPlanDraftSaved =
  (
    state:
      PlanCreationState
  ): PlanCreationState => {
    if (
      state.actor ===
      'guest'
    ) {
      throw new PlanCreationFlowError(
        'account_required'
      );
    }

    if (!state.draftReviewed) {
      throw new PlanCreationFlowError(
        'draft_review_required'
      );
    }

    return {
      ...state,

      draftSaved:
        true,
    };
  };

export const isPlanCreationStepComplete =
  (
    state:
      PlanCreationState,
    step:
      PlanCreationStepId =
        state.currentStep
  ): boolean => {
    switch (step) {
      case 'overview':
        return true;

      case 'horizon':
        return (
          state.horizon !==
            null &&
          (
            state.horizon !==
              'selected_month' ||
            state.selectedMonth !==
              null
          )
        );

      case 'financial_context':
        return (
          state
            .financialContextReviewed &&
          state.baselineRevision !==
            null
        );

      case 'data_use':
        return state
          .dataUseAccepted;

      case 'primary_goal':
        return state
          .primaryGoal
          .length >= 3;

      case 'constraints':
      case 'coach_input':
        return true;

      case 'generate':
        return (
          state
            .hasStructuredDraft &&
          state
            .generationStatus ===
            'success'
        );

      case 'review':
        return state
          .draftReviewed;

      case 'save':
        return state
          .draftSaved;
    }
  };

export const advancePlanCreationStep =
  (
    state:
      PlanCreationState
  ): PlanCreationState => {
    if (
      !isPlanCreationStepComplete(
        state
      )
    ) {
      throw new PlanCreationFlowError(
        'step_incomplete'
      );
    }

    const index =
      currentStepIndex(
        state
      );

    if (
      index >=
      PLAN_CREATION_STEP_COUNT -
        1
    ) {
      throw new PlanCreationFlowError(
        'flow_complete'
      );
    }

    return {
      ...state,

      currentStep:
        PLAN_CREATION_STEPS[
          index + 1
        ],
    };
  };

export const returnToPreviousPlanCreationStep =
  (
    state:
      PlanCreationState
  ): PlanCreationState => {
    const index =
      currentStepIndex(
        state
      );

    if (index <= 0) {
      return state;
    }

    return {
      ...state,

      currentStep:
        PLAN_CREATION_STEPS[
          index - 1
        ],
    };
  };

export const getPlanCreationProgress =
  (
    state:
      PlanCreationState
  ): PlanCreationProgress => {
    const index =
      currentStepIndex(
        state
      );

    return {
      step:
        state.currentStep,

      stepNumber:
        index + 1,

      totalSteps:
        PLAN_CREATION_STEP_COUNT,

      percent:
        Math.round(
          (
            index /
            (
              PLAN_CREATION_STEP_COUNT -
              1
            )
          ) *
          100
        ),
    };
  };

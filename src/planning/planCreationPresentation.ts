import type {
  PlanAIGuardReason,
  PlanCreationGenerationStatus,
  PlanCreationStepId,
} from './planCreationFlow';

export interface PlanCreationStepPresentation {
  readonly eyebrow: string;

  readonly title: string;

  readonly description: string;
}

export const PLAN_CREATION_STEP_PRESENTATION:
  Record<
    PlanCreationStepId,
    PlanCreationStepPresentation
  > = {
    overview: {
      eyebrow:
        'Before you begin',

      title:
        'Build a Plan from verified activity',

      description:
        'Choose a period, review the financial evidence, and decide what you want this Plan to help with.',
    },

    horizon: {
      eyebrow:
        'Step 2',

      title:
        'Choose the planning period',

      description:
        'Use seven days, fourteen days, the current month, or one selected calendar month.',
    },

    financial_context: {
      eyebrow:
        'Step 3',

      title:
        'Review the financial context',

      description:
        'These values are calculated by PerFin OS before any AI request. Gemini cannot replace them.',
    },

    data_use: {
      eyebrow:
        'Step 4',

      title:
        'Confirm what will be shared',

      description:
        'Only the bounded evidence snapshot, your goal, constraints, and coach message can enter the secure Plan request.',
    },

    primary_goal: {
      eyebrow:
        'Step 5',

      title:
        'Choose the primary goal',

      description:
        'Give this Plan one clear outcome. You can manually edit the generated draft later.',
    },

    constraints: {
      eyebrow:
        'Step 6',

      title:
        'Set planning boundaries',

      description:
        'Select anything that should remain protected while the draft is prepared.',
    },

    coach_input: {
      eyebrow:
        'Step 7',

      title:
        'Add optional coach context',

      description:
        'Do not enter account numbers, passwords, receipts, addresses, tax IDs, or other sensitive information.',
    },

    generate: {
      eyebrow:
        'Step 8',

      title:
        'Generate a structured draft',

      description:
        'The secure Worker will request proposal-only guidance grounded in the reviewed evidence.',
    },

    review: {
      eyebrow:
        'Step 9',

      title:
        'Review and edit the draft',

      description:
        'AI suggestions remain editable. No budget, savings, recurring, or transaction action is applied here.',
    },

    save: {
      eyebrow:
        'Step 10',

      title:
        'Save the draft Plan',

      description:
        'A saved draft remains separate from confirmed financial actions.',
    },
  };

export const planAIGuardCopy = (
  reason:
    PlanAIGuardReason | null
): string | null => {
  switch (reason) {
    case 'account_required':
      return 'A signed-in account is required for secure AI generation and cloud-saved Plan drafts.';

    case 'horizon_required':
      return 'Choose a planning period first.';

    case 'context_review_required':
      return 'Review the deterministic financial context first.';

    case 'data_use_required':
      return 'Confirm the bounded data-use disclosure first.';

    case 'goal_required':
      return 'Add a primary planning goal first.';

    case 'generation_in_progress':
      return 'A Plan draft is already being generated.';

    case null:
      return null;
  }
};

export const planGenerationStatusCopy = (
  status:
    PlanCreationGenerationStatus
): string => {
  switch (status) {
    case 'idle':
      return 'Ready when the required steps are complete.';

    case 'loading':
      return 'Generating a structured draft from the reviewed evidence.';

    case 'success':
      return 'The structured draft passed validation and is ready for review.';

    case 'rate_limited':
      return 'The secure Plan service is busy. Your completed inputs remain available.';

    case 'validation_failed':
      return 'The generated response did not pass Plan validation. Nothing was saved or applied.';

    case 'unavailable':
      return 'Plan generation is temporarily unavailable. Existing saved Plans remain available.';

    case 'error':
      return 'The draft could not be generated. Your completed inputs remain available.';
  }
};

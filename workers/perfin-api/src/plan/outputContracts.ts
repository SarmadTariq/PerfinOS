export const PLAN_OUTPUT_SCHEMA_VERSION =
  1 as const;

export const PLAN_PROMPT_VERSION =
  'plan-prompt-v1' as const;

export const PLAN_RESPONSE_SCHEMA_VERSION =
  'plan-response-v1' as const;

export type PlanStructuredAction =
  | 'turn'
  | 'generate'
  | 'revise';

export type PlanStructuredPeriodKind =
  | '7_days'
  | '14_days'
  | 'current_month'
  | 'calendar_month';

export type PlanStructuredPriority =
  | 'low'
  | 'medium'
  | 'high';

export type PlanStructuredAllocationPeriod =
  | 'plan'
  | 'week'
  | 'month';

export type PlanStructuredActionProposalType =
  | 'budget_adjustment'
  | 'savings_contribution'
  | 'recurring_review';

export type PlanStructuredWarningCode =
  | 'EVIDENCE_INSUFFICIENT'
  | 'EVIDENCE_PARTIAL'
  | 'EXPECTED_INCOME_UNAVAILABLE'
  | 'BUDGET_UNAVAILABLE'
  | 'SAVINGS_GOALS_UNAVAILABLE'
  | 'RECURRING_COMMITMENTS_UNAVAILABLE'
  | 'LOCATION_EVIDENCE_UNAVAILABLE'
  | 'REQUEST_UNSUPPORTED'
  | 'PROFESSIONAL_GUIDANCE_REQUIRED';

export interface PlanStructuredObservation {
  readonly id: string;

  readonly statement: string;

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredAllocation {
  readonly id: string;

  readonly label: string;

  readonly categoryId:
    string | null;

  readonly amountMinor:
    number;

  readonly period:
    PlanStructuredAllocationPeriod;

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredCommitment {
  readonly id: string;

  readonly title: string;

  readonly description: string;

  readonly amountMinor:
    number | null;

  readonly dueDate:
    string | null;

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredRecommendation {
  readonly id: string;

  readonly title: string;

  readonly description: string;

  readonly priority:
    PlanStructuredPriority;

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredActionProposal {
  readonly id: string;

  readonly type:
    PlanStructuredActionProposalType;

  readonly title: string;

  readonly description: string;

  readonly targetEntityId:
    string | null;

  readonly proposedAmountMinor:
    number | null;

  readonly effectiveDate:
    string | null;

  readonly requiresConfirmation:
    true;

  readonly executionState:
    'proposal_only';

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredWarning {
  readonly id: string;

  readonly code:
    PlanStructuredWarningCode;

  readonly message: string;

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredOutput {
  readonly schemaVersion:
    typeof PLAN_OUTPUT_SCHEMA_VERSION;

  readonly action:
    PlanStructuredAction;

  readonly baselineRevision:
    string;

  readonly currency: string;

  readonly periodKind:
    PlanStructuredPeriodKind;

  readonly summary: string;

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

export interface PlanGenerationMetadata {
  readonly modelId: string;

  readonly promptVersion:
    typeof PLAN_PROMPT_VERSION;

  readonly responseSchemaVersion:
    typeof PLAN_RESPONSE_SCHEMA_VERSION;

  readonly outputSchemaVersion:
    typeof PLAN_OUTPUT_SCHEMA_VERSION;

  readonly attemptCount: number;

  readonly generatedAt: string;
}

export interface ValidatedPlanProviderResult {
  readonly output:
    PlanStructuredOutput;

  readonly metadata:
    PlanGenerationMetadata;

  readonly validationState:
    'valid';
}

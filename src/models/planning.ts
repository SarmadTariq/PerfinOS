export type PlanStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'archived';

export type PlanHorizon =
  | '7_days'
  | '14_days'
  | 'monthly';

export type PlanSource =
  | 'user'
  | 'deterministic'
  | 'ai_assisted';

export type PlanPriority =
  | 'low'
  | 'medium'
  | 'high';

export type PlanValidationState =
  | 'pending'
  | 'valid'
  | 'invalid';

export interface PlanValidationMetadata {
  schemaVersion: 1;
  state: PlanValidationState;
  validatedAt: string | null;
  errors: string[];
  warnings: string[];
}

export interface PlanGenerationProvenance {
  modelId: string;
  promptVersion: string;
  responseSchemaVersion: string;
  outputSchemaVersion: 1;
  attemptCount: number;
  generatedAt: string;
}

export interface PlanEvidenceSummary {
  schemaVersion: 1;
  baselineRevision: string;
  periodStartDate: string;
  periodEndDate: string;
  currency: string;
  currencyFractionDigits: number;
  coverageStatus:
    | 'complete'
    | 'partial'
    | 'insufficient';
  transactionCount: number;
  recordedIncomeMinor: number;
  recordedExpensesMinor: number;
  netCashFlowMinor: number;
  projectedRecurringCommitmentsMinor: number;
  budgetTotalMinor: number | null;
  savingsRemainingMinor: number;
  componentRevisions?: {
    expectedIncome: string;
    categories: string;
    recurring: string;
    savings: string;
    locations: string;
    coverage: string;
  };
}

export interface PlanAssumption {
  id: string;
  key: string;
  label: string;
  value: number;
  unit: 'currency' | 'percent' | 'days' | 'count';
  source: PlanSource;
  rationale: string | null;
}

export interface PlanAllocation {
  id: string;
  label: string;
  categoryId: string | null;
  amount: number;
  period: 'plan' | 'week' | 'month';
}

export interface PlanCommitment {
  id: string;
  title: string;
  description: string;
  amount: number | null;
  dueDate: string | null;
}

export interface PlanRecommendation {
  id: string;
  title: string;
  description: string;
  priority: PlanPriority;
  source: PlanSource;
  evidenceRefs: string[];
}

export type PlanActionProposalType =
  | 'budget_adjustment'
  | 'savings_contribution'
  | 'recurring_review'
  | 'custom';

export interface PlanActionProposal {
  id: string;
  schemaVersion?: 1 | 2;
  type: PlanActionProposalType;
  title: string;
  description: string;
  targetEntityId: string | null;
  proposedAmount: number | null;
  effectiveDate: string | null;
  evidenceRefs?: string[];
  requiresConfirmation: true;
  executionState: 'proposal_only';
}

export interface PlanActionRuleBinding {
  schemaVersion: 2;
  type: PlanActionProposalType;
  targetEntityId: string | null;
  proposedAmount: number | null;
  effectiveMonth: string;
}

export type PlanActionType =
  | 'total_budget_update'
  | 'category_budget_update'
  | 'savings_goal_create'
  | 'savings_goal_update';

export type PlanActionTargetKind =
  | 'budget'
  | 'category_budget'
  | 'savings_goal';

export type PlanActionResultStatus =
  | 'success'
  | 'blocked'
  | 'canceled'
  | 'partial_failure'
  | 'non_retryable_failure';

export type PlanActionFailureCode =
  | 'authentication_required'
  | 'unsupported_action'
  | 'confirmation_required'
  | 'inactive_plan'
  | 'historical_version'
  | 'stale_evidence'
  | 'currency_mismatch'
  | 'target_missing'
  | 'target_unauthorized'
  | 'current_value_changed'
  | 'amount_out_of_bounds'
  | 'invalid_request'
  | 'idempotency_conflict'
  | 'write_failed'
  | null;

export interface PlanActionResult {
  schemaVersion: 1;
  id: string;
  userId: string;
  planId: string;
  sourceVersionId: string;
  proposalId: string;
  previewFingerprint: string;
  selectionDigest: string;
  actionType: PlanActionType;
  targetKind: PlanActionTargetKind;
  targetId: string;
  financeDocumentId: string;
  targetMonth: string | null;
  /** Legacy compatibility only. New action results do not persist this field. */
  legacyEntityIndex?: number;
  workspaceRevision?: number;
  postWorkspaceRevision?: number;
  status: PlanActionResultStatus;
  failureCode: PlanActionFailureCode;
  retryable: boolean;
  currency: string;
  beforeValueMinor: number | null;
  beforeValueMajor: number | null;
  changeValueMinor: number;
  changeValueMajor: number;
  proposedValueMinor: number;
  proposedValueMajor: number;
  confirmedEvidenceRevision: string;
  postEvidenceRevision: string;
  previewRevision: string;
  appliedAt: string;
}

export interface PlanActionState {
  schemaVersion: 1;
  id: 'current';
  userId: string;
  planId: string;
  sourceVersionId: string;
  acceptedEvidenceRevision: string;
  appliedProposalIds: string[];
  lastApplicationId: string;
  updatedAt: string;
}

export interface PlanVersion {
  id: string;
  userId: string;
  planId: string;
  versionNumber: number;
  createdAt: string;
  createdBy: PlanSource;
  sourceRevision: string;
  /** Workspace revision captured when this immutable version was persisted. */
  workspaceRevision?: number;
  evidenceSummary?: PlanEvidenceSummary | null;
  generation: PlanGenerationProvenance | null;
  summary: string;
  assumptions: PlanAssumption[];
  allocations: PlanAllocation[];
  commitments: PlanCommitment[];
  recommendations: PlanRecommendation[];
  actionProposals: PlanActionProposal[];
  actionProposalIds?: string[];
  actionProposalApplications?: Record<string, PlanActionRuleBinding>;
  validation: PlanValidationMetadata;
}

export interface FinancialPlan {
  id: string;
  userId: string;
  title: string;
  currency: string;
  horizon: PlanHorizon;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  currentVersionId: string;
  versionCount: number;
  replacedPlanId: string | null;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;
}

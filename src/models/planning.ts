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
  type: PlanActionProposalType;
  title: string;
  description: string;
  targetEntityId: string | null;
  proposedAmount: number | null;
  effectiveDate: string | null;
  requiresConfirmation: true;
  executionState: 'proposal_only';
}

export interface PlanVersion {
  id: string;
  userId: string;
  planId: string;
  versionNumber: number;
  createdAt: string;
  createdBy: PlanSource;
  sourceRevision: string;
  evidenceSummary?: PlanEvidenceSummary | null;
  generation: PlanGenerationProvenance | null;
  summary: string;
  assumptions: PlanAssumption[];
  allocations: PlanAllocation[];
  commitments: PlanCommitment[];
  recommendations: PlanRecommendation[];
  actionProposals: PlanActionProposal[];
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

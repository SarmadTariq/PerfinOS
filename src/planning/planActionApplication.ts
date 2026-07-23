import type {
  AppData,
  Budget,
  SavingsGoal,
} from '../models/finance';
import type {
  FinancialPlan,
  PlanActionFailureCode,
  PlanActionProposal,
  PlanActionTargetKind,
  PlanActionType,
  PlanVersion,
} from '../models/planning';
import {
  buildPlanEvidenceSnapshot,
  currencyFractionDigits,
  toMinorUnits,
} from './planEvidence';
import {
  planEvidenceHorizonForSavedPlan,
} from './planWorkspace';

const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ACTION_MINOR = 1_000_000_000_000;

export type PlanActionSelection =
  | {
      actionType: 'total_budget_update';
    }
  | {
      actionType: 'category_budget_update';
      categoryId: string;
    }
  | {
      actionType: 'savings_goal_create';
      goalId: string;
      goalName: string;
      targetAmountMinor: number;
      targetDate: string;
    }
  | {
      actionType: 'savings_goal_update';
      goalId: string;
    };

export interface PlanActionPreviewInput {
  userId: string | null;
  plan: FinancialPlan;
  version: PlanVersion;
  proposal: PlanActionProposal;
  data: AppData;
  selection: PlanActionSelection;
  acceptedEvidenceRevision?: string | null;
}

export interface PlanActionPreview {
  schemaVersion: 1;
  actionType: PlanActionType;
  targetKind: PlanActionTargetKind;
  targetId: string;
  targetLabel: string;
  targetMonth: string | null;
  currentValueMinor: number | null;
  changeValueMinor: number;
  proposedValueMinor: number;
  currency: string;
  evidenceRefs: string[];
  reason: string;
  expectedEffect: string;
  reversibility: string;
  sourceEvidenceRevision: string;
  currentEvidenceRevision: string;
  previewRevision: string;
  previewFingerprint: string;
  stale: boolean;
  blocked: boolean;
  failureCode: PlanActionFailureCode;
  failureMessage: string | null;
}

export class PlanActionValidationError extends Error {
  readonly code: Exclude<PlanActionFailureCode, null>;

  constructor(
    code: Exclude<PlanActionFailureCode, null>,
    message: string
  ) {
    super(message);
    this.name = 'PlanActionValidationError';
    this.code = code;
  }
}

const requireText = (
  value: string,
  code: Exclude<PlanActionFailureCode, null>,
  message: string
): string => {
  const normalized = value.trim();
  if (!normalized) throw new PlanActionValidationError(code, message);
  return normalized;
};

const boundedMinor = (
  value: number,
  label: string
): number => {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_ACTION_MINOR
  ) {
    throw new PlanActionValidationError(
      'amount_out_of_bounds',
      `${label} is outside the supported range.`
    );
  }
  return value;
};

const stableSerialize = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
    .join(',')}}`;
};

const deterministicHash = (value: string): string => {
  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489917);
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0)
    .toString(16)
    .padStart(8, '0')}`;
};

export const planActionSelectionDigest = (
  selection: PlanActionSelection
): string =>
  deterministicHash(
    stableSerialize(selection)
  );

const actionMonth = (
  proposal: PlanActionProposal,
  plan: FinancialPlan
): string => {
  const month = (proposal.effectiveDate || plan.startDate).slice(0, 7);
  if (!MONTH_KEY_PATTERN.test(month)) {
    throw new PlanActionValidationError(
      'invalid_request',
      'The proposal does not identify a valid budget month.'
    );
  }
  return month;
};

const isValidDateKey = (value: string): boolean => {
  if (!DATE_KEY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const proposalMinor = (
  proposal: PlanActionProposal,
  currency: string
): number => {
  if (proposal.proposedAmount === null) {
    throw new PlanActionValidationError(
      'invalid_request',
      'The proposal does not include a proposed value.'
    );
  }
  try {
    return boundedMinor(
      toMinorUnits(proposal.proposedAmount, currency),
      'The proposed value'
    );
  } catch (error) {
    if (error instanceof PlanActionValidationError) {
      throw error;
    }
    throw new PlanActionValidationError(
      'amount_out_of_bounds',
      'The proposed value is outside the supported range.'
    );
  }
};

const ownedBudget = (
  data: AppData,
  userId: string,
  month: string
): Budget => {
  const budget = data.budgets.find((candidate) => candidate.month === month);
  if (!budget) {
    throw new PlanActionValidationError(
      'target_missing',
      `No budget exists for ${month}.`
    );
  }
  if (budget.userId !== userId) {
    throw new PlanActionValidationError(
      'target_unauthorized',
      'The budget does not belong to the signed-in account.'
    );
  }
  return budget;
};

const ownedGoal = (
  data: AppData,
  userId: string,
  goalId: string
): SavingsGoal => {
  const goal = data.savingsGoals.find((candidate) => candidate.id === goalId);
  if (!goal) {
    throw new PlanActionValidationError(
      'target_missing',
      'The selected savings goal no longer exists.'
    );
  }
  if (goal.userId !== userId) {
    throw new PlanActionValidationError(
      'target_unauthorized',
      'The selected savings goal does not belong to the signed-in account.'
    );
  }
  return goal;
};

const currentEvidenceRevision = (
  plan: FinancialPlan,
  data: AppData
): string =>
  buildPlanEvidenceSnapshot({
    user: data.user,
    horizon: planEvidenceHorizonForSavedPlan(plan),
    transactions: data.transactions,
    categories: data.categories,
    budgets: data.budgets,
    savingsGoals: data.savingsGoals,
    recurringExpenses: data.recurringExpenses,
  }).baselineRevision;

const blockedPreview = (
  input: PlanActionPreviewInput,
  error: PlanActionValidationError
): PlanActionPreview => {
  const currency = input.plan.currency.trim().toUpperCase();
  return {
    schemaVersion: 1,
    actionType: input.selection.actionType,
    targetKind:
      input.selection.actionType === 'category_budget_update'
        ? 'category_budget'
        : input.selection.actionType.startsWith('savings_')
          ? 'savings_goal'
          : 'budget',
    targetId:
      'goalId' in input.selection
        ? input.selection.goalId
        : 'categoryId' in input.selection
          ? input.selection.categoryId
          : '',
    targetLabel: 'Unavailable',
    targetMonth: null,
    currentValueMinor: null,
    changeValueMinor: 0,
    proposedValueMinor: 0,
    currency,
    evidenceRefs: [...(input.proposal.evidenceRefs || [])],
    reason: input.proposal.description,
    expectedEffect: 'No financial data will change while this action is blocked.',
    reversibility: 'Not applicable.',
    sourceEvidenceRevision: input.version.sourceRevision,
    currentEvidenceRevision: '',
    previewRevision: '',
    previewFingerprint: '',
    stale: error.code === 'stale_evidence',
    blocked: true,
    failureCode: error.code,
    failureMessage: error.message,
  };
};

export const buildPlanActionPreview = (
  input: PlanActionPreviewInput
): PlanActionPreview => {
  try {
    const userId = requireText(
      input.userId || '',
      'authentication_required',
      'Sign in before applying a Plan action.'
    );
    if (input.plan.userId !== userId || input.version.userId !== userId) {
      throw new PlanActionValidationError(
        'target_unauthorized',
        'The Plan does not belong to the signed-in account.'
      );
    }
    if (
      input.version.planId !== input.plan.id ||
      input.plan.currentVersionId !== input.version.id
    ) {
      throw new PlanActionValidationError(
        'historical_version',
        'Only proposals from the current Plan version can be applied.'
      );
    }
    if (input.plan.status !== 'active') {
      throw new PlanActionValidationError(
        'inactive_plan',
        'Activate this Plan before applying its proposals.'
      );
    }
    if (input.data.user.id !== userId) {
      throw new PlanActionValidationError(
        'target_unauthorized',
        'The financial workspace does not belong to the signed-in account.'
      );
    }
    if (
      input.proposal.requiresConfirmation !== true ||
      input.proposal.executionState !== 'proposal_only'
    ) {
      throw new PlanActionValidationError(
        'invalid_request',
        'The proposal confirmation contract is invalid.'
      );
    }
    if (input.proposal.schemaVersion !== 2) {
      throw new PlanActionValidationError(
        'unsupported_action',
        'This older proposal remains read-only and cannot be applied.'
      );
    }

    const currency = input.plan.currency.trim().toUpperCase();
    currencyFractionDigits(currency);
    if (input.data.user.currency.trim().toUpperCase() !== currency) {
      throw new PlanActionValidationError(
        'currency_mismatch',
        'The Plan currency no longer matches the account currency.'
      );
    }

    const currentRevision = currentEvidenceRevision(input.plan, input.data);
    const acceptedRevision =
      input.acceptedEvidenceRevision ||
      input.version.sourceRevision;
    if (acceptedRevision !== currentRevision) {
      throw new PlanActionValidationError(
        'stale_evidence',
        'Financial evidence changed after this version was created. Recalculate before applying.'
      );
    }

    const proposalValueMinor = proposalMinor(input.proposal, currency);
    let targetKind: PlanActionTargetKind;
    let targetId: string;
    let targetLabel: string;
    let targetMonth: string | null = null;
    let currentValueMinor: number | null;
    let changeValueMinor: number;
    let proposedValueMinor: number;
    let expectedEffect: string;
    let reversibility: string;

    if (input.selection.actionType === 'total_budget_update') {
      if (input.proposal.type !== 'budget_adjustment') {
        throw new PlanActionValidationError(
          'unsupported_action',
          'This proposal is not a total-budget action.'
        );
      }
      if (input.proposal.targetEntityId !== null) {
        throw new PlanActionValidationError(
          'invalid_request',
          'A category-targeted proposal cannot update the total budget.'
        );
      }
      const month = actionMonth(input.proposal, input.plan);
      const budget = ownedBudget(input.data, userId, month);
      targetKind = 'budget';
      targetId = budget.id;
      targetLabel = `${month} total budget`;
      targetMonth = month;
      currentValueMinor = toMinorUnits(budget.totalBudget, currency);
      proposedValueMinor = proposalValueMinor;
      changeValueMinor = proposedValueMinor - currentValueMinor;
      expectedEffect = 'Updates only the total budget for the selected month.';
      reversibility = 'Reversible by reviewing and applying a later budget update.';
    } else if (input.selection.actionType === 'category_budget_update') {
      if (input.proposal.type !== 'budget_adjustment') {
        throw new PlanActionValidationError(
          'unsupported_action',
          'This proposal is not a category-budget action.'
        );
      }
      const categoryId = requireText(
        input.selection.categoryId,
        'invalid_request',
        'Choose a category before reviewing this action.'
      );
      if (
        input.proposal.targetEntityId !== null &&
        input.proposal.targetEntityId !== categoryId
      ) {
        throw new PlanActionValidationError(
          'target_unauthorized',
          'The selected category does not match the proposal target.'
        );
      }
      const category = input.data.categories.find(
        (candidate) => candidate.id === categoryId
      );
      if (!category) {
        throw new PlanActionValidationError(
          'target_missing',
          'The selected category no longer exists.'
        );
      }
      const month = actionMonth(input.proposal, input.plan);
      const budget = ownedBudget(input.data, userId, month);
      targetKind = 'category_budget';
      targetId = categoryId;
      targetLabel = `${category.name} budget for ${month}`;
      targetMonth = month;
      currentValueMinor = toMinorUnits(
        budget.categoryBudgets[categoryId] ?? category.monthlyBudget,
        currency
      );
      proposedValueMinor = proposalValueMinor;
      changeValueMinor = proposedValueMinor - currentValueMinor;
      expectedEffect = 'Updates only this category allocation for the selected month.';
      reversibility = 'Reversible by reviewing and applying a later category-budget update.';
    } else if (input.selection.actionType === 'savings_goal_update') {
      if (input.proposal.type !== 'savings_contribution') {
        throw new PlanActionValidationError(
          'unsupported_action',
          'This proposal is not a savings-goal action.'
        );
      }
      if (
        input.proposal.targetEntityId !== null &&
        input.proposal.targetEntityId !== input.selection.goalId
      ) {
        throw new PlanActionValidationError(
          'target_unauthorized',
          'The selected savings goal does not match the proposal target.'
        );
      }
      const goal = ownedGoal(input.data, userId, input.selection.goalId);
      targetKind = 'savings_goal';
      targetId = goal.id;
      targetLabel = goal.name;
      currentValueMinor = toMinorUnits(goal.currentAmount, currency);
      changeValueMinor = proposalValueMinor;
      proposedValueMinor = currentValueMinor + changeValueMinor;
      const targetMinor = toMinorUnits(goal.targetAmount, currency);
      if (proposedValueMinor >= targetMinor) {
        throw new PlanActionValidationError(
          'amount_out_of_bounds',
          'The contribution must keep the saved balance below the goal target.'
        );
      }
      expectedEffect = 'Adds the reviewed contribution to the selected goal balance.';
      reversibility = 'Reversible by editing the goal balance from Savings Goals.';
    } else {
      if (input.proposal.type !== 'savings_contribution') {
        throw new PlanActionValidationError(
          'unsupported_action',
          'This proposal is not a savings-goal action.'
        );
      }
      if (input.proposal.targetEntityId !== null) {
        throw new PlanActionValidationError(
          'invalid_request',
          'A targeted savings proposal cannot create a different goal.'
        );
      }
      const goalId = requireText(
        input.selection.goalId,
        'invalid_request',
        'A deterministic savings-goal id is required.'
      );
      requireText(
        input.selection.goalName,
        'invalid_request',
        'Enter a savings-goal name.'
      );
      boundedMinor(input.selection.targetAmountMinor, 'The savings target');
      if (!isValidDateKey(input.selection.targetDate)) {
        throw new PlanActionValidationError(
          'invalid_request',
          'Enter the savings target date as YYYY-MM-DD.'
        );
      }
      changeValueMinor = proposalValueMinor;
      proposedValueMinor = changeValueMinor;
      if (input.selection.targetAmountMinor <= proposedValueMinor) {
        throw new PlanActionValidationError(
          'amount_out_of_bounds',
          'The savings target must be greater than the starting contribution.'
        );
      }
      if (input.data.savingsGoals.some((goal) => goal.id === goalId)) {
        throw new PlanActionValidationError(
          'current_value_changed',
          'A savings goal already uses this action id.'
        );
      }
      targetKind = 'savings_goal';
      targetId = goalId;
      targetLabel = input.selection.goalName.trim();
      currentValueMinor = null;
      expectedEffect = 'Creates one savings goal with the reviewed starting contribution.';
      reversibility = 'The goal can be edited or deleted later from Savings Goals.';
    }

    if (changeValueMinor === 0) {
      throw new PlanActionValidationError(
        'current_value_changed',
        'The reviewed action already matches the current value.'
      );
    }

    const previewRevision = deterministicHash(
      stableSerialize({
        planId: input.plan.id,
        sourceVersionId: input.version.id,
        proposalId: input.proposal.id,
        actionType: input.selection.actionType,
        targetKind,
        targetId,
        targetMonth,
        currentValueMinor,
        proposedValueMinor,
        changeValueMinor,
        currency,
        sourceEvidenceRevision: input.version.sourceRevision,
      })
    );
    const previewFingerprint = deterministicHash(
      stableSerialize({
        previewRevision,
        selection: input.selection,
      })
    );

    return {
      schemaVersion: 1,
      actionType: input.selection.actionType,
      targetKind,
      targetId,
      targetLabel,
      targetMonth,
      currentValueMinor,
      changeValueMinor,
      proposedValueMinor,
      currency,
      evidenceRefs: [...(input.proposal.evidenceRefs || [])],
      reason: input.proposal.description,
      expectedEffect,
      reversibility,
      sourceEvidenceRevision: input.version.sourceRevision,
      currentEvidenceRevision: currentRevision,
      previewRevision,
      previewFingerprint,
      stale: false,
      blocked: false,
      failureCode: null,
      failureMessage: null,
    };
  } catch (error) {
    if (error instanceof PlanActionValidationError) {
      return blockedPreview(input, error);
    }
    throw error;
  }
};

export const isPlanActionProposalSupported = (
  proposal: PlanActionProposal
): boolean =>
  proposal.schemaVersion === 2 &&
  (
    proposal.type === 'budget_adjustment' ||
    proposal.type === 'savings_contribution'
  );

import {
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type DocumentSnapshot,
} from 'firebase/firestore';
import type {
  AppData,
  Budget,
  Category,
  SavingsGoal,
} from '../../models/finance';
import type {
  FinancialPlan,
  PlanActionResult,
  PlanActionState,
  PlanVersion,
} from '../../models/planning';
import {
  buildPlanActionPreview,
  planActionSelectionDigest,
  PlanActionValidationError,
  type PlanActionPreview,
  type PlanActionSelection,
} from '../../planning/planActionApplication';
import {
  buildPlanEvidenceSnapshot,
  fromMinorUnits,
  toMinorUnits,
} from '../../planning/planEvidence';
import {
  planEvidenceHorizonForSavedPlan,
} from '../../planning/planWorkspace';
import { db } from './client';
import {
  getUserEntityDocumentRef,
} from './entityPaths';
import {
  getLegacyAppDataRef,
} from './paths';
import {
  getUserPlanActionResultDocumentRef,
  getUserPlanActionResultsCollectionRef,
  getUserPlanActionStateDocumentRef,
  getUserPlanDocumentRef,
  getUserPlanVersionDocumentRef,
} from './planPaths';
import {
  fromJsonSafeValue,
  toJsonSafeValue,
} from './serializers';

export interface ApplyPlanActionInput {
  userId: string;
  planId: string;
  sourceVersionId: string;
  proposalId: string;
  applicationId: string;
  selection: PlanActionSelection;
  confirmedPreviewRevision: string;
  confirmedPreviewFingerprint: string;
  confirmedEvidenceRevision: string;
  confirmed: true;
  occurredAt: string;
}

export interface RecordPlanActionOutcomeInput {
  userId: string;
  planId: string;
  sourceVersionId: string;
  proposalId: string;
  applicationId: string;
  selection: PlanActionSelection;
  status: 'blocked' | 'canceled';
  occurredAt: string;
}

const requireFirestore = () => {
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
};

const requireId = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new PlanActionValidationError(
      'invalid_request',
      `${label} is required.`
    );
  }
  return normalized;
};

const requireDocument = <TValue>(
  snapshot: DocumentSnapshot<DocumentData>,
  code: 'target_missing' | 'invalid_request',
  message: string
): TValue => {
  if (!snapshot.exists()) {
    throw new PlanActionValidationError(code, message);
  }
  return fromJsonSafeValue<TValue>({
    ...snapshot.data(),
    id: snapshot.id,
  });
};

const actionStateFromSnapshot = (
  snapshot: DocumentSnapshot<DocumentData>,
  userId: string,
  planId: string,
  sourceVersionId: string
): PlanActionState | null => {
  if (!snapshot.exists()) return null;
  const state = fromJsonSafeValue<PlanActionState>({
    ...snapshot.data(),
    id: snapshot.id,
  });
  if (
    state.userId !== userId ||
    state.planId !== planId ||
    state.id !== 'current'
  ) {
    throw new PlanActionValidationError(
      'target_unauthorized',
      'The Plan action state does not match the signed-in account.'
    );
  }
  return state.sourceVersionId === sourceVersionId
    ? state
    : null;
};

const evidenceRevisionFor = (
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

const requirePreviewMatch = (
  preview: PlanActionPreview,
  input: ApplyPlanActionInput
): void => {
  if (preview.blocked) {
    throw new PlanActionValidationError(
      preview.failureCode || 'invalid_request',
      preview.failureMessage || 'The Plan action is blocked.'
    );
  }
  if (
    preview.previewRevision !== input.confirmedPreviewRevision ||
    preview.previewFingerprint !== input.confirmedPreviewFingerprint ||
    preview.currentEvidenceRevision !== input.confirmedEvidenceRevision
  ) {
    throw new PlanActionValidationError(
      'stale_evidence',
      'The reviewed action changed before confirmation. Review it again.'
    );
  }
};

const assertBudgetMatchesPreview = (
  budget: Budget,
  preview: PlanActionPreview,
  selection: PlanActionSelection,
  categoryDefault: number | null = null
): void => {
  const currentValueMinor =
    selection.actionType === 'total_budget_update'
      ? toMinorUnits(budget.totalBudget, preview.currency)
      : selection.actionType === 'category_budget_update'
        ? toMinorUnits(
            budget.categoryBudgets[selection.categoryId] ??
              categoryDefault ??
              0,
            preview.currency
          )
        : null;
  if (currentValueMinor !== preview.currentValueMinor) {
    throw new PlanActionValidationError(
      'current_value_changed',
      'The budget changed after review. Review the action again.'
    );
  }
};

const assertGoalMatchesPreview = (
  goal: SavingsGoal,
  preview: PlanActionPreview
): void => {
  if (
    toMinorUnits(goal.currentAmount, preview.currency) !==
    preview.currentValueMinor
  ) {
    throw new PlanActionValidationError(
      'current_value_changed',
      'The savings balance changed after review. Review the action again.'
    );
  }
};

const sameCategoryBudgets = (
  left: Record<string, number>,
  right: Record<string, number>
): boolean => {
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])];
  return keys.every((key) => left[key] === right[key]);
};

const budgetMirrorsMatch = (
  entity: Budget,
  legacy: Budget
): boolean =>
  entity.id === legacy.id &&
  entity.userId === legacy.userId &&
  entity.month === legacy.month &&
  entity.totalBudget === legacy.totalBudget &&
  entity.createdAt === legacy.createdAt &&
  sameCategoryBudgets(entity.categoryBudgets, legacy.categoryBudgets);

const savingsMirrorsMatch = (
  entity: SavingsGoal,
  legacy: SavingsGoal
): boolean =>
  entity.id === legacy.id &&
  entity.userId === legacy.userId &&
  entity.name === legacy.name &&
  entity.targetAmount === legacy.targetAmount &&
  entity.currentAmount === legacy.currentAmount &&
  entity.targetDate === legacy.targetDate &&
  entity.createdAt === legacy.createdAt;

const categoryMirrorsMatch = (
  entity: Category,
  legacy: Category
): boolean =>
  entity.id === legacy.id &&
  entity.name === legacy.name &&
  entity.type === legacy.type &&
  entity.color === legacy.color &&
  entity.icon === legacy.icon &&
  entity.monthlyBudget === legacy.monthlyBudget &&
  entity.isDefault === legacy.isDefault;

const resultFromDocument = (
  id: string,
  value: DocumentData
): PlanActionResult => {
  const appliedAtValue = value.appliedAt as
    | string
    | { toDate?: () => Date };
  const appliedAt =
    typeof appliedAtValue === 'string'
      ? appliedAtValue
      : appliedAtValue?.toDate?.().toISOString() || '';
  return fromJsonSafeValue<PlanActionResult>({
    ...value,
    id,
    appliedAt,
  });
};

const resultFor = (
  input: ApplyPlanActionInput,
  preview: PlanActionPreview,
  postEvidenceRevision: string,
  financeDocumentId: string,
  legacyEntityIndex: number
): PlanActionResult => ({
  schemaVersion: 1,
  id: input.applicationId,
  userId: input.userId,
  planId: input.planId,
  sourceVersionId: input.sourceVersionId,
  proposalId: input.proposalId,
  previewFingerprint: input.confirmedPreviewFingerprint,
  selectionDigest:
    planActionSelectionDigest(input.selection),
  actionType: preview.actionType,
  targetKind: preview.targetKind,
  targetId: preview.targetId,
  financeDocumentId,
  targetMonth: preview.targetMonth,
  legacyEntityIndex,
  status: 'success',
  failureCode: null,
  retryable: false,
  currency: preview.currency,
  beforeValueMinor: preview.currentValueMinor,
  beforeValueMajor:
    preview.currentValueMinor === null
      ? null
      : fromMinorUnits(
          preview.currentValueMinor,
          preview.currency
        ),
  changeValueMinor: preview.changeValueMinor,
  changeValueMajor: fromMinorUnits(
    preview.changeValueMinor,
    preview.currency
  ),
  proposedValueMinor: preview.proposedValueMinor,
  proposedValueMajor: fromMinorUnits(
    preview.proposedValueMinor,
    preview.currency
  ),
  confirmedEvidenceRevision: input.confirmedEvidenceRevision,
  postEvidenceRevision,
  previewRevision: input.confirmedPreviewRevision,
  appliedAt: input.occurredAt,
});

const isExactSuccessfulDuplicate = (
  existing: PlanActionResult,
  input: ApplyPlanActionInput
): boolean =>
  existing.status === 'success' &&
  existing.failureCode === null &&
  existing.retryable === false &&
  existing.userId === input.userId &&
  existing.planId === input.planId &&
  existing.sourceVersionId === input.sourceVersionId &&
  existing.proposalId === input.proposalId &&
  existing.previewFingerprint === input.confirmedPreviewFingerprint &&
  existing.previewRevision === input.confirmedPreviewRevision &&
  existing.confirmedEvidenceRevision === input.confirmedEvidenceRevision &&
  existing.actionType === input.selection.actionType &&
  existing.selectionDigest ===
    planActionSelectionDigest(input.selection);

const isExactOutcomeDuplicate = (
  existing: PlanActionResult,
  input: RecordPlanActionOutcomeInput
): boolean =>
  existing.userId === input.userId &&
  existing.planId === input.planId &&
  existing.sourceVersionId === input.sourceVersionId &&
  existing.proposalId === input.proposalId &&
  existing.status === input.status &&
  existing.actionType === input.selection.actionType &&
  existing.selectionDigest ===
    planActionSelectionDigest(input.selection);

export const applyPlanAction = async (
  input: ApplyPlanActionInput
): Promise<PlanActionResult> => {
  requireId(input.userId, 'User id');
  requireId(input.planId, 'Plan id');
  requireId(input.sourceVersionId, 'Source version id');
  requireId(input.proposalId, 'Proposal id');
  requireId(input.applicationId, 'Application id');
  requireId(input.confirmedPreviewRevision, 'Preview revision');
  requireId(input.confirmedPreviewFingerprint, 'Preview fingerprint');
  requireId(input.confirmedEvidenceRevision, 'Evidence revision');
  if (input.confirmed !== true) {
    throw new PlanActionValidationError(
      'confirmation_required',
      'Explicit confirmation is required.'
    );
  }

  const transactionResult = await runTransaction(
    requireFirestore(),
    async (transaction) => {
      const planRef = getUserPlanDocumentRef(input.userId, input.planId);
      const versionRef = getUserPlanVersionDocumentRef(
        input.userId,
        input.planId,
        input.sourceVersionId
      );
      const resultRef = getUserPlanActionResultDocumentRef(
        input.userId,
        input.planId,
        input.applicationId
      );
      const stateRef = getUserPlanActionStateDocumentRef(
        input.userId,
        input.planId
      );
      const appDataRef = getLegacyAppDataRef(input.userId);
      const [
        planSnapshot,
        versionSnapshot,
        resultSnapshot,
        stateSnapshot,
        appDataSnapshot,
      ] = await Promise.all([
        transaction.get(planRef),
        transaction.get(versionRef),
        transaction.get(resultRef),
        transaction.get(stateRef),
        transaction.get(appDataRef),
      ]);

      if (resultSnapshot.exists()) {
        const existing = resultFromDocument(
          resultSnapshot.id,
          resultSnapshot.data()
        );
        if (isExactSuccessfulDuplicate(existing, input)) {
          return existing;
        }
        throw new PlanActionValidationError(
          'idempotency_conflict',
          'This application id is already bound to a different action or outcome.'
        );
      }

      const plan = requireDocument<FinancialPlan>(
        planSnapshot,
        'invalid_request',
        'The Plan no longer exists.'
      );
      const version = requireDocument<PlanVersion>(
        versionSnapshot,
        'invalid_request',
        'The source Plan version no longer exists.'
      );
      const data = requireDocument<AppData>(
        appDataSnapshot,
        'invalid_request',
        'The account workspace is unavailable.'
      );
      const state = actionStateFromSnapshot(
        stateSnapshot,
        input.userId,
        input.planId,
        input.sourceVersionId
      );
      const proposal = version.actionProposals.find(
        (candidate) => candidate.id === input.proposalId
      );
      if (!proposal) {
        throw new PlanActionValidationError(
          'invalid_request',
          'The proposal does not exist in the immutable source version.'
        );
      }
      if (state?.appliedProposalIds.includes(input.proposalId)) {
        throw new PlanActionValidationError(
          'idempotency_conflict',
          'This proposal already has a successful application.'
        );
      }

      const preview = buildPlanActionPreview({
        userId: input.userId,
        plan,
        version,
        proposal,
        data,
        selection: input.selection,
        acceptedEvidenceRevision: state?.acceptedEvidenceRevision,
      });
      requirePreviewMatch(preview, input);

      let nextData: AppData;
      let financeDocumentId = '';
      let legacyEntityIndex = -1;
      const entityWrites: Array<{
        ref: ReturnType<typeof getUserEntityDocumentRef>;
        value: Budget | SavingsGoal;
      }> = [];

      if (
        input.selection.actionType === 'total_budget_update' ||
        input.selection.actionType === 'category_budget_update'
      ) {
        const budget = data.budgets.find(
          (candidate) => candidate.month === preview.targetMonth
        );
        if (!budget) {
          throw new PlanActionValidationError(
            'target_missing',
            'The target budget no longer exists.'
          );
        }
        const budgetRef = getUserEntityDocumentRef(
          input.userId,
          'budgets',
          budget.id
        );
        financeDocumentId = budget.id;
        legacyEntityIndex = data.budgets.findIndex(
          (candidate) => candidate.id === budget.id
        );
        if (legacyEntityIndex < 0) {
          throw new PlanActionValidationError(
            'target_missing',
            'The budget workspace mirror is missing.'
          );
        }
        const budgetSnapshot = await transaction.get(budgetRef);
        const budgetEntity = requireDocument<Budget>(
          budgetSnapshot,
          'target_missing',
          'The target budget entity no longer exists.'
        );
        if (
          budgetEntity.userId !== input.userId ||
          budget.userId !== input.userId
        ) {
          throw new PlanActionValidationError(
            'target_unauthorized',
            'The target budget does not belong to the signed-in account.'
          );
        }
        if (!budgetMirrorsMatch(budgetEntity, budget)) {
          throw new PlanActionValidationError(
            'current_value_changed',
            'The budget entity and workspace mirror disagree. Review the budget before applying.'
          );
        }
        let categoryDefault: number | null = null;
        if (input.selection.actionType === 'category_budget_update') {
          const selectedCategoryId = input.selection.categoryId;
          const category = data.categories.find(
            (candidate) => candidate.id === selectedCategoryId
          );
          if (!category) {
            throw new PlanActionValidationError(
              'target_missing',
              'The selected category no longer exists.'
            );
          }
          const categoryRef = getUserEntityDocumentRef(
            input.userId,
            'categories',
            category.id
          );
          const categorySnapshot = await transaction.get(categoryRef);
          const categoryEntity = requireDocument<Category>(
            categorySnapshot,
            'target_missing',
            'The selected category entity no longer exists.'
          );
          if (!categoryMirrorsMatch(categoryEntity, category)) {
            throw new PlanActionValidationError(
              'current_value_changed',
              'The category entity and workspace mirror disagree.'
            );
          }
          categoryDefault = category.monthlyBudget;
        }
        assertBudgetMatchesPreview(
          budgetEntity,
          preview,
          input.selection,
          categoryDefault
        );

        if (input.selection.actionType === 'total_budget_update') {
          const nextBudget: Budget = {
            ...budgetEntity,
            totalBudget: fromMinorUnits(
              preview.proposedValueMinor,
              preview.currency
            ),
            updatedAt: input.occurredAt,
          };
          const nextLegacyBudget: Budget = {
            ...budget,
            totalBudget: nextBudget.totalBudget,
            updatedAt: input.occurredAt,
          };
          entityWrites.push({ ref: budgetRef, value: nextBudget });
          nextData = {
            ...data,
            budgets: data.budgets.map((candidate) =>
              candidate.id === budget.id ? nextLegacyBudget : candidate
            ),
          };
        } else {
          const categoryId = input.selection.categoryId;
          const nextValue = fromMinorUnits(
            preview.proposedValueMinor,
            preview.currency
          );
          const nextBudget: Budget = {
            ...budgetEntity,
            categoryBudgets: {
              ...budgetEntity.categoryBudgets,
              [categoryId]: nextValue,
            },
            updatedAt: input.occurredAt,
          };
          const nextLegacyBudget: Budget = {
            ...budget,
            categoryBudgets: {
              ...budget.categoryBudgets,
              [categoryId]: nextValue,
            },
            updatedAt: input.occurredAt,
          };
          entityWrites.push({ ref: budgetRef, value: nextBudget });
          nextData = {
            ...data,
            budgets: data.budgets.map((candidate) =>
              candidate.id === budget.id ? nextLegacyBudget : candidate
            ),
          };
        }
      } else {
        const selectedGoalId = input.selection.goalId;
        const goalRef = getUserEntityDocumentRef(
          input.userId,
          'savingsGoals',
          selectedGoalId
        );
        financeDocumentId = selectedGoalId;
        legacyEntityIndex =
          input.selection.actionType === 'savings_goal_create'
            ? data.savingsGoals.length
            : data.savingsGoals.findIndex(
                (candidate) =>
                  candidate.id === selectedGoalId
              );
        if (legacyEntityIndex < 0) {
          throw new PlanActionValidationError(
            'target_missing',
            'The savings workspace mirror is missing.'
          );
        }
        const goalSnapshot = await transaction.get(goalRef);
        if (input.selection.actionType === 'savings_goal_create') {
          if (goalSnapshot.exists()) {
            throw new PlanActionValidationError(
              'current_value_changed',
              'The savings goal was created before this action completed.'
            );
          }
          const nextGoal: SavingsGoal = {
            id: input.selection.goalId,
            userId: input.userId,
            name: input.selection.goalName.trim(),
            targetAmount: fromMinorUnits(
              input.selection.targetAmountMinor,
              preview.currency
            ),
            currentAmount: fromMinorUnits(
              preview.proposedValueMinor,
              preview.currency
            ),
            targetDate: input.selection.targetDate,
            createdAt: input.occurredAt,
            updatedAt: input.occurredAt,
          };
          entityWrites.push({ ref: goalRef, value: nextGoal });
          nextData = {
            ...data,
            savingsGoals: [...data.savingsGoals, nextGoal],
          };
        } else {
          const goal = requireDocument<SavingsGoal>(
            goalSnapshot,
            'target_missing',
            'The target savings goal no longer exists.'
          );
          if (goal.userId !== input.userId) {
            throw new PlanActionValidationError(
              'target_unauthorized',
              'The target savings goal does not belong to the signed-in account.'
            );
          }
          const legacyGoal = data.savingsGoals.find(
            (candidate) => candidate.id === goal.id
          );
          if (!legacyGoal || !savingsMirrorsMatch(goal, legacyGoal)) {
            throw new PlanActionValidationError(
              'current_value_changed',
              'The savings entity and workspace mirror disagree. Review the goal before applying.'
            );
          }
          assertGoalMatchesPreview(goal, preview);
          if (
            preview.proposedValueMinor >=
            toMinorUnits(goal.targetAmount, preview.currency)
          ) {
            throw new PlanActionValidationError(
              'amount_out_of_bounds',
              'The contribution must keep the saved balance below the transaction-read goal target.'
            );
          }
          const nextGoal: SavingsGoal = {
            ...goal,
            currentAmount: fromMinorUnits(
              preview.proposedValueMinor,
              preview.currency
            ),
            updatedAt: input.occurredAt,
          };
          const nextLegacyGoal: SavingsGoal = {
            ...legacyGoal,
            currentAmount: nextGoal.currentAmount,
            updatedAt: input.occurredAt,
          };
          entityWrites.push({ ref: goalRef, value: nextGoal });
          nextData = {
            ...data,
            savingsGoals: data.savingsGoals.map((candidate) =>
              candidate.id === goal.id ? nextLegacyGoal : candidate
            ),
          };
        }
      }

      const postEvidenceRevision = evidenceRevisionFor(plan, nextData);
      const result = resultFor(
        input,
        preview,
        postEvidenceRevision,
        financeDocumentId,
        legacyEntityIndex
      );
      const nextState: PlanActionState = {
        schemaVersion: 1,
        id: 'current',
        userId: input.userId,
        planId: input.planId,
        sourceVersionId: input.sourceVersionId,
        acceptedEvidenceRevision: postEvidenceRevision,
        appliedProposalIds: [
          ...(state?.appliedProposalIds || []),
          input.proposalId,
        ],
        lastApplicationId: input.applicationId,
        updatedAt: input.occurredAt,
      };
      for (const write of entityWrites) {
        transaction.set(write.ref, toJsonSafeValue(write.value));
      }
      transaction.set(appDataRef, toJsonSafeValue(nextData));
      transaction.set(stateRef, {
        ...toJsonSafeValue(nextState),
        updatedAt: serverTimestamp(),
      });
      transaction.set(resultRef, {
        ...toJsonSafeValue(result),
        appliedAt: serverTimestamp(),
      });
      return result;
    }
  );
  const saved = await getDoc(
    getUserPlanActionResultDocumentRef(
      input.userId,
      input.planId,
      input.applicationId
    )
  );
  return saved.exists()
    ? resultFromDocument(saved.id, saved.data())
    : transactionResult;
};

export const listPlanActionResults = async (
  userId: string,
  planId: string
): Promise<PlanActionResult[]> => {
  requireId(userId, 'User id');
  requireId(planId, 'Plan id');
  const snapshot = await getDocs(
    getUserPlanActionResultsCollectionRef(userId, planId)
  );
  return snapshot.docs
    .map((documentSnapshot) =>
      resultFromDocument(
        documentSnapshot.id,
        documentSnapshot.data()
      )
    )
    .sort((left, right) => left.appliedAt.localeCompare(right.appliedAt));
};

export const getPlanActionState = async (
  userId: string,
  planId: string
): Promise<PlanActionState | null> => {
  requireId(userId, 'User id');
  requireId(planId, 'Plan id');
  const snapshot = await getDoc(
    getUserPlanActionStateDocumentRef(userId, planId)
  );
  if (!snapshot.exists()) return null;
  const value = snapshot.data();
  const updatedAtValue = value.updatedAt as
    | string
    | { toDate?: () => Date };
  return fromJsonSafeValue<PlanActionState>({
    ...value,
    id: snapshot.id,
    updatedAt:
      typeof updatedAtValue === 'string'
        ? updatedAtValue
        : updatedAtValue?.toDate?.().toISOString() || '',
  });
};

export const recordPlanActionOutcome = async (
  input: RecordPlanActionOutcomeInput
): Promise<PlanActionResult> => {
  requireId(input.userId, 'User id');
  requireId(input.planId, 'Plan id');
  requireId(input.sourceVersionId, 'Source version id');
  requireId(input.proposalId, 'Proposal id');
  requireId(input.applicationId, 'Application id');

  const transactionResult = await runTransaction(
    requireFirestore(),
    async (transaction) => {
      const planRef = getUserPlanDocumentRef(input.userId, input.planId);
      const versionRef = getUserPlanVersionDocumentRef(
        input.userId,
        input.planId,
        input.sourceVersionId
      );
      const resultRef = getUserPlanActionResultDocumentRef(
        input.userId,
        input.planId,
        input.applicationId
      );
      const stateRef = getUserPlanActionStateDocumentRef(
        input.userId,
        input.planId
      );
      const appDataRef = getLegacyAppDataRef(input.userId);
      const [
        planSnapshot,
        versionSnapshot,
        resultSnapshot,
        stateSnapshot,
        appDataSnapshot,
      ] = await Promise.all([
        transaction.get(planRef),
        transaction.get(versionRef),
        transaction.get(resultRef),
        transaction.get(stateRef),
        transaction.get(appDataRef),
      ]);
      if (resultSnapshot.exists()) {
        const existing = resultFromDocument(
          resultSnapshot.id,
          resultSnapshot.data()
        );
        if (isExactOutcomeDuplicate(existing, input)) {
          return existing;
        }
        throw new PlanActionValidationError(
          'idempotency_conflict',
          'This application id is already bound to a different outcome.'
        );
      }
      const plan = requireDocument<FinancialPlan>(
        planSnapshot,
        'invalid_request',
        'The Plan no longer exists.'
      );
      const version = requireDocument<PlanVersion>(
        versionSnapshot,
        'invalid_request',
        'The source Plan version no longer exists.'
      );
      const data = requireDocument<AppData>(
        appDataSnapshot,
        'invalid_request',
        'The account workspace is unavailable.'
      );
      const state = actionStateFromSnapshot(
        stateSnapshot,
        input.userId,
        input.planId,
        input.sourceVersionId
      );
      if (state?.appliedProposalIds.includes(input.proposalId)) {
        throw new PlanActionValidationError(
          'idempotency_conflict',
          'This proposal already has a successful application.'
        );
      }
      const proposal = version.actionProposals.find(
        (candidate) => candidate.id === input.proposalId
      );
      if (!proposal) {
        throw new PlanActionValidationError(
          'target_unauthorized',
          'The proposal does not belong to the signed-in account.'
        );
      }
      const preview = buildPlanActionPreview({
        userId: input.userId,
        plan,
        version,
        proposal,
        data,
        selection: input.selection,
        acceptedEvidenceRevision: state?.acceptedEvidenceRevision,
      });
      if (input.status === 'canceled' && preview.blocked) {
        throw new PlanActionValidationError(
          preview.failureCode || 'invalid_request',
          'A blocked preview cannot be recorded as canceled.'
        );
      }
      if (input.status === 'blocked' && !preview.blocked) {
        throw new PlanActionValidationError(
          'invalid_request',
          'A valid preview cannot be recorded as blocked.'
        );
      }
      const result: PlanActionResult = {
        schemaVersion: 1,
        id: input.applicationId,
        userId: input.userId,
        planId: input.planId,
        sourceVersionId: input.sourceVersionId,
        proposalId: input.proposalId,
        previewFingerprint: preview.previewFingerprint,
        selectionDigest:
          planActionSelectionDigest(input.selection),
        actionType: preview.actionType,
        targetKind: preview.targetKind,
        targetId: preview.targetId,
        financeDocumentId:
          preview.actionType === 'category_budget_update'
            ? data.budgets.find(
                (budget) => budget.month === preview.targetMonth
              )?.id || ''
            : preview.targetId,
        targetMonth: preview.targetMonth,
        legacyEntityIndex:
          preview.actionType === 'savings_goal_create'
            ? data.savingsGoals.length
            : preview.actionType.startsWith('savings_')
              ? data.savingsGoals.findIndex(
                  (goal) => goal.id === preview.targetId
                )
              : data.budgets.findIndex(
                  (budget) =>
                    budget.id ===
                    (
                      preview.actionType === 'category_budget_update'
                        ? data.budgets.find(
                            (candidate) =>
                              candidate.month === preview.targetMonth
                          )?.id
                        : preview.targetId
                    )
                ),
        status: input.status,
        failureCode:
          input.status === 'blocked'
            ? preview.failureCode || 'invalid_request'
            : null,
        retryable: false,
        currency: preview.currency,
        beforeValueMinor: preview.currentValueMinor,
        beforeValueMajor:
          preview.currentValueMinor === null
            ? null
            : fromMinorUnits(
                preview.currentValueMinor,
                preview.currency
              ),
        changeValueMinor: preview.changeValueMinor,
        changeValueMajor: fromMinorUnits(
          preview.changeValueMinor,
          preview.currency
        ),
        proposedValueMinor: preview.proposedValueMinor,
        proposedValueMajor: fromMinorUnits(
          preview.proposedValueMinor,
          preview.currency
        ),
        confirmedEvidenceRevision: preview.currentEvidenceRevision,
        postEvidenceRevision: preview.currentEvidenceRevision,
        previewRevision: preview.previewRevision,
        appliedAt: input.occurredAt,
      };
      transaction.set(resultRef, {
        ...toJsonSafeValue(result),
        appliedAt: serverTimestamp(),
      });
      return result;
    }
  );
  const saved = await getDoc(
    getUserPlanActionResultDocumentRef(
      input.userId,
      input.planId,
      input.applicationId
    )
  );
  return saved.exists()
    ? resultFromDocument(saved.id, saved.data())
    : transactionResult;
};

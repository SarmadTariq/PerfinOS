import {
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type DocumentSnapshot,
} from 'firebase/firestore';
import type {
  Budget,
  Category,
  SavingsGoal,
  WorkspaceMeta,
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
  workspaceRevisionToken,
  type PlanActionPreview,
  type PlanActionSelection,
} from '../../planning/planActionApplication';
import {
  fromMinorUnits,
  toMinorUnits,
} from '../../planning/planEvidence';
import { db } from './client';
import {
  getUserEntityDocumentRef,
  getUserSingletonDocumentRef,
} from './entityPaths';
import {
  ensureRemoteFinanceWorkspace,
} from './financeWorkspaceRepository';
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
  if (!db) throw new Error('Firestore is not configured');
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
  workspaceRevision: number,
  financeDocumentId: string
): PlanActionResult => ({
  schemaVersion: 1,
  id: input.applicationId,
  userId: input.userId,
  planId: input.planId,
  sourceVersionId: input.sourceVersionId,
  proposalId: input.proposalId,
  previewFingerprint: input.confirmedPreviewFingerprint,
  selectionDigest: planActionSelectionDigest(input.selection),
  actionType: preview.actionType,
  targetKind: preview.targetKind,
  targetId: preview.targetId,
  financeDocumentId,
  targetMonth: preview.targetMonth,
  workspaceRevision,
  postWorkspaceRevision: workspaceRevision + 1,
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
  postEvidenceRevision:
    workspaceRevisionToken(workspaceRevision + 1),
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
  existing.selectionDigest === planActionSelectionDigest(input.selection);

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
  existing.selectionDigest === planActionSelectionDigest(input.selection);

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

  const reviewedWorkspace = await ensureRemoteFinanceWorkspace(
    input.userId
  );
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
      const workspaceMetaRef = getUserSingletonDocumentRef(
        input.userId,
        'workspaceMeta'
      );
      const [
        planSnapshot,
        versionSnapshot,
        resultSnapshot,
        stateSnapshot,
        workspaceMetaSnapshot,
      ] = await Promise.all([
        transaction.get(planRef),
        transaction.get(versionRef),
        transaction.get(resultRef),
        transaction.get(stateRef),
        transaction.get(workspaceMetaRef),
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
      const workspaceMeta = requireDocument<WorkspaceMeta>(
        workspaceMetaSnapshot,
        'invalid_request',
        'Workspace revision metadata is unavailable.'
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

      if (
        workspaceMeta.revision !==
        reviewedWorkspace.workspaceMeta.revision
      ) {
        throw new PlanActionValidationError(
          'stale_evidence',
          'Financial evidence changed after review. Review the action again.'
        );
      }

      const preview = buildPlanActionPreview({
        userId: input.userId,
        plan,
        version,
        proposal,
        data: reviewedWorkspace.data,
        workspaceRevision: workspaceMeta.revision,
        selection: input.selection,
        acceptedEvidenceRevision: state?.acceptedEvidenceRevision,
      });
      requirePreviewMatch(preview, input);

      let targetRef;
      let categoryRef;

      if (
        input.selection.actionType === 'total_budget_update' ||
        input.selection.actionType === 'category_budget_update'
      ) {
        const budget = reviewedWorkspace.data.budgets.find(
          (candidate) => candidate.month === preview.targetMonth
        );

        if (!budget) {
          throw new PlanActionValidationError(
            'target_missing',
            'The target budget no longer exists.'
          );
        }

        targetRef = getUserEntityDocumentRef(
          input.userId,
          'budgets',
          budget.id
        );
        categoryRef =
          input.selection.actionType === 'category_budget_update'
            ? getUserEntityDocumentRef(
                input.userId,
                'categories',
                input.selection.categoryId
              )
            : null;
      } else {
        targetRef = getUserEntityDocumentRef(
          input.userId,
          'savingsGoals',
          input.selection.goalId
        );
        categoryRef = null;
      }

      const targetSnapshot = await transaction.get(targetRef);
      const categorySnapshot = categoryRef
        ? await transaction.get(categoryRef)
        : null;
      let targetValue: Budget | SavingsGoal;
      let financeDocumentId = targetRef.id;

      if (
        input.selection.actionType === 'total_budget_update' ||
        input.selection.actionType === 'category_budget_update'
      ) {
        const budget = requireDocument<Budget>(
          targetSnapshot,
          'target_missing',
          'The target budget entity no longer exists.'
        );

        if (
          budget.userId !== input.userId ||
          budget.month !== preview.targetMonth
        ) {
          throw new PlanActionValidationError(
            'target_unauthorized',
            'The target budget does not belong to this Plan action.'
          );
        }

        let categoryDefault: number | null = null;

        if (input.selection.actionType === 'category_budget_update') {
          if (!categorySnapshot) {
            throw new PlanActionValidationError(
              'target_missing',
              'The selected category no longer exists.'
            );
          }

          const category = requireDocument<Category>(
            categorySnapshot,
            'target_missing',
            'The selected category no longer exists.'
          );

          if (category.id !== input.selection.categoryId) {
            throw new PlanActionValidationError(
              'target_unauthorized',
              'The selected category does not match this action.'
            );
          }

          categoryDefault = category.monthlyBudget;
        }

        assertBudgetMatchesPreview(
          budget,
          preview,
          input.selection,
          categoryDefault
        );

        if (input.selection.actionType === 'total_budget_update') {
          targetValue = {
            ...budget,
            totalBudget: fromMinorUnits(
              preview.proposedValueMinor,
              preview.currency
            ),
            updatedAt: input.occurredAt,
          };
        } else {
          targetValue = {
            ...budget,
            categoryBudgets: {
              ...budget.categoryBudgets,
              [input.selection.categoryId]: fromMinorUnits(
                preview.proposedValueMinor,
                preview.currency
              ),
            },
            updatedAt: input.occurredAt,
          };
        }
      } else if (input.selection.actionType === 'savings_goal_create') {
        if (targetSnapshot.exists()) {
          throw new PlanActionValidationError(
            'current_value_changed',
            'The savings goal was created before this action completed.'
          );
        }

        targetValue = {
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
      } else {
        const goal = requireDocument<SavingsGoal>(
          targetSnapshot,
          'target_missing',
          'The target savings goal no longer exists.'
        );

        if (goal.userId !== input.userId) {
          throw new PlanActionValidationError(
            'target_unauthorized',
            'The target savings goal does not belong to the signed-in account.'
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

        targetValue = {
          ...goal,
          currentAmount: fromMinorUnits(
            preview.proposedValueMinor,
            preview.currency
          ),
          updatedAt: input.occurredAt,
        };
      }

      const result = resultFor(
        input,
        preview,
        workspaceMeta.revision,
        financeDocumentId
      );
      const nextState: PlanActionState = {
        schemaVersion: 1,
        id: 'current',
        userId: input.userId,
        planId: input.planId,
        sourceVersionId: input.sourceVersionId,
        acceptedEvidenceRevision:
          workspaceRevisionToken(workspaceMeta.revision + 1),
        appliedProposalIds: [
          ...(state?.appliedProposalIds || []),
          input.proposalId,
        ],
        lastApplicationId: input.applicationId,
        updatedAt: input.occurredAt,
      };
      const nextMeta: WorkspaceMeta = {
        schemaVersion: 1,
        revision: workspaceMeta.revision + 1,
        lastMutationId: `plan:${input.applicationId}`,
        updatedAt: input.occurredAt,
      };

      transaction.set(targetRef, toJsonSafeValue(targetValue));
      transaction.set(workspaceMetaRef, toJsonSafeValue(nextMeta));
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
    .sort((left, right) =>
      left.appliedAt.localeCompare(right.appliedAt)
    );
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

  const reviewedWorkspace = await ensureRemoteFinanceWorkspace(
    input.userId
  );
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
      const workspaceMetaRef = getUserSingletonDocumentRef(
        input.userId,
        'workspaceMeta'
      );
      const [
        planSnapshot,
        versionSnapshot,
        resultSnapshot,
        stateSnapshot,
        workspaceMetaSnapshot,
      ] = await Promise.all([
        transaction.get(planRef),
        transaction.get(versionRef),
        transaction.get(resultRef),
        transaction.get(stateRef),
        transaction.get(workspaceMetaRef),
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
      const workspaceMeta = requireDocument<WorkspaceMeta>(
        workspaceMetaSnapshot,
        'invalid_request',
        'Workspace revision metadata is unavailable.'
      );
      const state = actionStateFromSnapshot(
        stateSnapshot,
        input.userId,
        input.planId,
        input.sourceVersionId
      );

      if (
        workspaceMeta.revision !==
        reviewedWorkspace.workspaceMeta.revision
      ) {
        throw new PlanActionValidationError(
          'stale_evidence',
          'Financial evidence changed before the outcome was recorded.'
        );
      }

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
        data: reviewedWorkspace.data,
        workspaceRevision: workspaceMeta.revision,
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

      const financeDocumentId =
        preview.actionType === 'category_budget_update'
          ? reviewedWorkspace.data.budgets.find(
              (budget) => budget.month === preview.targetMonth
            )?.id || ''
          : preview.targetId;
      const result: PlanActionResult = {
        schemaVersion: 1,
        id: input.applicationId,
        userId: input.userId,
        planId: input.planId,
        sourceVersionId: input.sourceVersionId,
        proposalId: input.proposalId,
        previewFingerprint: preview.previewFingerprint,
        selectionDigest: planActionSelectionDigest(input.selection),
        actionType: preview.actionType,
        targetKind: preview.targetKind,
        targetId: preview.targetId,
        financeDocumentId,
        targetMonth: preview.targetMonth,
        workspaceRevision: workspaceMeta.revision,
        postWorkspaceRevision: workspaceMeta.revision,
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
        confirmedEvidenceRevision:
          preview.currentEvidenceRevision,
        postEvidenceRevision:
          preview.currentEvidenceRevision,
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

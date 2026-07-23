import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { AppData } from '../../models/finance';
import type {
  FinancialPlan,
  PlanActionProposal,
  PlanActionResult,
  PlanActionState,
  PlanVersion,
} from '../../models/planning';
import {
  buildPlanActionPreview,
  isPlanActionProposalSupported,
  PlanActionValidationError,
  type PlanActionPreview,
  type PlanActionSelection,
} from '../../planning/planActionApplication';
import {
  Button,
  Card,
  Input,
  Text,
} from '../../components/base';
import {
  useColors,
} from '../../context/ThemeContext';
import {
  applyPlanAction,
  getPlanActionState,
  listPlanActionResults,
  recordPlanActionOutcome,
} from '../../services/plan';
import {
  Radius,
  Spacing,
} from '../../theme';
import {
  formatCurrency,
} from '../../utils/format';
import {
  fromMinorUnits,
  toMinorUnits,
} from '../../planning/planEvidence';
import {
  summarizePlanActionResults,
} from '../../planning/planActionPresentation';
import {
  createPlanActionOperationEpoch,
  planActionOwnerKey,
} from '../../planning/planActionOperationEpoch';

interface PlanActionProposalSectionProps {
  data: AppData;
  userId: string;
  plan: FinancialPlan;
  version: PlanVersion;
}

type SavingsMode =
  | { kind: 'update'; goalId: string }
  | { kind: 'create' }
  | null;

const applicationId = (proposalId: string): string => {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `plan-action-${proposalId}-${uuid || `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`}`;
};

const resultLabel = (result: PlanActionResult): string => {
  switch (result.status) {
    case 'success':
      return 'Applied';
    case 'blocked':
      return 'Blocked';
    case 'canceled':
      return 'Canceled';
    case 'partial_failure':
      return 'Partial failure';
    case 'non_retryable_failure':
      return 'Cannot retry';
  }
};

const actionLabel = (preview: PlanActionPreview): string => {
  switch (preview.actionType) {
    case 'total_budget_update':
      return 'Update total budget';
    case 'category_budget_update':
      return 'Update category budget';
    case 'savings_goal_create':
      return 'Create savings goal';
    case 'savings_goal_update':
      return 'Update savings goal';
  }
};

const errorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : 'The Plan action could not be completed.';

export const PlanActionProposalSection = ({
  data,
  userId,
  plan,
  version,
}: PlanActionProposalSectionProps) => {
  const colors = useColors();
  const [results, setResults] = useState<PlanActionResult[]>([]);
  const [actionState, setActionState] = useState<PlanActionState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeProposal, setActiveProposal] =
    useState<PlanActionProposal | null>(null);
  const [savingsMode, setSavingsMode] = useState<SavingsMode>(null);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [review, setReview] = useState<PlanActionPreview | null>(null);
  const [reviewSelection, setReviewSelection] =
    useState<PlanActionSelection | null>(null);
  const [activeApplicationId, setActiveApplicationId] =
    useState<string | null>(null);
  const [operationState, setOperationState] =
    useState<'idle' | 'saving'>('idle');
  const [operationError, setOperationError] =
    useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const loadRequestRef = useRef(0);
  const ownerKey = planActionOwnerKey(
    userId,
    plan.id,
    version.id
  );
  const ownerEpochRef = useRef(
    createPlanActionOperationEpoch(ownerKey)
  );
  ownerEpochRef.current.move(ownerKey);

  const loadResults = useCallback(async () => {
    const operationOwner = ownerEpochRef.current.begin();
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    try {
      const [nextResults, nextState] = await Promise.all([
        listPlanActionResults(userId, plan.id),
        getPlanActionState(userId, plan.id),
      ]);
      if (
        requestId !== loadRequestRef.current ||
        !ownerEpochRef.current.isCurrent(operationOwner)
      ) return;
      setResults(nextResults);
      setActionState(nextState);
      setLoadError(null);
    } catch (error) {
      if (
        requestId !== loadRequestRef.current ||
        !ownerEpochRef.current.isCurrent(operationOwner)
      ) return;
      setLoadError(errorMessage(error));
    }
  }, [ownerKey, plan.id, userId]);

  useEffect(() => {
    setResults([]);
    setActionState(null);
    setActiveProposal(null);
    setReview(null);
    setReviewSelection(null);
    setActiveApplicationId(null);
    setOperationError(null);
    setOperationState('idle');
    setRetryable(false);
    void loadResults();
  }, [loadResults]);

  const versionResults = useMemo(
    () =>
      results.filter(
        (result) =>
          result.sourceVersionId === version.id
      ),
    [results, version.id]
  );

  const latestResultByProposal = useMemo(() => {
    const values = new Map<string, PlanActionResult>();
    for (const result of versionResults) {
      values.set(result.proposalId, result);
    }
    return values;
  }, [versionResults]);

  const progress = useMemo(
    () => summarizePlanActionResults(version.actionProposals, versionResults),
    [version.actionProposals, versionResults]
  );

  const resetReview = () => {
    setReview(null);
    setReviewSelection(null);
    setActiveApplicationId(null);
    setOperationError(null);
    setRetryable(false);
  };

  const beginReview = (proposal: PlanActionProposal) => {
    setActiveProposal(proposal);
    resetReview();
    if (proposal.type === 'budget_adjustment') {
      const selection: PlanActionSelection = proposal.targetEntityId
        ? {
            actionType: 'category_budget_update',
            categoryId: proposal.targetEntityId,
          }
        : { actionType: 'total_budget_update' };
      const preview = buildPlanActionPreview({
        userId,
        plan,
        version,
        proposal,
        data,
        selection,
        acceptedEvidenceRevision:
          actionState?.sourceVersionId === version.id
            ? actionState.acceptedEvidenceRevision
            : null,
      });
      setReviewSelection(selection);
      setReview(preview);
      setActiveApplicationId(applicationId(proposal.id));
    } else {
      setSavingsMode(null);
    }
  };

  const prepareSavingsReview = () => {
    if (!activeProposal || activeProposal.type !== 'savings_contribution') {
      return;
    }
    const nextApplicationId =
      activeApplicationId || applicationId(activeProposal.id);
    let selection: PlanActionSelection;
    if (savingsMode?.kind === 'update') {
      selection = {
        actionType: 'savings_goal_update',
        goalId: savingsMode.goalId,
      };
    } else if (savingsMode?.kind === 'create') {
      const targetMinor = toMinorUnits(
        Number(goalTarget),
        plan.currency
      );
      selection = {
        actionType: 'savings_goal_create',
        goalId: [
          'goal',
          plan.id,
          version.id,
          activeProposal.id,
          nextApplicationId,
        ]
          .join('-')
          .replaceAll('/', '_'),
        goalName,
        targetAmountMinor: targetMinor,
        targetDate: goalDate,
      };
    } else {
      setOperationError('Choose an existing goal or create a new one.');
      return;
    }
    const preview = buildPlanActionPreview({
      userId,
      plan,
      version,
      proposal: activeProposal,
      data,
      selection,
      acceptedEvidenceRevision:
        actionState?.sourceVersionId === version.id
          ? actionState.acceptedEvidenceRevision
          : null,
    });
    setReviewSelection(selection);
    setReview(preview);
    setActiveApplicationId(nextApplicationId);
    setOperationError(null);
  };

  const closeReview = () => {
    if (operationState === 'saving') return;
    resetReview();
  };

  const cancelReview = async () => {
    if (
      !review ||
      !reviewSelection ||
      !activeProposal ||
      !activeApplicationId ||
      review.blocked
    ) {
      closeReview();
      return;
    }
    const operationOwner = ownerEpochRef.current.begin();
    setOperationState('saving');
    try {
      await recordPlanActionOutcome({
        userId,
        planId: plan.id,
        sourceVersionId: version.id,
        proposalId: activeProposal.id,
        applicationId: activeApplicationId,
        selection: reviewSelection,
        status: 'canceled',
        occurredAt: new Date().toISOString(),
      });
      if (!ownerEpochRef.current.isCurrent(operationOwner)) return;
      await loadResults();
      if (!ownerEpochRef.current.isCurrent(operationOwner)) return;
      closeReview();
    } catch (error) {
      if (!ownerEpochRef.current.isCurrent(operationOwner)) return;
      setOperationError(errorMessage(error));
    } finally {
      if (ownerEpochRef.current.isCurrent(operationOwner)) {
        setOperationState('idle');
      }
    }
  };

  const applyReview = async () => {
    if (
      !review ||
      !reviewSelection ||
      !activeProposal ||
      !activeApplicationId ||
      review.blocked
    ) {
      return;
    }
    const operationOwner = ownerEpochRef.current.begin();
    setOperationState('saving');
    setOperationError(null);
    try {
      const result = await applyPlanAction({
        userId,
        planId: plan.id,
        sourceVersionId: version.id,
        proposalId: activeProposal.id,
        applicationId: activeApplicationId,
        selection: reviewSelection,
        confirmedPreviewRevision: review.previewRevision,
        confirmedPreviewFingerprint: review.previewFingerprint,
        confirmedEvidenceRevision: review.currentEvidenceRevision,
        confirmed: true,
        occurredAt: new Date().toISOString(),
      });
      if (result.status !== 'success') {
        throw new PlanActionValidationError(
          'idempotency_conflict',
          'The application id belongs to a non-success outcome.'
        );
      }
      if (!ownerEpochRef.current.isCurrent(operationOwner)) return;
      await loadResults();
      if (!ownerEpochRef.current.isCurrent(operationOwner)) return;
      closeReview();
    } catch (error) {
      if (!ownerEpochRef.current.isCurrent(operationOwner)) return;
      const validationFailure =
        error instanceof PlanActionValidationError;
      setRetryable(!validationFailure);
      setOperationError(
        validationFailure
          ? error.message
          : `${errorMessage(error)} No write was committed; retry is safe.`
      );
      if (validationFailure) {
        try {
          await recordPlanActionOutcome({
            userId,
            planId: plan.id,
            sourceVersionId: version.id,
            proposalId: activeProposal.id,
            applicationId: activeApplicationId,
            selection: reviewSelection,
            status: 'blocked',
            occurredAt: new Date().toISOString(),
          });
          if (!ownerEpochRef.current.isCurrent(operationOwner)) return;
          await loadResults();
          if (!ownerEpochRef.current.isCurrent(operationOwner)) return;
          setReview({
            ...review,
            blocked: true,
            stale: error.code === 'stale_evidence',
            failureCode: error.code,
            failureMessage: error.message,
          });
          setActiveApplicationId(null);
        } catch {
          // The original bounded validation message remains authoritative.
        }
      }
    } finally {
      if (ownerEpochRef.current.isCurrent(operationOwner)) {
        setOperationState('idle');
      }
    }
  };

  const money = (valueMinor: number | null) =>
    valueMinor === null
      ? 'Not created'
      : formatCurrency(
          fromMinorUnits(valueMinor, plan.currency),
          plan.currency
        );

  return (
    <>
      <Card style={styles.sectionCard}>
        <Text variant="h3">Action proposals</Text>
        <Text variant="bodySmall" color="secondary" style={styles.copySpacing}>
          {progress.appliedCount} of {progress.supportedCount} supported actions
          applied. Each action requires its own review and confirmation.
        </Text>
        {version.actionProposals.length === 0 ? (
          <Text variant="bodySmall" color="secondary" style={styles.copySpacing}>
            No action proposals were saved in this version.
          </Text>
        ) : (
          <View style={styles.proposalList}>
            {version.actionProposals.map((proposal) => {
              const latestResult = latestResultByProposal.get(proposal.id);
              const supported = isPlanActionProposalSupported(proposal);
              return (
                <View
                  key={proposal.id}
                  style={[styles.proposalRow, { borderColor: colors.border }]}
                >
                  <View style={styles.rowHeader}>
                    <View style={styles.flexCopy}>
                      <Text variant="h4">{proposal.title}</Text>
                      <Text
                        variant="caption"
                        color={
                          latestResult?.status === 'success'
                            ? 'success'
                            : latestResult?.status === 'blocked' ||
                                latestResult?.status === 'non_retryable_failure'
                              ? 'danger'
                              : 'secondary'
                        }
                      >
                        {latestResult
                          ? resultLabel(latestResult)
                          : supported
                            ? 'Needs review'
                            : 'Review only'}
                      </Text>
                    </View>
                    {supported ? (
                      <Button
                        label="Review action"
                        size="sm"
                        variant="secondary"
                        onPress={() => beginReview(proposal)}
                        disabled={
                          operationState === 'saving' ||
                          latestResult?.status === 'success'
                        }
                      />
                    ) : null}
                  </View>
                  <Text variant="bodySmall" color="secondary">
                    {proposal.description}
                  </Text>
                  <Text variant="caption" color="secondary">
                    Evidence: {(proposal.evidenceRefs || []).join(', ') || 'No bounded references'}
                  </Text>
                  {!supported ? (
                    <Text variant="caption" color="secondary">
                      This proposal cannot change Activity, Reports, Insights,
                      Categories, Recurring Expenses, scenarios, or other app data.
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {activeProposal?.type === 'savings_contribution' && !review ? (
          <View style={[styles.configuration, { borderColor: colors.border }]}>
            <Text variant="h4">Choose the savings action</Text>
            <View style={styles.actionRow}>
              {data.savingsGoals.map((goal) => (
                <Button
                  key={goal.id}
                  label={`Update ${goal.name}`}
                  size="sm"
                  variant={
                    savingsMode?.kind === 'update' &&
                    savingsMode.goalId === goal.id
                      ? 'primary'
                      : 'secondary'
                  }
                  onPress={() =>
                    setSavingsMode({ kind: 'update', goalId: goal.id })
                  }
                />
              ))}
              <Button
                label="Create new goal"
                size="sm"
                variant={savingsMode?.kind === 'create' ? 'primary' : 'secondary'}
                onPress={() => setSavingsMode({ kind: 'create' })}
              />
            </View>
            {savingsMode?.kind === 'create' ? (
              <View style={styles.formStack}>
                <Input
                  placeholder="Savings goal name"
                  value={goalName}
                  onChangeText={setGoalName}
                />
                <Input
                  placeholder={`Target amount (${plan.currency})`}
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                  keyboardType="decimal-pad"
                />
                <Input
                  placeholder="Target date (YYYY-MM-DD)"
                  value={goalDate}
                  onChangeText={setGoalDate}
                  autoCapitalize="none"
                />
              </View>
            ) : null}
            {operationError ? (
              <Text variant="bodySmall" color="danger" accessibilityRole="alert">
                {operationError}
              </Text>
            ) : null}
            <View style={styles.actionRow}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setActiveProposal(null)}
              />
              <Button
                label="Build preview"
                onPress={prepareSavingsReview}
              />
            </View>
          </View>
        ) : null}
      </Card>

      <Card style={styles.sectionCard}>
        <Text variant="h3">Applied-action results</Text>
        {loadError ? (
          <Text variant="bodySmall" color="danger" accessibilityRole="alert">
            {loadError}
          </Text>
        ) : versionResults.length === 0 ? (
          <Text variant="bodySmall" color="secondary" style={styles.copySpacing}>
            No proposal outcomes have been recorded.
          </Text>
        ) : (
          <View style={styles.resultList}>
            {versionResults.map((result) => (
              <View key={result.id} style={styles.resultRow}>
                <Text variant="h4">{resultLabel(result)}</Text>
                <Text variant="bodySmall" color="secondary">
                  {result.actionType.replaceAll('_', ' ')} · {money(
                    result.beforeValueMinor
                  )} to {money(result.proposedValueMinor)} · Change {money(
                    result.changeValueMinor
                  )}
                </Text>
                <Text variant="caption" color="secondary">
                  {result.appliedAt}
                  {result.failureCode ? ` · ${result.failureCode}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Modal
        visible={review !== null}
        transparent
        animationType="fade"
        onRequestClose={closeReview}
      >
        <View style={styles.backdrop}>
          <View
            accessibilityViewIsModal
            style={[styles.modalPanel, { backgroundColor: colors.card }]}
          >
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text variant="h3">
                {review ? actionLabel(review) : 'Review action'}
              </Text>
              {review ? (
                <>
                  <Text variant="bodySmall" color="secondary">
                    Target: {review.targetLabel}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Current: {money(review.currentValueMinor)}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Proposed: {money(review.proposedValueMinor)} {review.currency}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Change: {money(review.changeValueMinor)} {review.currency}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Reason: {review.reason}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Expected effect: {review.expectedEffect}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Reversibility: {review.reversibility}
                  </Text>
                  <Text variant="bodySmall" color="secondary">
                    Evidence: {review.evidenceRefs.join(', ') || 'No bounded references'}
                  </Text>
                  <Text
                    variant="bodySmall"
                    color={review.blocked ? 'danger' : 'success'}
                    accessibilityRole={review.blocked ? 'alert' : undefined}
                  >
                    {review.blocked
                      ? review.failureMessage
                      : 'Current evidence matches the reviewed Plan version.'}
                  </Text>
                </>
              ) : null}
              {operationError ? (
                <Text variant="bodySmall" color="danger" accessibilityRole="alert">
                  {operationError}
                </Text>
              ) : null}
              <View style={styles.modalActions}>
                <Button
                  label={review?.blocked ? 'Close' : 'Cancel action'}
                  variant="secondary"
                  onPress={() => {
                    if (review?.blocked) closeReview();
                    else void cancelReview();
                  }}
                  disabled={operationState === 'saving'}
                />
                {review && !review.blocked ? (
                  <Button
                    label={retryable ? 'Retry action' : actionLabel(review)}
                    onPress={() => void applyReview()}
                    loading={operationState === 'saving'}
                  />
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: Spacing.md,
  },
  copySpacing: {
    marginTop: Spacing.xs,
  },
  proposalList: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  proposalRow: {
    borderBottomWidth: 1,
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  flexCopy: {
    flex: 1,
    minWidth: 180,
  },
  configuration: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    gap: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  formStack: {
    marginTop: Spacing.xs,
  },
  resultList: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  resultRow: {
    gap: Spacing.xs,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalPanel: {
    borderRadius: Radius.sm,
    maxHeight: '88%',
    maxWidth: 520,
    width: '100%',
  },
  modalContent: {
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});

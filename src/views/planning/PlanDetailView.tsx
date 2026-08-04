import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import type { AppData } from '../../models/finance';
import type {
  FinancialPlan,
  PlanVersion,
} from '../../models/planning';
import {
  Button,
  Card,
  Input,
  Text,
} from '../../components/base';
import {
  ConfirmModal,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  ScreenHeader,
  Toast,
} from '../../components/finance';
import {
  AppScroll,
} from '../../components/layout/AppScroll';
import {
  RequireData,
} from '../../components/layout/RequireData';
import {
  useSession,
} from '../../context/SessionContext';
import {
  useColors,
} from '../../context/ThemeContext';
import {
  buildPlanEvidenceSnapshot,
  fromMinorUnits,
} from '../../planning/planEvidence';
import type {
  PlanEvidenceSnapshot,
} from '../../planning/planEvidence.types';
import {
  comparePlanEvidence,
  findOverlappingActivePlans,
  planEvidenceHorizonForSavedPlan,
} from '../../planning/planWorkspace';
import {
  PLAN_LIFECYCLE_LABEL,
  PLAN_STATUS_LABEL,
  PLAN_VERSION_EMPTY_COPY,
  planLifecycleActions,
  type PlanLifecycleTarget,
} from '../../planning/planWorkspacePresentation';
import {
  applyPlanLifecycleChange,
  createManualPlanRevision,
  duplicatePlan,
  loadPlanDetail,
  loadSavedPlans,
} from '../../services/plan';
import {
  Radius,
  Spacing,
  Typography,
} from '../../theme/index';
import {
  formatCurrency,
} from '../../utils/format';
import {
  PlanActionProposalSection,
} from './PlanActionProposalSection';

interface PlanDetailScreenProps {
  planId: string;
  onBack: () => void;
  onPlanChanged:
    (nextPlanId?: string) => void;
}

interface PlanDetailContentProps
  extends PlanDetailScreenProps {
  data: AppData;
  userId: string;
}

const workspaceId = (
  prefix: string
): string => {
  const uuid =
    globalThis.crypto?.randomUUID?.();

  if (uuid) {
    return `${prefix}-${uuid}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

const evidenceForPlan = (
  plan: FinancialPlan,
  data: AppData
): PlanEvidenceSnapshot =>
  buildPlanEvidenceSnapshot({
    user: data.user,
    horizon:
      planEvidenceHorizonForSavedPlan(
        plan
      ),
    transactions: data.transactions,
    categories: data.categories,
    budgets: data.budgets,
    savingsGoals: data.savingsGoals,
    recurringExpenses:
      data.recurringExpenses,
  });

const errorMessage = (
  error: unknown
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'The Plan operation could not be completed.';
};

const PlanDetailContent = ({
  data,
  userId,
  planId,
  onBack,
  onPlanChanged,
}: PlanDetailContentProps) => {
  const colors = useColors();
  const [loadState, setLoadState] =
    useState<'loading' | 'ready' | 'error'>(
      'loading'
    );
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [plan, setPlan] =
    useState<FinancialPlan | null>(null);
  const [versions, setVersions] =
    useState<PlanVersion[]>([]);
  const [
    selectedVersionId,
    setSelectedVersionId,
  ] = useState<string | null>(null);
  const [allPlans, setAllPlans] =
    useState<FinancialPlan[]>([]);
  const [editing, setEditing] =
    useState(false);
  const [summaryDraft, setSummaryDraft] =
    useState('');
  const [pendingLifecycle, setPendingLifecycle] =
    useState<PlanLifecycleTarget | null>(
      null
    );
  const [operationState, setOperationState] =
    useState<'idle' | 'saving'>('idle');
  const [notice, setNotice] =
    useState<string | null>(null);
  const [operationError, setOperationError] =
    useState<string | null>(null);
  const loadRequestRef =
    useRef(0);

  const load = useCallback(async () => {
    const requestId =
      loadRequestRef.current + 1;
    loadRequestRef.current =
      requestId;
    setLoadState('loading');
    setLoadError(null);

    try {
      const [detail, savedPlans] =
        await Promise.all([
          loadPlanDetail(userId, planId),
          loadSavedPlans(userId),
        ]);

      if (
        requestId !==
        loadRequestRef.current
      ) {
        return;
      }

      setPlan(detail.plan);
      setVersions(detail.versions);
      setAllPlans(savedPlans);
      setSelectedVersionId(
        detail.plan.currentVersionId
      );
      setLoadState('ready');
    } catch (error) {
      if (
        requestId !==
        loadRequestRef.current
      ) {
        return;
      }

      setLoadError(errorMessage(error));
      setLoadState('error');
    }
  }, [planId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedVersion = useMemo(
    () =>
      versions.find(
        (version) =>
          version.id ===
          selectedVersionId
      ) ??
      versions.find(
        (version) =>
          version.id ===
          plan?.currentVersionId
      ) ??
      null,
    [
      plan?.currentVersionId,
      selectedVersionId,
      versions,
    ]
  );

  const currentVersion = useMemo(
    () =>
      versions.find(
        (version) =>
          version.id ===
          plan?.currentVersionId
      ) ?? null,
    [plan?.currentVersionId, versions]
  );

  const currentEvidence = useMemo(
    () =>
      plan
        ? evidenceForPlan(plan, data)
        : null,
    [data, plan]
  );

  const evidenceComparison = useMemo(
    () =>
      selectedVersion?.evidenceSummary &&
      currentEvidence
        ? comparePlanEvidence(
            selectedVersion.evidenceSummary,
            currentEvidence
          )
        : null,
    [currentEvidence, selectedVersion]
  );

  const currentVersionIsStale =
    Boolean(
      currentVersion &&
        currentEvidence &&
        currentVersion
          .sourceRevision !==
          currentEvidence
            .baselineRevision
    );

  const overlaps = useMemo(
    () =>
      plan
        ? findOverlappingActivePlans(
            allPlans,
            plan
          )
        : [],
    [allPlans, plan]
  );

  const refreshAfterChange = useCallback(
    async (message: string) => {
      setNotice(message);
      await load();
      onPlanChanged();
    },
    [load, onPlanChanged]
  );

  const saveRevision = useCallback(
    async () => {
      if (
        !plan ||
        !currentVersion ||
        !currentEvidence
      ) {
        return;
      }

      setOperationState('saving');
      setOperationError(null);

      try {
        await createManualPlanRevision({
          userId,
          plan,
          currentVersion,
          summary: summaryDraft,
          versionId:
            workspaceId('plan-version'),
          occurredAt:
            new Date().toISOString(),
        });
        setEditing(false);
        await refreshAfterChange(
          'A new immutable Plan version was saved.'
        );
      } catch (error) {
        setOperationError(
          errorMessage(error)
        );
      } finally {
        setOperationState('idle');
      }
    },
    [
      currentEvidence,
      currentVersion,
      plan,
      refreshAfterChange,
      summaryDraft,
      userId,
    ]
  );

  const createDuplicate = useCallback(
    async () => {
      if (!plan || !currentVersion) {
        return;
      }

      setOperationState('saving');
      setOperationError(null);

      try {
        const result = await duplicatePlan({
          userId,
          sourcePlan: plan,
          sourceVersion: currentVersion,
          planId: workspaceId('plan'),
          versionId:
            workspaceId('plan-version'),
          occurredAt:
            new Date().toISOString(),
        });
        onPlanChanged(result.plan.id);
      } catch (error) {
        setOperationError(
          errorMessage(error)
        );
      } finally {
        setOperationState('idle');
      }
    },
    [
      currentVersion,
      onPlanChanged,
      plan,
      userId,
    ]
  );

  const confirmLifecycle =
    useCallback(async () => {
      if (
        !plan ||
        !currentVersion ||
        !currentEvidence ||
        !pendingLifecycle
      ) {
        return;
      }

      const target =
        pendingLifecycle;
      setPendingLifecycle(null);
      setOperationState('saving');
      setOperationError(null);

      try {
        await applyPlanLifecycleChange({
          userId,
          plan,
          currentVersion,
          currentEvidence,
          status: target,
          confirmed: true,
          occurredAt:
            new Date().toISOString(),
          replacementPlanId:
            target === 'active' &&
            overlaps.length === 1
              ? overlaps[0].id
              : null,
        });
        await refreshAfterChange(
          `Plan ${PLAN_LIFECYCLE_LABEL[
            target
          ].toLowerCase()}d.`
        );
      } catch (error) {
        setOperationError(
          errorMessage(error)
        );
      } finally {
        setOperationState('idle');
      }
    }, [
      currentEvidence,
      currentVersion,
      overlaps,
      pendingLifecycle,
      plan,
      refreshAfterChange,
      userId,
    ]);

  if (loadState === 'loading') {
    return (
      <AppScroll>
        <ScreenHeader
          title="Saved Plan"
          subtitle="Loading owner-only Plan history."
          action={
            <IconButton
              icon="arrow-back"
              label="Return to Plan home"
              onPress={onBack}
            />
          }
        />
        <LoadingState label="Loading Plan detail..." />
      </AppScroll>
    );
  }

  if (loadState === 'error') {
    return (
      <AppScroll>
        <ScreenHeader
          title="Saved Plan"
          subtitle="Saved Plan data could not be read."
          action={
            <IconButton
              icon="arrow-back"
              label="Return to Plan home"
              onPress={onBack}
            />
          }
        />
        <ErrorState
          title="Plan unavailable"
          message={
            loadError ||
            'The saved Plan could not be loaded.'
          }
          onRetry={() => {
            void load();
          }}
        />
      </AppScroll>
    );
  }

  if (
    !plan ||
    !selectedVersion ||
    !currentVersion ||
    !currentEvidence
  ) {
    return (
      <AppScroll>
        <EmptyState
          title="Plan history is incomplete"
          message="The Plan or its current immutable version is missing."
          actionLabel="Return to Plan home"
          onAction={onBack}
        />
      </AppScroll>
    );
  }

  const money = (
    amountMinor: number
  ) =>
    formatCurrency(
      fromMinorUnits(
        amountMinor,
        plan.currency
      ),
      plan.currency
    );

  const lifecycleActions =
    planLifecycleActions(
      plan.status
    ).filter(
      (target) =>
        !(
          target === 'active' &&
          (
            overlaps.length > 1 ||
            currentVersionIsStale
          )
        )
    );

  const lifecycleMessage =
    pendingLifecycle === 'active'
      ? overlaps.length === 1
        ? `Activating this Plan will archive "${overlaps[0].title}" because the periods overlap.`
        : 'Activate this Plan for its saved period? Current deterministic evidence must still match.'
      : pendingLifecycle === 'completed'
        ? 'Mark this active Plan as completed?'
        : 'Archive this Plan? Archived Plans remain readable.';

  return (
    <>
      <AppScroll>
        <ScreenHeader
          leading={
            <IconButton
              icon="arrow-back"
              label="Return to Plan home"
              onPress={onBack}
            />
          }
          title={plan.title}
          subtitle={`${plan.startDate} to ${plan.endDate} · ${PLAN_STATUS_LABEL[plan.status]}`}
        />

        {operationError ? (
          <View
            accessibilityRole="alert"
          >
            <Card
              style={StyleSheet.flatten([
                styles.errorCard,
                {
                  borderColor:
                    colors.statusCritical,
                },
              ])}
            >
              <Text
                variant="bodySmall"
                color="danger"
              >
                {operationError}
              </Text>
            </Card>
          </View>
        ) : null}

        <Card style={styles.sectionCard}>
          <View style={styles.headerRow}>
            <View style={styles.flexCopy}>
              <Text
                variant="caption"
                color="secondary"
                style={styles.label}
              >
                Lifecycle
              </Text>
              <Text variant="h3">
                {
                  PLAN_STATUS_LABEL[
                    plan.status
                  ]
                }
              </Text>
              <Text
                variant="bodySmall"
                color="secondary"
                style={styles.copySpacing}
              >
                Version {plan.versionCount} is current. Lifecycle changes use the Plan service and require confirmation.
              </Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            {lifecycleActions.map(
              (target) => (
                <Button
                  key={target}
                  label={
                    PLAN_LIFECYCLE_LABEL[
                      target
                    ]
                  }
                  variant={
                    target === 'archived'
                      ? 'danger'
                      : 'primary'
                  }
                  disabled={
                    operationState ===
                    'saving'
                  }
                  onPress={() =>
                    setPendingLifecycle(
                      target
                    )
                  }
                />
              )
            )}
            <Button
              label="Revise"
              variant="secondary"
              disabled={
                operationState ===
                'saving'
              }
              onPress={() => {
                setSummaryDraft(
                  currentVersion.summary
                );
                setEditing(true);
              }}
            />
            <Button
              label="Duplicate"
              variant="secondary"
              loading={
                operationState ===
                'saving'
              }
              onPress={() => {
                void createDuplicate();
              }}
            />
          </View>
        </Card>

        {plan.status === 'draft' &&
        overlaps.length > 1 ? (
          <View
            accessibilityRole="alert"
          >
            <Card
              style={StyleSheet.flatten([
                styles.errorCard,
                {
                  borderColor:
                    colors.statusWarning,
                },
              ])}
            >
              <Text variant="h4">
                Multiple active Plan conflicts
              </Text>
              <Text
                variant="bodySmall"
                color="secondary"
                style={styles.copySpacing}
              >
                Resolve the overlapping active Plans separately before activation.
              </Text>
            </Card>
          </View>
        ) : null}

        {plan.status === 'draft' &&
        currentVersionIsStale ? (
          <View
            accessibilityRole="alert"
          >
            <Card
              style={StyleSheet.flatten([
                styles.errorCard,
                {
                  borderColor:
                    colors.statusWarning,
                },
              ])}
            >
              <Text variant="h4">
                Current evidence changed
              </Text>
              <Text
                variant="bodySmall"
                color="secondary"
                style={styles.copySpacing}
              >
                Create a new Plan from current evidence before activation. Summary-only revisions preserve this version's evidence and cannot clear this safeguard.
              </Text>
            </Card>
          </View>
        ) : null}

        {editing ? (
          <Card style={styles.sectionCard}>
            <Text variant="h3">
              Manual revision
            </Text>
            <Text
              variant="bodySmall"
              color="secondary"
              style={styles.copySpacing}
            >
              Saving creates a new immutable version while preserving this version's saved evidence baseline. No provider request is required.
            </Text>
            <Input
              placeholder="Plan summary"
              value={summaryDraft}
              onChangeText={setSummaryDraft}
              multiline
              numberOfLines={5}
              style={styles.summaryInput}
              accessibilityLabel="Manual Plan revision summary"
            />
            <View style={styles.actionRow}>
              <Button
                label="Save new version"
                loading={
                  operationState ===
                  'saving'
                }
                onPress={() => {
                  void saveRevision();
                }}
              />
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() =>
                  setEditing(false)
                }
              />
            </View>
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <Text
            variant="caption"
            color="secondary"
            style={styles.label}
          >
            Selected immutable version
          </Text>
          <Text variant="h3">
            Version {selectedVersion.versionNumber}
          </Text>
          <Text
            variant="body"
            style={styles.copySpacing}
          >
            {selectedVersion.summary}
          </Text>
          <Text
            variant="caption"
            color="tertiary"
            style={styles.copySpacing}
          >
            Baseline {selectedVersion.sourceRevision}
          </Text>
        </Card>

        <Card style={styles.sectionCard}>
          <Text variant="h3">
            Deterministic evidence
          </Text>
          {selectedVersion.evidenceSummary ? (
            <>
              <View style={styles.metricGrid}>
                <View style={styles.metric}>
                  <Text
                    variant="caption"
                    color="secondary"
                  >
                    Coverage
                  </Text>
                  <Text variant="h4">
                    {selectedVersion.evidenceSummary.coverageStatus}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text
                    variant="caption"
                    color="secondary"
                  >
                    Transactions
                  </Text>
                  <Text variant="h4">
                    {selectedVersion.evidenceSummary.transactionCount}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text
                    variant="caption"
                    color="secondary"
                  >
                    Income
                  </Text>
                  <Text variant="h4">
                    {money(selectedVersion.evidenceSummary.recordedIncomeMinor)}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text
                    variant="caption"
                    color="secondary"
                  >
                    Expenses
                  </Text>
                  <Text variant="h4">
                    {money(selectedVersion.evidenceSummary.recordedExpensesMinor)}
                  </Text>
                </View>
              </View>
              {evidenceComparison?.isStale ? (
                <View
                  style={[
                    styles.statusPanel,
                    {
                      borderColor:
                        colors.statusWarning,
                      backgroundColor:
                        colors.backgroundSubtle,
                    },
                  ]}
                  accessibilityRole="alert"
                >
                  <Text variant="h4">
                    Evidence changed
                  </Text>
                  <Text
                    variant="bodySmall"
                    color="secondary"
                    style={styles.copySpacing}
                  >
                    {selectedVersion.id === currentVersion.id
                      ? 'Create a new Plan from current evidence before activation.'
                      : 'This historical version differs from current evidence.'}{' '}
                    {evidenceComparison.changes.length} material field
                    {evidenceComparison.changes.length === 1 ? '' : 's'} changed.
                  </Text>
                  {evidenceComparison.changes.map(
                    (change) => (
                      <Text
                        key={change.field}
                        variant="caption"
                        color="secondary"
                        style={styles.changeRow}
                      >
                        {change.label}: {String(change.previousValue)} to {String(change.currentValue)}
                      </Text>
                    )
                  )}
                </View>
              ) : (
                <Text
                  variant="bodySmall"
                  color="success"
                  style={styles.copySpacing}
                >
                  Current deterministic evidence matches this version.
                </Text>
              )}
            </>
          ) : (
            <Text
              variant="bodySmall"
              color="secondary"
              style={styles.copySpacing}
            >
              {
                PLAN_VERSION_EMPTY_COPY
                  .legacyEvidence
              }
            </Text>
          )}
        </Card>

        <PlanVersionContent
          version={selectedVersion}
          currency={plan.currency}
        />

        <PlanActionProposalSection
          key={`${userId}:${plan.id}:${selectedVersion.id}`}
          data={data}
          userId={userId}
          plan={plan}
          version={selectedVersion}
        />

        <Card style={styles.sectionCard}>
          <Text variant="h3">
            Generation and validation
          </Text>
          {selectedVersion.generation ? (
            <View style={styles.metadataStack}>
              <MetadataRow
                label="Model"
                value={
                  selectedVersion.generation
                    .modelId
                }
              />
              <MetadataRow
                label="Prompt"
                value={
                  selectedVersion.generation
                    .promptVersion
                }
              />
              <MetadataRow
                label="Response schema"
                value={
                  selectedVersion.generation
                    .responseSchemaVersion
                }
              />
              <MetadataRow
                label="Output schema"
                value={String(
                  selectedVersion.generation
                    .outputSchemaVersion
                )}
              />
              <MetadataRow
                label="Attempts"
                value={String(
                  selectedVersion.generation
                    .attemptCount
                )}
              />
              <MetadataRow
                label="Generated"
                value={
                  selectedVersion.generation
                    .generatedAt
                }
              />
            </View>
          ) : (
            <Text
              variant="bodySmall"
              color="secondary"
              style={styles.copySpacing}
            >
              {
                PLAN_VERSION_EMPTY_COPY
                  .manualGeneration
              }
            </Text>
          )}
          <View style={styles.metadataStack}>
            <MetadataRow
              label="Validation state"
              value={
                selectedVersion.validation
                  .state
              }
            />
            <MetadataRow
              label="Validation schema"
              value={String(
                selectedVersion.validation
                  .schemaVersion
              )}
            />
            <MetadataRow
              label="Validated"
              value={
                selectedVersion.validation
                  .validatedAt || 'Not validated'
              }
            />
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text variant="h3">
            Version history
          </Text>
          <View style={styles.versionList}>
            {versions.map((version) => (
              <View
                key={version.id}
                style={[
                  styles.versionRow,
                  {
                    borderColor:
                      colors.borderDefault,
                  },
                ]}
              >
                <View style={styles.flexCopy}>
                  <Text variant="h4">
                    Version {version.versionNumber}
                  </Text>
                  <Text
                    variant="caption"
                    color="secondary"
                  >
                    {version.createdAt} · {version.createdBy}
                  </Text>
                </View>
                <Button
                  label={
                    version.id ===
                    selectedVersion.id
                      ? 'Selected'
                      : 'Review'
                  }
                  size="sm"
                  variant="secondary"
                  disabled={
                    version.id ===
                    selectedVersion.id
                  }
                  onPress={() =>
                    setSelectedVersionId(
                      version.id
                    )
                  }
                />
              </View>
            ))}
          </View>
        </Card>

        <Text
          variant="caption"
          color="tertiary"
          style={styles.disclaimer}
        >
          Saved Plan records are owner-scoped. AI content is advisory, and no proposal changes app data without separate confirmation.
        </Text>
      </AppScroll>

      <ConfirmModal
        visible={pendingLifecycle !== null}
        title={
          pendingLifecycle
            ? `${PLAN_LIFECYCLE_LABEL[pendingLifecycle]} Plan`
            : 'Change Plan'
        }
        message={lifecycleMessage}
        confirmLabel={
          pendingLifecycle === 'active' &&
          overlaps.length === 1
            ? 'Replace and activate'
            : pendingLifecycle
              ? PLAN_LIFECYCLE_LABEL[
                  pendingLifecycle
                ]
              : 'Confirm'
        }
        onConfirm={() => {
          void confirmLifecycle();
        }}
        onCancel={() =>
          setPendingLifecycle(null)
        }
      />
      <Toast message={notice} />
    </>
  );
};

const MetadataRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View style={styles.metadataRow}>
    <Text
      variant="caption"
      color="secondary"
    >
      {label}
    </Text>
    <Text
      variant="bodySmall"
      style={styles.metadataValue}
    >
      {value}
    </Text>
  </View>
);

const PlanVersionContent = ({
  version,
  currency,
}: {
  version: PlanVersion;
  currency: string;
}) => {
  const money = (
    amount: number | null
  ) =>
    amount === null
      ? 'No amount'
      : formatCurrency(
          amount,
          currency
        );

  const sections = [
    {
      title: 'Allocations',
      empty:
        PLAN_VERSION_EMPTY_COPY
          .allocations,
      rows: version.allocations.map(
        (allocation) => ({
          id: allocation.id,
          title: allocation.label,
          detail: `${money(allocation.amount)} · ${allocation.period}`,
        })
      ),
    },
    {
      title: 'Commitments',
      empty:
        PLAN_VERSION_EMPTY_COPY
          .commitments,
      rows: version.commitments.map(
        (commitment) => ({
          id: commitment.id,
          title: commitment.title,
          detail: `${commitment.description}${commitment.amount === null ? '' : ` · ${money(commitment.amount)}`}`,
        })
      ),
    },
    {
      title: 'Recommendations',
      empty:
        PLAN_VERSION_EMPTY_COPY
          .recommendations,
      rows: version.recommendations.map(
        (recommendation) => ({
          id: recommendation.id,
          title: recommendation.title,
          detail: `${recommendation.description} · ${recommendation.priority} priority · Evidence: ${recommendation.evidenceRefs.join(', ') || 'none'}`,
        })
      ),
    },
  ];

  return (
    <>
      {sections.map((section) => (
        <Card
          key={section.title}
          style={styles.sectionCard}
        >
          <Text variant="h3">
            {section.title}
          </Text>
          {section.rows.length === 0 ? (
            <Text
              variant="bodySmall"
              color="secondary"
              style={styles.copySpacing}
            >
              {section.empty}
            </Text>
          ) : (
            <View style={styles.itemList}>
              {section.rows.map((row) => (
                <View
                  key={row.id}
                  style={styles.itemRow}
                >
                  <Text variant="h4">
                    {row.title}
                  </Text>
                  <Text
                    variant="bodySmall"
                    color="secondary"
                    style={styles.copySpacing}
                  >
                    {row.detail}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      ))}
    </>
  );
};

export const PlanDetailScreen = ({
  planId,
  onBack,
  onPlanChanged,
}: PlanDetailScreenProps) => {
  const { remoteUserId } =
    useSession();

  if (!remoteUserId) {
    return (
      <AppScroll>
        <ScreenHeader
          title="Saved Plan"
          subtitle="Cloud-saved Plan history requires a signed-in account."
          action={
            <IconButton
              icon="arrow-back"
              label="Return to Plan home"
              onPress={onBack}
            />
          }
        />
        <EmptyState
          icon="lock"
          title="Sign in to view this Plan"
          message="Guest mode does not load owner-only Plan records."
          actionLabel="Return to Plan home"
          onAction={onBack}
        />
      </AppScroll>
    );
  }

  return (
    <RequireData>
      {(data) => (
        <PlanDetailContent
          data={data}
          userId={remoteUserId}
          planId={planId}
          onBack={onBack}
          onPlanChanged={
            onPlanChanged
          }
        />
      )}
    </RequireData>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: Spacing.md,
  },
  errorCard: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  flexCopy: {
    flex: 1,
    minWidth: 180,
  },
  label: {
    fontWeight:
      Typography.label.fontWeight,
    textTransform: 'uppercase',
  },
  copySpacing: {
    marginTop: Spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  summaryInput: {
    minHeight: 132,
    marginTop: Spacing.md,
    textAlignVertical: 'top',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 130,
    minWidth: 120,
    gap: Spacing.xs,
  },
  statusPanel: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  changeRow: {
    marginTop: Spacing.xs,
  },
  itemList: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  itemRow: {
    gap: Spacing.xs,
  },
  metadataStack: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  metadataValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  versionList: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  versionRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: 1,
    paddingVertical: Spacing.sm,
  },
  disclaimer: {
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },
});

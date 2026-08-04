import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import type {
  AppData,
} from '../../models/finance';

import {
  Button,
  Card,
  Input,
  Text,
} from '../../components/base';

import {
  ScreenHeader,
} from '../../components/finance';

import {
  AppScroll,
} from '../../components/layout/AppScroll';

import {
  RequireData,
} from '../../components/layout/RequireData';

import {
  useFinance,
} from '../../context/FinanceContext';

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
  PLAN_COACH_INPUT_MAX_LENGTH,
  PLAN_CREATION_STEPS,
  acceptPlanDataUse,
  advancePlanCreationStep,
  completePlanGeneration,
  createPlanCreationState,
  failPlanGeneration,
  getPlanAIGuardReason,
  getPlanCreationProgress,
  isPlanCreationStepComplete,
  markPlanDraftReviewed,
  markPlanDraftSaved,
  returnToPreviousPlanCreationStep,
  resetPlanCreationState,
  reviewPlanFinancialContext,
  setPlanCoachInput,
  setPlanConstraints,
  setPlanCreationHorizon,
  setPlanPrimaryGoal,
  startPlanGeneration,
  type PlanCreationHorizon,
  type PlanCreationState,
} from '../../planning/planCreationFlow';

import {
  createEditablePlanDraft,
  type PlanEditableDraft,
} from '../../planning/planDraftAdapter';

import {
  PLAN_CREATION_STEP_PRESENTATION,
  planAIGuardCopy,
  planGenerationStatusCopy,
} from '../../planning/planCreationPresentation';

import {
  mapPlanGenerationFailure,
  planClientAvailabilityCopy,
} from '../../planning/planGenerationPresentation';

import {
  getPlanAppCheckAvailability,
} from '../../services/firebase/appCheck';

import {
  createPlanApiClient,
  saveGeneratedPlanDraft,
  type PlanDraftResponse,
} from '../../services/plan';

import {
  PlanDraftEditor,
} from './PlanDraftEditor';

import {
  PlanStructuredDraftReview,
} from './PlanStructuredDraftReview';

import {
  Radius,
  Spacing,
  Typography,
} from '../../theme/index';

import {
  formatCurrency,
} from '../../utils/format';

interface PlanCreationFlowScreenProps {
  readonly onClose:
    () => void;
}

interface PlanCreationFlowContentProps {
  readonly data:
    AppData;

  readonly isGuest:
    boolean;

  readonly remoteUserId:
    string | null;

  readonly onClose:
    () => void;
}

const localIsoDate = () => {
  const now =
    new Date();

  const localTime =
    new Date(
      now.getTime() -
      now.getTimezoneOffset() *
        60_000
    );

  return localTime
    .toISOString()
    .slice(0, 10);
};

const horizonLabel:
  Record<
    PlanCreationHorizon,
    string
  > = {
    '7_days':
      'Next 7 days',

    '14_days':
      'Next 14 days',

    current_month:
      'Current month',

    selected_month:
      'Selected month',
  };

const constraintOptions = [
  'Keep housing unchanged',
  'Protect recurring bills',
  'Protect savings progress',
  'Focus on flexible spending',
] as const;

const primaryGoalOptions = [
  'Reduce discretionary spending',
  'Prepare for recurring bills',
  'Protect savings progress',
  'Create a balanced spending plan',
] as const;

const ChoiceChip = ({
  label,
  selected,
  onPress,
}: {
  readonly label: string;

  readonly selected:
    boolean;

  readonly onPress:
    () => void;
}) => {
  const colors =
    useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        selected,
      }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.choiceChip,
        {
          backgroundColor:
            selected
              ? colors.actionPrimarySoft
              : colors.backgroundSubtle,

          borderColor:
            selected
              ? colors.actionPrimary
              : colors.borderDefault,
        },
      ]}
    >
      <MaterialIcons
        name={
          selected
            ? 'check-circle'
            : 'radio-button-unchecked'
        }
        size={18}
        color={
          selected
            ? colors.actionPrimary
            : colors.textMuted
        }
      />

      <Text
        variant="bodySmall"
        style={
          selected
            ? {
                color:
                  colors.actionPrimary,
              }
            : undefined
        }
      >
        {label}
      </Text>
    </Pressable>
  );
};

const EvidenceSummary = ({
  evidence,
}: {
  readonly evidence:
    PlanEvidenceSnapshot;
}) => {
  const colors =
    useColors();

  const money = (
    minorUnits: number
  ) =>
    formatCurrency(
      fromMinorUnits(
        minorUnits,
        evidence.currency
      ),
      evidence.currency
    );

  return (
    <View>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text
            variant="caption"
            color="secondary"
          >
            Recorded income
          </Text>

          <Text variant="h4">
            {money(
              evidence
                .totals
                .recordedIncomeMinor
            )}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Text
            variant="caption"
            color="secondary"
          >
            Recorded expenses
          </Text>

          <Text variant="h4">
            {money(
              evidence
                .totals
                .recordedExpensesMinor
            )}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Text
            variant="caption"
            color="secondary"
          >
            After commitments
          </Text>

          <Text variant="h4">
            {money(
              evidence
                .totals
                .availableAfterCommitmentsMinor
            )}
          </Text>
        </View>

        <View style={styles.summaryItem}>
          <Text
            variant="caption"
            color="secondary"
          >
            Evidence coverage
          </Text>

          <Text variant="h4">
            {
              evidence
                .coverage
                .status
            }
          </Text>
        </View>
      </View>

      <Text
        variant="bodySmall"
        color="secondary"
        style={styles.contextMeta}
      >
        {
          evidence
            .period
            .startDate
        } to {
          evidence
            .period
            .endDate
        } · {
          evidence
            .coverage
            .transactionCount
        } recorded transaction{
          evidence
            .coverage
            .transactionCount === 1
            ? ''
            : 's'
        }
      </Text>

      {
        evidence
          .coverage
          .warnings
          .length > 0
          ? (
              <View style={styles.warningList}>
                {
                  evidence
                    .coverage
                    .warnings
                    .map(
                      (warning) => (
                        <View
                          key={
                            warning.code
                          }
                          style={styles.warningRow}
                        >
                          <MaterialIcons
                            name="info-outline"
                            size={18}
                            color={
                              colors.statusWarning
                            }
                          />

                          <Text
                            variant="bodySmall"
                            color="secondary"
                            style={styles.warningCopy}
                          >
                            {
                              warning.message
                            }
                          </Text>
                        </View>
                      )
                    )
                }
              </View>
            )
          : null
      }
    </View>
  );
};

const PlanCreationFlowContent = ({
  data,
  isGuest,
  remoteUserId,
  onClose,
}: PlanCreationFlowContentProps) => {
  const colors =
    useColors();

  const {
    width,
  } =
    useWindowDimensions();

  const isWide =
    width >= 900;

  const actor =
    isGuest
      ? 'guest'
      : 'authenticated';

  const [
    state,
    setState,
  ] =
    useState<
      PlanCreationState
    >(
      () =>
        createPlanCreationState(
          actor
        )
    );

  const [
    goalDraft,
    setGoalDraft,
  ] =
    useState('');

  const [
    coachDraft,
    setCoachDraft,
  ] =
    useState('');

  const [
    selectedMonthDraft,
    setSelectedMonthDraft,
  ] =
    useState('');

  const [
    selectedConstraints,
    setSelectedConstraints,
  ] =
    useState<
      readonly string[]
    >([]);

  const [
    localError,
    setLocalError,
  ] =
    useState<
      string | null
    >(null);

  const [
    draft,
    setDraft,
  ] =
    useState<
      PlanDraftResponse | null
    >(null);

  const [
    generationMessage,
    setGenerationMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    editableDraft,
    setEditableDraft,
  ] =
    useState<
      PlanEditableDraft | null
    >(null);

  const [
    saveStatus,
    setSaveStatus,
  ] =
    useState<
      | 'idle'
      | 'saving'
      | 'saved'
      | 'error'
    >('idle');

  const [
    saveMessage,
    setSaveMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    savedPlanId,
    setSavedPlanId,
  ] =
    useState<
      string | null
    >(null);

  const anchorDate =
    useMemo(
      localIsoDate,
      []
    );

  const latestAllowedMonth =
    anchorDate.slice(
      0,
      7
    );

  useEffect(
    () => {
      setState(
        createPlanCreationState(
          actor
        )
      );

      setGoalDraft('');
      setCoachDraft('');
      setSelectedMonthDraft('');
      setSelectedConstraints([]);
      setLocalError(null);
      setDraft(null);
      setGenerationMessage(null);
      setEditableDraft(null);
      setSaveStatus('idle');
      setSaveMessage(null);
      setSavedPlanId(null);
    },
    [actor]
  );

  const evidence =
    useMemo(
      () => {
        if (!state.horizon) {
          return null;
        }

        try {
          const horizon =
            state.horizon ===
              'selected_month'
              ? {
                  kind:
                    'calendar_month' as const,

                  anchorDate,

                  month:
                    state.selectedMonth ??
                    undefined,
                }
              : {
                  kind:
                    state.horizon,

                  anchorDate,
                };

          return buildPlanEvidenceSnapshot({
            user:
              data.user,

            horizon,

            transactions:
              data.transactions,

            categories:
              data.categories,

            budgets:
              data.budgets,

            savingsGoals:
              data.savingsGoals,

            recurringExpenses:
              data.recurringExpenses,
          });
        } catch {
          return null;
        }
      },
      [
        anchorDate,
        data,
        state.horizon,
        state.selectedMonth,
      ]
    );

  const progress =
    getPlanCreationProgress(
      state
    );

  const presentation =
    PLAN_CREATION_STEP_PRESENTATION[
      state.currentStep
    ];

  const guardReason =
    getPlanAIGuardReason(
      state
    );

  const appCheckAvailability =
    getPlanAppCheckAvailability();

  const apiConfigured =
    Boolean(
      process
        .env
        .EXPO_PUBLIC_PERFIN_API_BASE_URL
        ?.trim()
    );

  const clientUnavailableMessage =
    planClientAvailabilityCopy(
      apiConfigured,
      appCheckAvailability
    );

  const toggleConstraint = (
    value: string
  ) => {
    setDraft(null);
setEditableDraft(null);
setSaveStatus('idle');
setSaveMessage(null);
setSavedPlanId(null);
setGenerationMessage(null);

    setSelectedConstraints(
      (current) =>
        current.includes(value)
          ? current.filter(
              (item) =>
                item !== value
            )
          : [
              ...current,
              value,
            ]
    );
  };

  const applyHorizon = (
    horizon:
      Exclude<
        PlanCreationHorizon,
        'selected_month'
      >
  ) => {
    setLocalError(null);
    setDraft(null);
setEditableDraft(null);
setSaveStatus('idle');
setSaveMessage(null);
setSavedPlanId(null);
setGenerationMessage(null);

    setState(
      (current) =>
        setPlanCreationHorizon(
          current,
          {
            kind:
              horizon,
          }
        )
    );
  };

  const applySelectedMonth =
    () => {
      try {
        setLocalError(null);
        setDraft(null);
setEditableDraft(null);
setSaveStatus('idle');
setSaveMessage(null);
setSavedPlanId(null);
setGenerationMessage(null);

        const nextState =
          setPlanCreationHorizon(
            state,
            {
              kind:
                'selected_month',

              selectedMonth:
                selectedMonthDraft,

              latestAllowedMonth,
            }
          );

        setState(nextState);
      } catch {
        setLocalError(
          'Enter a valid current or past month using YYYY-MM.'
        );
      }
    };

  const handleNext =
    () => {
      try {
        setLocalError(null);

        let next =
          state;

        if (
          next.currentStep ===
          'primary_goal'
        ) {
          next =
            setPlanPrimaryGoal(
              next,
              goalDraft
            );
        }

        if (
          next.currentStep ===
          'constraints'
        ) {
          next =
            setPlanConstraints(
              next,
              selectedConstraints
            );
        }

        if (
          next.currentStep ===
          'coach_input'
        ) {
          next =
            setPlanCoachInput(
              next,
              coachDraft
            );
        }

        next =
          advancePlanCreationStep(
            next
          );

        setState(next);
      } catch {
        setLocalError(
          'Complete the required information before continuing.'
        );
      }
    };

  const handleGenerate =
    async () => {
      if (
        isGuest ||
        !evidence ||
        guardReason ||
        clientUnavailableMessage ||
        state.generationStatus ===
          'loading'
      ) {
        return;
      }

      setLocalError(null);
      setGenerationMessage(null);
      setDraft(null);

      try {
        setState(
          startPlanGeneration(
            state
          )
        );

        const client =
          createPlanApiClient();

        const response =
          await client
            .createDraft(
              evidence,
              {
                primaryGoal:
                  state.primaryGoal,

                constraints:
                  state.constraints,

                coachInput:
                  state.coachInput,
              }
            );

        setDraft(response);

        setEditableDraft(
          createEditablePlanDraft(
            response
          )
        );

        setSaveStatus('idle');
        setSaveMessage(null);
        setSavedPlanId(null);

        setState(
          (current) =>
            completePlanGeneration(
              current
            )
        );
      } catch (error) {
        const failure =
          mapPlanGenerationFailure(
            error
          );

        setDraft(null);
        setEditableDraft(null);
        setSaveStatus('idle');
        setSaveMessage(null);
        setSavedPlanId(null);

        setGenerationMessage(
          failure.message
        );

        setState(
          (current) =>
            failPlanGeneration(
              current,
              failure.status,
              failure.code
            )
        );
      }
    };

  const handleRestart =
    () => {
      setState(
        (current) =>
          resetPlanCreationState(
            current
          )
      );

      setGoalDraft('');
      setCoachDraft('');
      setSelectedMonthDraft('');
      setSelectedConstraints([]);
      setLocalError(null);
      setDraft(null);
      setEditableDraft(null);
      setGenerationMessage(null);
      setSaveStatus('idle');
      setSaveMessage(null);
      setSavedPlanId(null);
    };

  const handleSaveDraft =
    async () => {
      if (
        isGuest ||
        !remoteUserId ||
        !evidence ||
        !draft ||
        !editableDraft ||
        !state.draftReviewed ||
        saveStatus ===
          'saving' ||
        saveStatus ===
          'saved'
      ) {
        return;
      }

      setSaveStatus(
        'saving'
      );

      setSaveMessage(null);

      try {
        const result =
          await saveGeneratedPlanDraft({
            userId:
              remoteUserId,

            primaryGoal:
              state.primaryGoal,

            evidence,

            response:
              draft,

            draft:
              editableDraft,
          });

        setSavedPlanId(
          result.plan.id
        );

        setSaveStatus(
          'saved'
        );

        setSaveMessage(
          'Draft Plan saved. No proposal was applied or activated.'
        );

        setState(
          (current) =>
            markPlanDraftSaved(
              current
            )
        );
      } catch {
        setSaveStatus(
          'error'
        );

        setSaveMessage(
          'The draft could not be saved. Nothing was activated or applied.'
        );
      }
    };

  const canAdvance =
    (() => {
      switch (
        state.currentStep
      ) {
        case 'primary_goal':
          return (
            goalDraft
              .trim()
              .length >= 3
          );

        case 'constraints':
        case 'coach_input':
          return true;

        case 'generate':
          return isPlanCreationStepComplete(
            state
          );

        case 'review':
          return isPlanCreationStepComplete(
            state
          );

        case 'save':
          return false;

        default:
          return isPlanCreationStepComplete(
            state
          );
      }
    })();

  const renderCurrentStep =
    () => {
      switch (
        state.currentStep
      ) {
        case 'overview':
          return (
            <View style={styles.cardStack}>
              <Card>
                <View style={styles.iconTitleRow}>
                  <View
                    style={[
                      styles.largeIcon,
                      {
                        backgroundColor:
                          colors.actionPrimarySoft,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="flag"
                      size={26}
                      color={
                        colors.actionPrimary
                      }
                    />
                  </View>

                  <View style={styles.flexCopy}>
                    <Text variant="h3">
                      Evidence before suggestions
                    </Text>

                    <Text
                      variant="body"
                      color="secondary"
                      style={styles.bodySpacing}
                    >
                      PerFin OS calculates the period, recorded totals, budget context, recurring commitments, savings progress, and eligible coarse location signals before any planning-service request.
                    </Text>
                  </View>
                </View>
              </Card>

              <Card>
                <Text variant="h4">
                  You stay in control
                </Text>

                <Text
                  variant="body"
                  color="secondary"
                  style={styles.bodySpacing}
                >
                  Generated content remains a draft. You can review and edit it before saving. Financial actions require a later, separate confirmation.
                </Text>
              </Card>

              {
                isGuest
                  ? (
                      <Card
                        style={{
                          borderColor:
                            colors.statusWarning,
                        }}
                      >
                        <Text variant="h4">
                          Account required for protected features
                        </Text>

                        <Text
                          variant="body"
                          color="secondary"
                          style={styles.bodySpacing}
                        >
                          Guest mode can preview the creation flow and local evidence context. Secure AI generation and cloud-saved Plan drafts require a signed-in account.
                        </Text>
                      </Card>
                    )
                  : null
              }
            </View>
          );

        case 'horizon':
          return (
            <Card>
              <View style={styles.choiceGrid}>
                {
                  (
                    [
                      '7_days',
                      '14_days',
                      'current_month',
                    ] as const
                  ).map(
                    (horizon) => (
                      <ChoiceChip
                        key={horizon}
                        label={
                          horizonLabel[
                            horizon
                          ]
                        }
                        selected={
                          state.horizon ===
                          horizon
                        }
                        onPress={() =>
                          applyHorizon(
                            horizon
                          )
                        }
                      />
                    )
                  )
                }
              </View>

              <View style={styles.selectedMonthSection}>
                <Text variant="h4">
                  Selected calendar month
                </Text>

                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.bodySpacing}
                >
                  Current or past months only.
                </Text>

                <Input
                  placeholder="YYYY-MM"
                  value={
                    selectedMonthDraft
                  }
                  onChangeText={
                    setSelectedMonthDraft
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={7}
                  accessibilityLabel="Selected Plan month"
                />

                <Button
                  label="Use selected month"
                  variant={
                    state.horizon ===
                      'selected_month'
                      ? 'primary'
                      : 'secondary'
                  }
                  onPress={
                    applySelectedMonth
                  }
                />
              </View>
            </Card>
          );

        case 'financial_context':
          return (
            <Card>
              {
                evidence
                  ? (
                      <>
                        <EvidenceSummary
                          evidence={
                            evidence
                          }
                        />

                        <View style={styles.primaryAction}>
                          <Button
                            label={
                              state
                                .financialContextReviewed
                                ? 'Context reviewed'
                                : 'I reviewed this context'
                            }
                            variant={
                              state
                                .financialContextReviewed
                                ? 'success'
                                : 'primary'
                            }
                            onPress={() =>
                              setState(
                                (current) =>
                                  reviewPlanFinancialContext(
                                    current,
                                    evidence
                                      .baselineRevision
                                  )
                              )
                            }
                          />
                        </View>
                      </>
                    )
                  : (
                      <Text
                        variant="body"
                        color="danger"
                      >
                        The deterministic context could not be prepared for this period. Return to the previous step and choose another horizon.
                      </Text>
                    )
              }
            </Card>
          );

        case 'data_use':
          return (
            <Card>
              <Text variant="h4">
                Included in a protected request
              </Text>

              <View style={styles.disclosureList}>
                <Text
                  variant="bodySmall"
                  color="secondary"
                >
                  • Deterministic evidence snapshot
                </Text>

                <Text
                  variant="bodySmall"
                  color="secondary"
                >
                  • Primary goal and selected constraints
                </Text>

                <Text
                  variant="bodySmall"
                  color="secondary"
                >
                  • Optional coach message
                </Text>
              </View>

              <Text
                variant="h4"
                style={styles.disclosureHeading}
              >
                Excluded from the evidence snapshot
              </Text>

              <View style={styles.disclosureList}>
                <Text
                  variant="bodySmall"
                  color="secondary"
                >
                  • Raw transactions and receipt files
                </Text>

                <Text
                  variant="bodySmall"
                  color="secondary"
                >
                  • Merchant names, notes, and payment methods
                </Text>

                <Text
                  variant="bodySmall"
                  color="secondary"
                >
                  • Coordinates, full addresses, and place IDs
                </Text>
              </View>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked:
                    state
                      .dataUseAccepted,
                }}
                onPress={() => {
                  setDraft(null);
setEditableDraft(null);
setSaveStatus('idle');
setSaveMessage(null);
setSavedPlanId(null);
setGenerationMessage(null);

                  setState(
                    (current) =>
                      acceptPlanDataUse(
                        current,
                        !current
                          .dataUseAccepted
                      )
                  );
                }}
                style={[
                  styles.disclosureControl,
                  {
                    backgroundColor:
                      state
                        .dataUseAccepted
                        ? colors.actionPrimarySoft
                        : colors.backgroundSubtle,

                    borderColor:
                      state
                        .dataUseAccepted
                        ? colors.actionPrimary
                        : colors.borderDefault,
                  },
                ]}
              >
                <MaterialIcons
                  name={
                    state
                      .dataUseAccepted
                      ? 'check-box'
                      : 'check-box-outline-blank'
                  }
                  size={24}
                  color={
                    state
                      .dataUseAccepted
                      ? colors.actionPrimary
                      : colors.textMuted
                  }
                />

                <Text
                  variant="body"
                  style={styles.flexCopy}
                >
                  I understand what the secure Plan request can include.
                </Text>
              </Pressable>
            </Card>
          );

        case 'primary_goal':
          return (
            <Card>
              <Input
                placeholder="What should this Plan help you accomplish?"
                value={goalDraft}
                onChangeText={
                  (value) => {
                    setGoalDraft(value);
                    setDraft(null);
                    setGenerationMessage(null);
                  }
                }
                maxLength={160}
                accessibilityLabel="Primary Plan goal"
              />

              <Text
                variant="caption"
                color="tertiary"
              >
                {
                  goalDraft.length
                }/160
              </Text>

              <View style={styles.choiceGrid}>
                {
                  primaryGoalOptions.map(
                    (option) => (
                      <ChoiceChip
                        key={option}
                        label={option}
                        selected={
                          goalDraft ===
                          option
                        }
                        onPress={() =>
                          setGoalDraft(
                            option
                          )
                        }
                      />
                    )
                  )
                }
              </View>
            </Card>
          );

        case 'constraints':
          return (
            <Card>
              <Text
                variant="body"
                color="secondary"
              >
                Choose up to five constraints. You can continue without selecting one.
              </Text>

              <View style={styles.choiceGrid}>
                {
                  constraintOptions.map(
                    (option) => (
                      <ChoiceChip
                        key={option}
                        label={option}
                        selected={
                          selectedConstraints
                            .includes(
                              option
                            )
                        }
                        onPress={() =>
                          toggleConstraint(
                            option
                          )
                        }
                      />
                    )
                  )
                }
              </View>
            </Card>
          );

        case 'coach_input':
          return (
            <Card>
              <View
                style={[
                  styles.sensitiveWarning,
                  {
                    backgroundColor:
                      colors.backgroundSubtle,

                    borderColor:
                      colors.statusWarning,
                  },
                ]}
              >
                <MaterialIcons
                  name="privacy-tip"
                  size={20}
                  color={
                    colors.statusWarning
                  }
                />

                <Text
                  variant="bodySmall"
                  style={styles.warningCopy}
                >
                  Do not include passwords, account numbers, receipt contents, addresses, government IDs, or other sensitive data.
                </Text>
              </View>

              <Input
                placeholder="Optional context for the Plan coach"
                value={coachDraft}
                onChangeText={
                  (value) => {
                    setCoachDraft(value);
                    setDraft(null);
                    setGenerationMessage(null);
                  }
                }
                maxLength={
                  PLAN_COACH_INPUT_MAX_LENGTH
                }
                multiline
                numberOfLines={6}
                style={styles.multilineInput}
                accessibilityLabel="Optional Plan coach context"
              />

              <Text
                variant="caption"
                color="tertiary"
              >
                {
                  coachDraft.length
                }/{
                  PLAN_COACH_INPUT_MAX_LENGTH
                }
              </Text>
            </Card>
          );

        case 'generate':
          return (
            <Card>
              <View style={styles.iconTitleRow}>
                <View
                  style={[
                    styles.largeIcon,
                    {
                      backgroundColor:
                        colors.actionPrimarySoft,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="auto-awesome"
                    size={26}
                    color={
                      colors.actionPrimary
                    }
                  />
                </View>

                <View style={styles.flexCopy}>
                  <Text variant="h3">
                    Secure generation boundary
                  </Text>

                  <Text
                    variant="body"
                    color="secondary"
                    style={styles.bodySpacing}
                  >
                    The app sends the reviewed evidence, primary goal, constraints, and optional coach context through Firebase Auth and App Check.
                  </Text>
                </View>
              </View>

              <Text
                variant="bodySmall"
                color={
                  generationMessage ||
                  clientUnavailableMessage ||
                  guardReason
                    ? 'danger'
                    : state
                        .generationStatus ===
                        'success'
                      ? 'success'
                      : 'secondary'
                }
                style={styles.statusCopy}
              >
                {
                  generationMessage ??
                  clientUnavailableMessage ??
                  planAIGuardCopy(
                    guardReason
                  ) ??
                  planGenerationStatusCopy(
                    state
                      .generationStatus
                  )
                }
              </Text>

              <Button
                label={
                  isGuest
                    ? 'Sign in required'
                    : state
                        .generationStatus ===
                        'success'
                      ? 'Draft generated'
                      : 'Generate secure draft'
                }
                loading={
                  state
                    .generationStatus ===
                  'loading'
                }
                disabled={
                  isGuest ||
                  Boolean(
                    guardReason
                  ) ||
                  Boolean(
                    clientUnavailableMessage
                  ) ||
                  !evidence ||
                  state
                    .generationStatus ===
                    'success'
                }
                onPress={() => {
                  void handleGenerate();
                }}
                style={styles.primaryAction}
              />

              {
                state
                  .generationStatus ===
                  'success' &&
                draft
                  ? (
                      <Text
                        variant="bodySmall"
                        color="success"
                        style={styles.statusCopy}
                      >
                        The validated draft is ready. Continue to review it.
                      </Text>
                    )
                  : null
              }
            </Card>
          );

        case 'review':
          return (
            <View style={styles.cardStack}>
              {
                draft &&
                editableDraft
                  ? (
                      <>
                        {
                          !state
                            .draftReviewed
                            ? (
                                <PlanDraftEditor
                                  draft={
                                    editableDraft
                                  }
                                  onChange={
                                    (
                                      nextDraft
                                    ) => {
                                      setEditableDraft(
                                        nextDraft
                                      );

                                      setSaveStatus(
                                        'idle'
                                      );

                                      setSaveMessage(
                                        null
                                      );

                                      setSavedPlanId(
                                        null
                                      );
                                    }
                                  }
                                />
                              )
                            : null
                        }

                        <PlanStructuredDraftReview
                          draft={draft}
                          output={
                            editableDraft
                          }
                        />

                        <Card>
                          <Text variant="h4">
                            Review confirmation
                          </Text>

                          <Text
                            variant="body"
                            color="secondary"
                            style={styles.bodySpacing}
                          >
                            Confirm only that you reviewed this draft. No financial action is applied by this control.
                          </Text>

                          <Button
                            label={
                              state
                                .draftReviewed
                                ? 'Draft reviewed'
                                : 'I reviewed this draft'
                            }
                            variant={
                              state
                                .draftReviewed
                                ? 'success'
                                : 'primary'
                            }
                            disabled={
                              state
                                .draftReviewed
                            }
                            onPress={() =>
                              setState(
                                (current) =>
                                  markPlanDraftReviewed(
                                    current
                                  )
                              )
                            }
                            style={styles.primaryAction}
                          />
                        </Card>
                      </>
                    )
                  : (
                      <Card>
                        <Text
                          variant="body"
                          color="danger"
                        >
                          A validated structured draft is required before review.
                        </Text>
                      </Card>
                    )
              }
            </View>
          );

        case 'save':
          return (
            <Card>
              <Text variant="h3">
                Save as a draft Plan
              </Text>

              <Text
                variant="body"
                color="secondary"
                style={styles.bodySpacing}
              >
                This creates an owner-only draft and immutable version 1. It does not activate the Plan or apply any generated proposal.
              </Text>

              {
                !remoteUserId
                  ? (
                      <Text
                        variant="bodySmall"
                        color="danger"
                        style={styles.statusCopy}
                      >
                        An authenticated account is required to save this draft.
                      </Text>
                    )
                  : null
              }

              {
                saveMessage
                  ? (
                      <Text
                        variant="bodySmall"
                        color={
                          saveStatus ===
                            'saved'
                            ? 'success'
                            : 'danger'
                        }
                        style={styles.statusCopy}
                      >
                        {saveMessage}
                      </Text>
                    )
                  : null
              }

              {
                savedPlanId
                  ? (
                      <Text
                        variant="caption"
                        color="tertiary"
                        style={styles.statusCopy}
                      >
                        Saved draft ID: {
                          savedPlanId
                        }
                      </Text>
                    )
                  : null
              }

              {
                saveStatus ===
                  'saved'
                  ? (
                      <View style={styles.completionActions}>
                        <Button
                          label="Return to Plan home"
                          variant="secondary"
                          onPress={onClose}
                          style={styles.completionButton}
                          accessibilityLabel="Return to Plan home after saving the draft"
                        />

                        <Button
                          label="Create another Plan"
                          onPress={
                            handleRestart
                          }
                          style={styles.completionButton}
                          accessibilityLabel="Restart the Plan creation flow"
                        />
                      </View>
                    )
                  : null
              }

              {saveStatus !== 'saved' ? (
                <Button
                  label="Save draft Plan"
                  loading={
                    saveStatus ===
                      'saving'
                  }
                  disabled={
                    isGuest ||
                    !remoteUserId ||
                    !draft ||
                    !editableDraft ||
                    !state
                      .draftReviewed ||
                    saveStatus ===
                      'saving'
                  }
                  onPress={() => {
                    void handleSaveDraft();
                  }}
                  style={
                    styles.primaryAction
                  }
                />
              ) : null}
            </Card>
          );
      }
    };

  return (
    <AppScroll>
      <ScreenHeader
        title="Create a Plan"
        subtitle="A ten-step flow grounded in verified financial evidence."
        action={
          <Button
            label="Close"
            size="sm"
            variant="secondary"
            onPress={onClose}
          />
        }
      />

      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor:
              colors.backgroundSubtle,
          },
        ]}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now:
            progress.percent,
          text:
            `Step ${progress.stepNumber} of ${progress.totalSteps}`,
        }}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor:
                colors.actionPrimary,

              width:
                `${progress.percent}%`,
            },
          ]}
        />
      </View>

      <Text
        variant="caption"
        color="secondary"
        style={styles.progressCopy}
      >
        Step {
          progress.stepNumber
        } of {
          progress.totalSteps
        }
      </Text>

      <View
        style={[
          styles.layout,
          isWide
            ? styles.layoutWide
            : styles.layoutNarrow,
        ]}
      >
        <Card
          style={StyleSheet.flatten([
            styles.stepRail,
            isWide
              ? styles.stepRailWide
              : styles.stepRailNarrow,
          ])}
        >
          {
            PLAN_CREATION_STEPS.map(
              (
                step,
                index
              ) => {
                const active =
                  step ===
                  state.currentStep;

                const complete =
                  index <
                  progress.stepNumber -
                    1;

                return (
                  <View
                    key={step}
                    style={styles.railRow}
                  >
                    <View
                      style={[
                        styles.railMarker,
                        {
                          backgroundColor:
                            active ||
                            complete
                              ? colors.actionPrimary
                              : colors.backgroundSubtle,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{
                          color:
                            active ||
                            complete
                              ? colors.textInverse
                              : colors.textSecondary,
                        }}
                      >
                        {
                          complete
                            ? '✓'
                            : index + 1
                        }
                      </Text>
                    </View>

                    <Text
                      variant="bodySmall"
                      color={
                        active
                          ? 'primary'
                          : 'secondary'
                      }
                      style={
                        active
                          ? styles.activeRailText
                          : undefined
                      }
                    >
                      {
                        PLAN_CREATION_STEP_PRESENTATION[
                          step
                        ].title
                      }
                    </Text>
                  </View>
                );
              }
            )
          }
        </Card>

        <View style={styles.stepContent}>
          <Text
            variant="caption"
            color="secondary"
            style={styles.eyebrow}
          >
            {
              presentation.eyebrow
            }
          </Text>

          <Text variant="h2">
            {
              presentation.title
            }
          </Text>

          <Text
            variant="body"
            color="secondary"
            style={styles.stepDescription}
          >
            {
              presentation.description
            }
          </Text>

          {
            localError
              ? (
                  <View
                    style={[
                      styles.errorPanel,
                      {
                        borderColor:
                          colors.statusCritical,

                        backgroundColor:
                          colors.backgroundSubtle,
                      },
                    ]}
                  >
                    <Text
                      variant="bodySmall"
                      color="danger"
                    >
                      {localError}
                    </Text>
                  </View>
                )
              : null
          }

          {
            renderCurrentStep()
          }

          <View style={styles.navigationActions}>
            <Button
              label="Back"
              variant="secondary"
              disabled={
                state.currentStep ===
                'overview'
              }
              onPress={() => {
                setLocalError(null);

                setState(
                  (current) =>
                    returnToPreviousPlanCreationStep(
                      current
                    )
                );
              }}
              style={styles.navigationButton}
            />

            <Button
              label={
                state.currentStep ===
                  'coach_input'
                  ? 'Review generation'
                  : state.currentStep ===
                      'generate'
                    ? 'Review draft'
                    : state.currentStep ===
                        'review'
                      ? 'Continue to save'
                      : 'Continue'
              }
              disabled={
                !canAdvance
              }
              onPress={
                handleNext
              }
              style={styles.navigationButton}
            />
          </View>

          <Text
            variant="caption"
            color="tertiary"
            style={styles.disclaimer}
          >
            Educational planning only. PerFin OS does not provide legal, tax, investment, credit, banking, or other regulated professional advice.
          </Text>
        </View>
      </View>
    </AppScroll>
  );
};

export const PlanCreationFlowScreen = ({
  onClose,
}: PlanCreationFlowScreenProps) => {
  const {
    isGuest,
  } =
    useFinance();

  const {
    remoteUserId,
  } =
    useSession();

  return (
    <RequireData>
      {
        (data) => (
          <PlanCreationFlowContent
            data={data}
            isGuest={isGuest}
            remoteUserId={
              remoteUserId
            }
            onClose={onClose}
          />
        )
      }
    </RequireData>
  );
};

const styles =
  StyleSheet.create({
    progressTrack: {
      width:
        '100%',

      height:
        8,

      borderRadius:
        Radius.round,

      overflow:
        'hidden',
    },

    progressFill: {
      height:
        '100%',

      borderRadius:
        Radius.round,
    },

    progressCopy: {
      marginTop:
        Spacing.sm,

      marginBottom:
        Spacing.lg,
    },

    layout: {
      width:
        '100%',

      gap:
        Spacing.lg,

      alignItems:
        'flex-start',
    },

    layoutWide: {
      flexDirection:
        'row',
    },

    layoutNarrow: {
      flexDirection:
        'column',
    },

    stepRail: {
      gap:
        Spacing.md,
    },

    stepRailWide: {
      width:
        280,

      flexShrink:
        0,
    },

    stepRailNarrow: {
      width:
        '100%',
    },

    railRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        Spacing.sm,
    },

    railMarker: {
      width:
        28,

      height:
        28,

      borderRadius:
        Radius.round,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    activeRailText: {
      fontWeight:
        Typography.label.fontWeight,
    },

    stepContent: {
      flex:
        1,

      minWidth:
        0,

      width:
        '100%',
    },

    eyebrow: {
      textTransform:
        'uppercase',

      letterSpacing:
        0.4,

      fontWeight:
        Typography.label.fontWeight,
    },

    stepDescription: {
      marginTop:
        Spacing.sm,

      marginBottom:
        Spacing.lg,

      maxWidth:
        760,
    },

    errorPanel: {
      borderWidth:
        1,

      borderRadius:
        Radius.sm,

      padding:
        Spacing.md,

      marginBottom:
        Spacing.md,
    },

    cardStack: {
      gap:
        Spacing.md,
    },

    iconTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        Spacing.md,
    },

    largeIcon: {
      width:
        48,

      height:
        48,

      borderRadius:
        Radius.md,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    flexCopy: {
      flex:
        1,

      minWidth:
        0,
    },

    bodySpacing: {
      marginTop:
        Spacing.sm,
    },

    choiceGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        Spacing.sm,

      marginTop:
        Spacing.md,
    },

    choiceChip: {
      minHeight:
        48,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        Spacing.sm,

      borderWidth:
        1,

      borderRadius:
        Radius.round,

      paddingHorizontal:
        Spacing.md,

      paddingVertical:
        Spacing.sm,
    },

    selectedMonthSection: {
      marginTop:
        Spacing.xl,
    },

    summaryGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        Spacing.lg,
    },

    summaryItem: {
      flexGrow:
        1,

      flexBasis:
        150,

      minWidth:
        140,

      gap:
        Spacing.xs,
    },

    contextMeta: {
      marginTop:
        Spacing.lg,
    },

    warningList: {
      gap:
        Spacing.sm,

      marginTop:
        Spacing.md,
    },

    warningRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        Spacing.sm,
    },

    warningCopy: {
      flex:
        1,
    },

    disclosureHeading: {
      marginTop:
        Spacing.lg,
    },

    disclosureList: {
      gap:
        Spacing.sm,

      marginTop:
        Spacing.md,
    },

    disclosureControl: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        Spacing.md,

      borderWidth:
        1,

      borderRadius:
        Radius.md,

      padding:
        Spacing.md,

      marginTop:
        Spacing.xl,
    },

    sensitiveWarning: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        Spacing.sm,

      borderWidth:
        1,

      borderRadius:
        Radius.sm,

      padding:
        Spacing.md,

      marginBottom:
        Spacing.md,
    },

    multilineInput: {
      minHeight:
        150,
    },

    statusCopy: {
      marginTop:
        Spacing.lg,
    },

    primaryAction: {
      marginTop:
        Spacing.lg,
    },

    completionActions: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        Spacing.md,

      marginTop:
        Spacing.lg,
    },

    completionButton: {
      flexGrow:
        1,

      flexBasis:
        180,
    },

    navigationActions: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',

      gap:
        Spacing.md,

      marginTop:
        Spacing.xl,
    },

    navigationButton: {
      flexGrow:
        1,

      flexBasis:
        160,
    },

    disclaimer: {
      textAlign:
        'center',

      marginTop:
        Spacing.xl,
    },
  });

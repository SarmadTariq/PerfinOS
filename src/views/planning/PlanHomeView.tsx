/**
 * PlanView — structured planning flow built from current Activity context.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  CategoryBadge,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { calculateActivitySummary, useActivityFilters } from '../../context/ActivityFilterContext';
import { useColors } from '../../context/ThemeContext';
import type { FinancialPlan } from '../../models/planning';
import {
  PLAN_SAVED_STATE_COPY,
  PLAN_STATUS_LABEL,
} from '../../planning/planWorkspacePresentation';
import { filterTransactions, sortTransactions } from '../../repositories/AnalyticsRepository';
import { Radius, Spacing, Typography } from '../../theme';
import { formatCurrency, getMonthKey, readableMonth } from '../../utils/format';

type PlanHomeScreenProps = {
  showBackButton?: boolean;
  showProfileButton?: boolean;

  onStartPlan:
    () => void;

  savedPlans: FinancialPlan[];
  savedPlansState:
    | 'loading'
    | 'ready'
    | 'error'
    | 'signed-out';
  savedPlansError?: string | null;
  onRetrySavedPlans: () => void;
  onOpenPlan: (planId: string) => void;
};

type PlanningStep = {
  title: string;
  description: string;
  status: 'ready' | 'watch' | 'needs-action';
  actionLabel: string;
  route: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

const statusConfig = {
  ready: {
    label: 'Ready',
    colorKey: 'success',
  },
  watch: {
    label: 'Watch',
    colorKey: 'warning',
  },
  'needs-action': {
    label: 'Action needed',
    colorKey: 'danger',
  },
} as const;

const rangeLabel = (startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return 'All available activity';
  if (startDate && endDate) return `${startDate} to ${endDate}`;
  if (startDate) return `${startDate} to today`;
  return `Until ${endDate}`;
};

const SavedPlansSection = ({
  plans,
  state,
  error,
  onRetry,
  onOpen,
}: {
  plans: FinancialPlan[];
  state: PlanHomeScreenProps['savedPlansState'];
  error?: string | null;
  onRetry: () => void;
  onOpen: (planId: string) => void;
}) => {
  const colors = useColors();

  if (state === 'loading') {
    return (
      <LoadingState
        label={
          PLAN_SAVED_STATE_COPY.loading
        }
      />
    );
  }

  if (state === 'error') {
    return (
      <ErrorState
        title={
          PLAN_SAVED_STATE_COPY.error
            .title
        }
        message={
          error ||
          PLAN_SAVED_STATE_COPY.error
            .message
        }
        onRetry={onRetry}
      />
    );
  }

  if (state === 'signed-out') {
    return (
      <EmptyState
        icon="cloud-off"
        title={
          PLAN_SAVED_STATE_COPY.signedOut
            .title
        }
        message={
          PLAN_SAVED_STATE_COPY.signedOut
            .message
        }
      />
    );
  }

  if (plans.length === 0) {
    return (
      <EmptyState
        icon="flag"
        title={
          PLAN_SAVED_STATE_COPY.empty
            .title
        }
        message={
          PLAN_SAVED_STATE_COPY.empty
            .message
        }
      />
    );
  }

  return (
    <View style={styles.savedPlanList}>
      {plans.map((plan) => {
        const statusColor =
          plan.status === 'active'
            ? colors.success
            : plan.status === 'archived'
              ? colors.textTertiary
              : plan.status === 'completed'
                ? colors.primary
                : colors.warning;

        return (
          <Card
            key={plan.id}
            style={styles.savedPlanCard}
          >
            <View style={styles.rowBetween}>
              <View style={styles.savedPlanCopy}>
                <Text variant="h4">
                  {plan.title}
                </Text>
                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.sectionCopy}
                >
                  {plan.startDate} to {plan.endDate}
                </Text>
                <Text
                  variant="caption"
                  color="tertiary"
                  style={styles.sectionCopy}
                >
                  {plan.versionCount} immutable version
                  {plan.versionCount === 1 ? '' : 's'}
                </Text>
              </View>
              <CategoryBadge
                label={
                  PLAN_STATUS_LABEL[
                    plan.status
                  ]
                }
                color={statusColor}
                icon="flag"
                library="mi"
              />
            </View>
            <View style={styles.savedPlanAction}>
              <Button
                label="Open Plan"
                variant="secondary"
                onPress={() => onOpen(plan.id)}
                accessibilityLabel={`Open ${plan.title}`}
              />
            </View>
          </Card>
        );
      })}
    </View>
  );
};

export const PlanHomeScreen = ({
  showBackButton = true,
  showProfileButton = false,
  onStartPlan,
  savedPlans,
  savedPlansState,
  savedPlansError,
  onRetrySavedPlans,
  onOpenPlan,
}: PlanHomeScreenProps) => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const colors = useColors();
      const { dateRange, frequencyFilter } = useActivityFilters();

      const periodTransactions = useMemo(
        () =>
          sortTransactions(
            filterTransactions(data.transactions, {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
              frequency: frequencyFilter,
            }),
            'date-desc'
          ),
        [data.transactions, dateRange.endDate, dateRange.startDate, frequencyFilter]
      );

      const summary = useMemo(() => calculateActivitySummary(periodTransactions), [periodTransactions]);
      const monthKey = dateRange.startDate?.slice(0, 7) || dateRange.endDate?.slice(0, 7) || getMonthKey();
      const budget = data.budgets.find((item) => item.month === monthKey);
      const totalBudget = budget?.totalBudget || data.categories.reduce((sum, category) => sum + category.monthlyBudget, 0);
      const budgetUsedPercent = totalBudget > 0 ? Math.round((summary.expenses / totalBudget) * 100) : 0;
      const activeGoalCount = data.savingsGoals.filter((goal) => goal.currentAmount < goal.targetAmount).length;
      const activeRecurringCount = data.recurringExpenses.filter((expense) => expense.status === 'active').length;
      const recurringSpend = periodTransactions
        .filter((transaction) => transaction.type === 'expense' && transaction.isRecurring)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const recurringLoadPercent = summary.expenses > 0 ? Math.round((recurringSpend / summary.expenses) * 100) : 0;

      const steps: PlanningStep[] = [
        {
          title: 'Review the activity period',
          description: `${dateRange.label} · ${rangeLabel(dateRange.startDate, dateRange.endDate)} · ${summary.transactionCount} transaction${summary.transactionCount === 1 ? '' : 's'}.`,
          status: summary.transactionCount > 0 ? 'ready' : 'watch',
          actionLabel: 'Adjust Activity',
          route: 'Transactions',
          icon: 'receipt-long',
        },
        {
          title: 'Check budget pressure',
          description:
            totalBudget > 0
              ? `${budgetUsedPercent}% of ${readableMonth(monthKey)} budget used for the selected period.`
              : 'No budget baseline found yet. Add one to compare spending pressure.',
          status: totalBudget === 0 ? 'needs-action' : budgetUsedPercent >= 90 ? 'needs-action' : budgetUsedPercent >= 75 ? 'watch' : 'ready',
          actionLabel: 'Open Budgets',
          route: 'Budgets',
          icon: 'speed',
        },
        {
          title: 'Protect savings goals',
          description:
            activeGoalCount > 0
              ? `${activeGoalCount} active savings goal${activeGoalCount === 1 ? '' : 's'} still need funding decisions.`
              : 'No active savings gap detected. Add goals if you want the plan to track targets.',
          status: activeGoalCount > 0 && summary.netCashFlow < 0 ? 'watch' : activeGoalCount > 0 ? 'ready' : 'watch',
          actionLabel: 'Open Goals',
          route: 'SavingsGoals',
          icon: 'savings',
        },
        {
          title: 'Audit recurring load',
          description:
            activeRecurringCount > 0
              ? `${activeRecurringCount} active recurring item${activeRecurringCount === 1 ? '' : 's'} · ${recurringLoadPercent}% of selected expenses.`
              : 'No active recurring expenses are tracked yet.',
          status: recurringLoadPercent >= 35 ? 'needs-action' : recurringLoadPercent >= 20 ? 'watch' : 'ready',
          actionLabel: 'Open Recurring',
          route: 'RecurringExpenses',
          icon: 'autorenew',
        },
        {
          title: 'Generate the period report',
          description: 'Use the selected Activity context to create a saved report summary after reviewing the plan.',
          status: 'ready',
          actionLabel: 'Open Reports',
          route: 'Reports',
          icon: 'summarize',
        },
      ];

      const focusStep = steps.find((step) => step.status === 'needs-action') || steps.find((step) => step.status === 'watch') || steps[0];
      const frequencyCopy =
        frequencyFilter === 'recurring'
          ? 'Recurring transactions only'
          : frequencyFilter === 'one-time'
            ? 'One-time transactions only'
            : 'Recurring and one-time transactions';

      return (
        <AppScroll>
          <ScreenHeader
            title="Your Plan"
            subtitle="Turn Activity signals into the next planning action."
            action={
              showBackButton ? (
                <IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />
              ) : showProfileButton ? (
                <IconButton
                  icon="person"
                  label="Open profile"
                  onPress={() => navigation.navigate('Profile')}
                />
              ) : undefined
            }
          />

          <View style={styles.sectionHeader}>
            <Text variant="h3">
              Saved Plans
            </Text>
            <Text
              variant="bodySmall"
              color="secondary"
              style={styles.sectionCopy}
            >
              Saved history stays readable without an AI provider request.
            </Text>
          </View>

          <View style={styles.savedPlansSection}>
            <SavedPlansSection
              plans={savedPlans}
              state={savedPlansState}
              error={savedPlansError}
              onRetry={onRetrySavedPlans}
              onOpen={onOpenPlan}
            />
          </View>

          <Card style={styles.heroCard}>
            <View style={styles.rowBetween}>
              <View style={styles.heroCopy}>
                <Text variant="caption" color="secondary" style={styles.overline}>
                  Current planning context
                </Text>
                <Text variant="h3">{dateRange.label}</Text>
                <Text variant="bodySmall" color="secondary" style={styles.sectionCopy}>
                  {rangeLabel(dateRange.startDate, dateRange.endDate)} · {frequencyCopy}
                </Text>
              </View>
              <CategoryBadge label={focusStep.status === 'ready' ? 'Plan ready' : 'Review needed'} color={focusStep.status === 'ready' ? colors.success : colors.warning} icon="flag" library="mi" />
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text variant="caption" color="secondary" style={styles.overline}>
                  Income
                </Text>
                <Text variant="h4">{formatCurrency(summary.income, data.user.currency)}</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text variant="caption" color="secondary" style={styles.overline}>
                  Expenses
                </Text>
                <Text variant="h4">{formatCurrency(summary.expenses, data.user.currency)}</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text variant="caption" color="secondary" style={styles.overline}>
                  Net
                </Text>
                <Text variant="h4">{formatCurrency(summary.netCashFlow, data.user.currency)}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <Button
                label="Create a Plan"
                onPress={onStartPlan}
                style={styles.heroAction}
                accessibilityLabel="Start creating a new Plan"
              />

              <Button
                label="Adjust activity filters"
                onPress={() =>
                  navigation.navigate(
                    'Transactions'
                  )
                }
                variant="secondary"
                style={styles.heroAction}
              />

              <Button
                label={focusStep.actionLabel}
                onPress={() =>
                  navigation.navigate(
                    focusStep.route
                  )
                }
                variant="secondary"
                style={styles.heroAction}
              />
            </View>
          </Card>

          <View style={styles.sectionHeader}>
            <Text variant="h3">Planning steps</Text>
            <Text variant="bodySmall" color="secondary" style={styles.sectionCopy}>
              Work top to bottom. The first watch or action-needed item becomes the recommended next move.
            </Text>
          </View>

          {steps.map((step, index) => {
            const config = statusConfig[step.status];
            const color =
              config.colorKey === 'success'
                ? colors.success
                : config.colorKey === 'warning'
                  ? colors.warning
                  : colors.danger;

            return (
              <Card key={step.title} style={styles.stepCard}>
                <View style={styles.stepRow}>
                  <View style={[styles.stepIcon, { backgroundColor: `${color}1F` }]}>
                    <MaterialIcons name={step.icon} size={18} color={color} />
                  </View>

                  <View style={styles.stepCopy}>
                    <View style={styles.stepTitleRow}>
                      <Text variant="caption" color="secondary" style={styles.overline}>
                        Step {index + 1}
                      </Text>
                      <CategoryBadge label={config.label} color={color} icon="circle" library="mi" />
                    </View>

                    <Text variant="h4" style={styles.stepTitle}>
                      {step.title}
                    </Text>
                    <Text variant="bodySmall" color="secondary" style={styles.sectionCopy}>
                      {step.description}
                    </Text>

                    <View style={styles.stepAction}>
                      <Button label={step.actionLabel} onPress={() => navigation.navigate(step.route)} variant={step.status === 'needs-action' ? 'primary' : 'secondary'} />
                    </View>
                  </View>
                </View>
              </Card>
            );
          })}

          <Text variant="caption" color="tertiary" style={styles.disclaimer}>
            Educational planning only. PerFin OS does not provide legal, tax, investment, banking, or financial advice.
          </Text>
        </AppScroll>
      );
    }}
  </RequireData>
);


const styles = StyleSheet.create({
  heroCard: {
    marginBottom: Spacing.lg,
  },
  savedPlansSection: {
    marginBottom: Spacing.xl,
  },
  savedPlanList: {
    gap: Spacing.md,
  },
  savedPlanCard: {
    gap: Spacing.md,
  },
  savedPlanCopy: {
    flex: 1,
    minWidth: 180,
  },
  savedPlanAction: {
    alignSelf: 'flex-start',
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroCopy: {
    flex: 1,
    minWidth: 180,
    gap: Spacing.xs,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionCopy: {
    marginTop: Spacing.xs,
  },
  overline: {
    letterSpacing: 0.1,
    fontWeight: Typography.label.fontWeight,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  summaryItem: {
    flexGrow: 1,
    flexBasis: 96,
    minWidth: 96,
    gap: Spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  heroAction: {
    flexGrow: 1,
    flexBasis: 160,
  },
  stepCard: {
    marginBottom: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  stepTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  stepTitle: {
    marginTop: Spacing.xs,
  },
  stepAction: {
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
});

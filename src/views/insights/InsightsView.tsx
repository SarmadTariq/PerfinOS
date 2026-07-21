/**
 * InsightsView — decision center for what matters, why it matters, and the next action.
 */
import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import { CategoryBadge, EmptyState, IconButton, ScreenHeader } from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { calculateActivitySummary, useActivityFilters } from '../../context/ActivityFilterContext';
import { useInsights } from '../../context/FinanceContext';
import { useColors } from '../../context/ThemeContext';
import { AppData, InsightSeverity, Transaction } from '../../models/finance';
import { calculateBudgetHealth, filterTransactions, sortTransactions } from '../../repositories/AnalyticsRepository';
import { ControlSize, Radius, Spacing, Typography } from '../../theme';
import { formatCurrency, getMonthKey, readableMonth } from '../../utils/format';

type DecisionStatus = 'good' | 'watch' | 'action';

type DecisionCard = {
  title: string;
  description: string;
  evidence: string;
  nextAction: string;
  actionLabel: string;
  route: 'Analytics' | 'Reports' | 'PlannerChat' | 'Budgets' | 'RecurringExpenses' | 'Transactions';
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  status: DecisionStatus;
};

const rangeLabel = (startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return 'All available activity';
  if (startDate && endDate) return `${startDate} to ${endDate}`;
  if (startDate) return `${startDate} to today`;
  return `Until ${endDate}`;
};

const statusMeta = (
  status: DecisionStatus,
  colors: ReturnType<typeof useColors>
): {
  label: string;
  color: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
} => {
  if (status === 'action') {
    return { label: 'Action', color: colors.danger, icon: 'priority-high' };
  }

  if (status === 'watch') {
    return { label: 'Watch', color: colors.warning, icon: 'tips-and-updates' };
  }

  return { label: 'Stable', color: colors.success, icon: 'check-circle' };
};

const insightSeverityMeta = (
  severity: InsightSeverity,
  colors: ReturnType<typeof useColors>
): {
  label: string;
  color: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
} => {
  if (severity === 'high') {
    return { label: 'Risk', color: colors.danger, icon: 'priority-high' };
  }

  if (severity === 'medium') {
    return { label: 'Watch', color: colors.warning, icon: 'tips-and-updates' };
  }

  return { label: 'Note', color: colors.success, icon: 'check-circle' };
};

const topVariableCategory = (transactions: Transaction[]) => {
  const grouped = transactions
    .filter((transaction) => transaction.type === 'expense' && !transaction.isRecurring)
    .reduce<Record<string, { label: string; amount: number; count: number }>>((acc, transaction) => {
      const key = transaction.categoryName || transaction.categoryId;
      acc[key] = acc[key] || { label: key, amount: 0, count: 0 };
      acc[key].amount += transaction.amount;
      acc[key].count += 1;
      return acc;
    }, {});

  return Object.values(grouped).sort((a, b) => b.amount - a.amount)[0];
};

const buildDecisions = (
  data: AppData,
  transactions: Transaction[],
  currency: string,
  periodLabel: string
): DecisionCard[] => {
  const summary = calculateActivitySummary(transactions);
  const monthKey = transactions[0]?.date?.slice(0, 7) || getMonthKey();
  const budget = data.budgets.find((item) => item.month === monthKey);
  const budgetHealth = calculateBudgetHealth(transactions, budget, data.categories, monthKey);
  const activeRecurring = data.recurringExpenses.filter((item) => item.status === 'active');
  const recurringSpend = transactions
    .filter((transaction) => transaction.type === 'expense' && transaction.isRecurring)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const recurringShare = summary.expenses > 0 ? Math.round((recurringSpend / summary.expenses) * 100) : 0;
  const variableLeader = topVariableCategory(transactions);

  return [
    {
      title: 'Budget pressure',
      description:
        budgetHealth.totalBudget > 0
          ? `${budgetHealth.usedPercent}% of the ${readableMonth(monthKey)} budget is used in this view.`
          : 'No budget baseline is set for this period yet.',
      evidence:
        budgetHealth.totalBudget > 0
          ? `${formatCurrency(budgetHealth.spent, currency)} spent against ${formatCurrency(budgetHealth.totalBudget, currency)} planned.`
          : 'A budget gives this signal a target to compare against.',
      nextAction:
        budgetHealth.totalBudget === 0
          ? 'Create a budget baseline before judging spending pressure.'
          : budgetHealth.usedPercent >= 90
            ? 'Review categories and reduce the highest flexible spend first.'
            : 'Keep monitoring the period before making changes.',
      actionLabel: budgetHealth.totalBudget === 0 ? 'Open Budgets' : 'Open Analytics',
      route: budgetHealth.totalBudget === 0 ? 'Budgets' : 'Analytics',
      icon: 'speed',
      status: budgetHealth.totalBudget === 0 ? 'action' : budgetHealth.usedPercent >= 90 ? 'action' : budgetHealth.usedPercent >= 75 ? 'watch' : 'good',
    },
    {
      title: 'Fixed commitments',
      description:
        activeRecurring.length > 0
          ? `${activeRecurring.length} active recurring item${activeRecurring.length === 1 ? '' : 's'} are tracked.`
          : 'No active recurring expenses are tracked yet.',
      evidence:
        recurringSpend > 0
          ? `${formatCurrency(recurringSpend, currency)} recurring spend appears in ${periodLabel}.`
          : 'No recurring transactions appear in this selected activity period.',
      nextAction:
        recurringShare >= 35
          ? 'Audit recurring costs before cutting daily spending.'
          : 'Keep recurring costs visible while planning the period.',
      actionLabel: 'Open Recurring',
      route: 'RecurringExpenses',
      icon: 'autorenew',
      status: recurringShare >= 35 ? 'action' : recurringShare >= 20 ? 'watch' : 'good',
    },
    {
      title: 'Variable spending signal',
      description: variableLeader
        ? `${variableLeader.label} is the largest flexible category in this period.`
        : 'No flexible expense category stands out yet.',
      evidence: variableLeader
        ? `${formatCurrency(variableLeader.amount, currency)} across ${variableLeader.count} transaction${variableLeader.count === 1 ? '' : 's'}.`
        : 'Add more transactions to make variable spend signals useful.',
      nextAction: variableLeader
        ? 'Use Analytics to compare this category against the rest of the period.'
        : 'Keep tracking activity before making a spending decision.',
      actionLabel: 'Open Analytics',
      route: 'Analytics',
      icon: 'stacked-bar-chart',
      status: variableLeader && variableLeader.amount > summary.expenses * 0.4 ? 'watch' : 'good',
    },
    {
      title: 'Planning handoff',
      description: 'Turn this signal set into a practical next action.',
      evidence: `${summary.transactionCount} transaction${summary.transactionCount === 1 ? '' : 's'} are included in this context.`,
      nextAction: 'Use Guided Planning to decide whether the next move is budget, savings, recurring, or reporting.',
      actionLabel: 'Open Guided Planning',
      route: 'PlannerChat',
      icon: 'route',
      status: 'good',
    },
  ];
};

const InsightsContent = ({ data }: { data: AppData }) => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const insights = useInsights();
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
  const periodLabel = `${dateRange.label} · ${rangeLabel(dateRange.startDate, dateRange.endDate)}`;
  const decisions = useMemo(
    () => buildDecisions(data, periodTransactions, data.user.currency, dateRange.label),
    [data, dateRange.label, periodTransactions]
  );

  const focusDecision = decisions.find((decision) => decision.status === 'action') || decisions.find((decision) => decision.status === 'watch') || decisions[0];

  return (
    <AppScroll>
      <ScreenHeader
        title="Insights"
        subtitle="What matters, why it matters, and what to do next."
        action={<IconButton icon="analytics" label="Open analytics" onPress={() => navigation.navigate('Analytics')} />}
      />

      <Card style={styles.heroCard}>
        <View style={styles.rowBetween}>
          <View style={styles.heroCopy}>
            <Text variant="caption" color="secondary" style={styles.overline}>
              Decision context
            </Text>
            <Text variant="h3">{dateRange.label}</Text>
            <Text variant="bodySmall" color="secondary" style={styles.sectionCopy}>
              {periodLabel}
            </Text>
          </View>
          <CategoryBadge
            label={focusDecision.status === 'good' ? 'Stable' : 'Review'}
            color={focusDecision.status === 'good' ? colors.success : colors.warning}
            icon="flag"
            library="mi"
          />
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

        <Text variant="bodySmall" color="secondary" style={styles.sectionCopy}>
          {summary.transactionCount} transaction{summary.transactionCount === 1 ? '' : 's'} · {summary.recurringCount} recurring · {summary.oneTimeCount} one-time
        </Text>

        <View style={styles.cardActions}>
          <Button
            label={focusDecision.actionLabel}
            onPress={() => navigation.navigate(focusDecision.route)}
            style={styles.heroAction}
          />
          <Button
            label="Open reports"
            onPress={() => navigation.navigate('Reports')}
            variant="secondary"
            style={styles.heroAction}
          />
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <Text variant="h3">Decision sections</Text>
        <Text variant="bodySmall" color="secondary" style={styles.sectionCopy}>
          Each card explains the signal, the evidence, and the next screen to visit.
        </Text>
      </View>

      <View style={styles.decisionList}>
        {decisions.map((decision) => {
          const meta = statusMeta(decision.status, colors);

          return (
            <Card key={decision.title} style={styles.decisionCard}>
              <View style={styles.decisionTopRow}>
                <View style={[styles.decisionIcon, { backgroundColor: `${meta.color}1F` }]}>
                  <MaterialIcons name={decision.icon} size={18} color={meta.color} />
                </View>

                <View style={styles.decisionCopy}>
                  <View style={styles.rowBetween}>
                    <Text variant="caption" color="secondary" style={styles.overline}>
                      Signal
                    </Text>
                    <CategoryBadge label={meta.label} color={meta.color} icon={meta.icon} library="mi" />
                  </View>

                  <Text variant="h4" style={styles.decisionTitle}>
                    {decision.title}
                  </Text>
                  <Text variant="body" color="secondary" style={styles.sectionCopy}>
                    {decision.description}
                  </Text>

                  <View
                      style={[
                        styles.evidenceBox,
                        { borderColor: colors.borderLight },
                      ]}
                    >
                    <Text variant="caption" color="secondary" style={styles.overline}>
                      Evidence
                    </Text>
                    <Text variant="bodySmall" style={styles.sectionCopy}>
                      {decision.evidence}
                    </Text>
                  </View>

                  <View
                      style={[
                        styles.evidenceBox,
                        { borderColor: colors.borderLight },
                      ]}
                    >
                    <Text variant="caption" color="secondary" style={styles.overline}>
                      Next action
                    </Text>
                    <Text variant="bodySmall" style={styles.sectionCopy}>
                      {decision.nextAction}
                    </Text>
                  </View>

                  <View style={styles.stepAction}>
                    <Button label={decision.actionLabel} onPress={() => navigation.navigate(decision.route)} variant="secondary" />
                  </View>
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="h3">Automated signals</Text>
        <Text variant="bodySmall" color="secondary" style={styles.sectionCopy}>
          Rule-based signals from current transactions, budget, locations, and recurring expenses.
        </Text>
      </View>

      {insights.length === 0 ? (
        <EmptyState title="No signals yet" message="Add more transactions to generate behavior signals." />
      ) : (
        <View style={styles.signalList}>
          {insights.map((insight) => {
            const severity = insightSeverityMeta(insight.severity, colors);

            return (
              <TouchableOpacity
                key={insight.id}
                accessibilityRole="button"
                accessibilityLabel={`Open evidence for ${insight.title}`}
                accessibilityHint="Opens Analytics with supporting evidence"
                onPress={() => navigation.navigate('Analytics')}
                activeOpacity={0.82}
                style={styles.signalAction}
              >
                <Card style={styles.signalCard}>
                  <View style={styles.rowBetween}>
                    <View style={styles.signalCopy}>
                      <Text variant="h4">{insight.title}</Text>
                      <Text variant="body" color="secondary" style={styles.signalDescription}>
                        {insight.description}
                      </Text>
                    </View>

                    <CategoryBadge label={severity.label} color={severity.color} icon={severity.icon} library="mi" />
                  </View>

                  <Text variant="caption" color="secondary" style={styles.linkCopy}>
                    Open Analytics for supporting evidence
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </AppScroll>
  );
};

export const InsightsScreen = () => (
  <RequireData>
    {(data) => <InsightsContent data={data} />}
  </RequireData>
);

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: Spacing.lg,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  overline: {
    letterSpacing: 0.1,
    fontWeight: Typography.label.fontWeight,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionCopy: {
    marginTop: Spacing.xs,
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
    flexBasis: 156,
  },
  decisionList: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  decisionCard: {
    paddingVertical: Spacing.md,
  },
  decisionTopRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  decisionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  decisionTitle: {
    marginTop: Spacing.xs,
  },
  evidenceBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepAction: {
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
  signalList: {
    gap: Spacing.md,
  },
  signalAction: {
    minHeight: ControlSize.minimumTouchTarget,
    borderRadius: Radius.md,
  },
  signalCard: {
    paddingVertical: Spacing.md,
  },
  signalCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  signalDescription: {
    lineHeight: 22,
  },
  linkCopy: {
    marginTop: Spacing.md,
    fontWeight: Typography.label.fontWeight,
  },
});

/**
 * AnalyticsView — evidence layer for reports, insights, and planning.
 */
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarListChart, ChartCard, EmptyState, IconButton, MetricGrid, ScreenHeader, StatCard } from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import {
  buildAnalyticsEvidenceLayer,
  groupTransactionsByMonth,
  groupTransactionsByWeek,
} from '../../repositories/AnalyticsRepository';
import { ChartColors, Spacing } from '../../theme/index';
import { formatCurrency, getMonthKey, readableMonth } from '../../utils/format';

const monthDateRange = (month: string) => ({
  startDate: `${month}-01`,
  endDate: `${month}-31`,
  label: readableMonth(month),
});

const SignalEvidenceList = ({
  signals,
  currency,
}: {
  signals: ReturnType<typeof buildAnalyticsEvidenceLayer>['signals'];
  currency: string;
}) => {
  if (signals.length === 0) {
    return <EmptyState title="No analytics signals yet" message="Add activity to unlock evidence for reports and insights." />;
  }

  return (
    <View style={styles.signalList}>
      {signals.map((signal) => (
        <View key={signal.id} style={styles.signalBlock}>
          <View style={styles.signalHeader}>
            <View style={styles.signalTitleBlock}>
              <ChartCard title={signal.title} summary={`${signal.description} Source: ${signal.source}.`}>
                <View style={styles.signalMetricList}>
                  {signal.evidence.map((metric) => (
                    <View key={metric.id} style={styles.signalMetricRow}>
                      <View style={styles.signalMetricCopy}>
                        <StatCard
                          label={metric.label}
                          value={formatCurrency(metric.value, currency)}
                          icon="analytics"
                          tone={metric.tone}
                          helper={metric.helperText}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </ChartCard>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export const AnalyticsScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const month = getMonthKey();
      const period = monthDateRange(month);
      const evidence = buildAnalyticsEvidenceLayer(
        {
          transactions: data.transactions,
          categories: data.categories,
          recurringExpenses: data.recurringExpenses,
          reports: data.reports,
          savingsGoals: data.savingsGoals,
        },
        period
      );

      const months = groupTransactionsByMonth(data.transactions);
      const weeks = groupTransactionsByWeek(data.transactions);

      const monthlyTrend = Object.entries(months).map(([label, items]) => ({
        label,
        value: items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
        color: ChartColors.series[0],
      }));

      const weekly = Object.entries(weeks).map(([label, items]) => ({
        label,
        value: items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
        color: ChartColors.series[3],
      }));

      const incomeVsExpenses = [
        {
          label: 'Income',
          value: evidence.summary.totalIncome,
          color: ChartColors.finance.income,
        },
        {
          label: 'Expenses',
          value: evidence.summary.totalExpense,
          color: ChartColors.finance.expense,
        },
      ];

      const categoryData = evidence.categoryEvidence.slice(0, 6).map((item) => ({
        label: item.categoryName,
        value: item.amount,
        color: item.color,
        secondary: `${item.percentage}% of selected expenses`,
      }));

      const recurringData = evidence.recurringEvidence.byMerchant.slice(0, 6).map((item) => ({
        label: item.merchant,
        value: item.amount,
        color: ChartColors.categories.subscriptions,
        secondary: `${item.transactionCount} recurring transaction${item.transactionCount === 1 ? '' : 's'}`,
      }));

      return (
        <AppScroll>
          <ScreenHeader
            title="Analytics Evidence"
            subtitle={`${period.label} signals that support Reports, Insights, and Planning.`}
            action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
          />

          {data.transactions.length === 0 ? (
            <EmptyState title="No analytics evidence yet" message="Add transactions to unlock period evidence, signals, and charts." />
          ) : (
            <>
              <MetricGrid>
                <StatCard
                  label="Income"
                  value={formatCurrency(evidence.summary.totalIncome, data.user.currency)}
                  icon="trending-up"
                  tone="success"
                  helper={`${evidence.summary.transactionCount} entries this period`}
                />
                <StatCard
                  label="Expenses"
                  value={formatCurrency(evidence.summary.totalExpense, data.user.currency)}
                  icon="trending-down"
                  tone={evidence.summary.netCashFlow < 0 ? 'danger' : 'primary'}
                  helper="Selected period spend"
                />
                <StatCard
                  label="Net cash flow"
                  value={formatCurrency(evidence.summary.netCashFlow, data.user.currency)}
                  icon="account-balance-wallet"
                  tone={evidence.summary.netCashFlow >= 0 ? 'success' : 'danger'}
                  helper={period.label}
                />
                <StatCard
                  label="Recurring"
                  value={formatCurrency(evidence.summary.recurringExpenseTotal, data.user.currency)}
                  icon="autorenew"
                  tone={evidence.summary.recurringExpenseTotal > 0 ? 'warning' : 'primary'}
                  helper="Recurring load in period"
                />
              </MetricGrid>

              <ChartCard title="Signal Evidence" summary="Explains what the charts mean and how they support reports and insights.">
                <SignalEvidenceList signals={evidence.signals} currency={data.user.currency} />
              </ChartCard>

              <ChartCard title="Income vs Expenses" summary="Selected period comparison for report and insight context.">
                <BarListChart data={incomeVsExpenses} currency={data.user.currency} />
              </ChartCard>

              <ChartCard title="Category Evidence" summary="Shows which categories explain the selected period.">
                {categoryData.length === 0 ? (
                  <EmptyState title="No category evidence" message="No expense categories were active in this period." />
                ) : (
                  <BarListChart data={categoryData} currency={data.user.currency} />
                )}
              </ChartCard>

              <ChartCard title="Recurring Commitments" summary="Shows the recurring load that can affect planning decisions.">
                {recurringData.length === 0 ? (
                  <EmptyState title="No recurring evidence" message="No recurring transactions were found in this period." />
                ) : (
                  <BarListChart data={recurringData} currency={data.user.currency} />
                )}
              </ChartCard>

              <ChartCard title="Monthly Spending Trend" summary="Keeps the broader trend visible while the evidence layer focuses on the selected period.">
                <BarListChart data={monthlyTrend} currency={data.user.currency} />
              </ChartCard>

              <ChartCard title="Weekly Spending" summary="Groups expense activity by week start date for pattern review.">
                <BarListChart data={weekly} currency={data.user.currency} />
              </ChartCard>
            </>
          )}
        </AppScroll>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  signalList: {
    gap: Spacing.md,
  },
  signalBlock: {
    gap: Spacing.sm,
  },
  signalHeader: {
    gap: Spacing.sm,
  },
  signalTitleBlock: {
    gap: Spacing.sm,
  },
  signalMetricList: {
    gap: Spacing.md,
  },
  signalMetricRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  signalMetricCopy: {
    flex: 1,
  },
});

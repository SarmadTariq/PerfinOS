/**
 * ReportsView — period-based reports generated from Activity filter context.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import { EmptyState, IconButton, ScreenHeader, Toast } from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { calculateActivitySummary, useActivityFilters } from '../../context/ActivityFilterContext';
import { useFinance } from '../../context/FinanceContext';
import { filterTransactions, sortTransactions } from '../../repositories/AnalyticsRepository';
import { Spacing } from '../../theme';
import { formatCurrency, readableMonth } from '../../utils/format';

const rangeLabel = (startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return 'All available activity';
  if (startDate && endDate) return `${startDate} to ${endDate}`;
  if (startDate) return `${startDate} to today`;
  return `Until ${endDate}`;
};

export const ReportsScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const { generateReport } = useFinance();
      const { dateRange, frequencyFilter } = useActivityFilters();
      const [notice, setNotice] = useState<string | null>(null);

      useEffect(() => {
        if (!notice) return undefined;

        const t = setTimeout(() => setNotice(null), 2500);

        return () => clearTimeout(t);
      }, [notice]);

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
      const periodCopy = `${dateRange.label} · ${rangeLabel(dateRange.startDate, dateRange.endDate)}`;
      const frequencyCopy =
        frequencyFilter === 'recurring'
          ? 'Recurring transactions only'
          : frequencyFilter === 'one-time'
            ? 'One-time transactions only'
            : 'Recurring and one-time transactions';

      const runReport = async () => {
        const month = dateRange.startDate?.slice(0, 7) || dateRange.endDate?.slice(0, 7);

        await generateReport(month);
        setNotice('Report generated for the selected period context');
      };

      return (
        <AppScroll>
          <ScreenHeader
            title="Reports"
            subtitle="Generate a report from the current Activity period."
            action={
              <View style={styles.headerActions}>
                <IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />
                <IconButton icon="summarize" label="Generate report" onPress={runReport} />
              </View>
            }
          />

          {notice ? <Toast message={notice} tone="success" /> : null}

          <Card shadow="sm" style={styles.card}>
            <Text variant="h4">Report preview</Text>
            <Text variant="bodySmall" color="secondary" style={styles.sectionCopy}>
              {periodCopy}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {frequencyCopy}
            </Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text variant="caption" color="secondary" style={styles.summaryLabel}>
                  Income
                </Text>
                <Text variant="h4">{formatCurrency(summary.income, data.user.currency)}</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text variant="caption" color="secondary" style={styles.summaryLabel}>
                  Expenses
                </Text>
                <Text variant="h4">{formatCurrency(summary.expenses, data.user.currency)}</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text variant="caption" color="secondary" style={styles.summaryLabel}>
                  Net
                </Text>
                <Text variant="h4">{formatCurrency(summary.netCashFlow, data.user.currency)}</Text>
              </View>
            </View>

            <Text variant="bodySmall" color="secondary" style={styles.sectionCopy}>
              {summary.transactionCount} transaction{summary.transactionCount === 1 ? '' : 's'} · {summary.recurringCount} recurring · {summary.oneTimeCount} one-time
            </Text>

            <View style={styles.cardActions}>
              <Button label="Generate Report" onPress={runReport} style={{ flex: 1 }} />
              <Button
                label="Adjust Activity Filters"
                onPress={() => navigation.navigate('Transactions')}
                variant="secondary"
                style={{ flex: 1 }}
              />
            </View>
          </Card>

          <View style={styles.sectionHeader}>
            <Text variant="h3">Report history</Text>
            <Text variant="bodySmall" color="secondary" style={styles.sectionCopy}>
              Saved monthly reports remain available while period-based reporting is introduced.
            </Text>
          </View>

          {data.reports.length === 0 ? (
            <EmptyState
              title="No reports"
              message="Generate a report from the current Activity period to create a saved summary."
              actionLabel="Generate Report"
              onAction={runReport}
            />
          ) : (
            data.reports.map((report) => (
              <Card key={report.id} shadow="sm" style={styles.card}>
                <Text variant="h4">{readableMonth(report.month)}</Text>
                <Text variant="body" color="secondary" style={styles.sectionCopy}>
                  Income {formatCurrency(report.totalIncome, data.user.currency)} · Expenses {formatCurrency(report.totalExpense, data.user.currency)}
                </Text>
                <Text variant="bodySmall" color="secondary">Top category: {report.topCategory}</Text>
                <Text variant="bodySmall" color="secondary">Budget status: {report.budgetStatus}</Text>
                <Text variant="bodySmall" color="secondary">Savings progress: {report.savingsProgress}%</Text>
              </Card>
            ))
          )}
        </AppScroll>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionCopy: {
    marginTop: Spacing.xs,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  summaryItem: {
    flex: 1,
    gap: Spacing.xs,
  },
  summaryLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    fontWeight: '800',
  },
});

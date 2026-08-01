import { useNavigation } from '@react-navigation/native';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, Text } from '../../components/base';
import {
  EmptyState,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { useColors } from '../../context/ThemeContext';
import type { Report } from '../../models/finance';
import {
  isDateInMonthlyReportPeriod,
  requireMonthlyReportPeriod,
} from '../../reporting';
import {
  Radius,
  Spacing,
} from '../../theme/index';
import {
  formatCurrency,
  getMonthKey,
  readableMonth,
} from '../../utils/format';

type ReportOperation =
  | 'generate'
  | 'save'
  | null;

const shiftMonth = (
  month: string,
  offset: number
) => {
  const [year, monthNumber] = month
    .split('-')
    .map(Number);
  const shifted = new Date(
    year,
    monthNumber - 1 + offset,
    1
  );

  return `${shifted.getFullYear()}-${String(
    shifted.getMonth() + 1
  ).padStart(2, '0')}`;
};

const formatGeneratedAt = (
  value: string
) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Generation time unavailable';
  }

  return parsed.toLocaleString();
};

const StatusBanner = ({
  tone,
  title,
  message,
}: {
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
}) => {
  const colors = useColors();
  const borderColor = {
    neutral: colors.borderDefault,
    success: colors.statusPositive,
    warning: colors.statusWarning,
    danger: colors.statusCritical,
  }[tone];

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.statusBanner,
        {
          backgroundColor: colors.backgroundSubtle,
          borderColor,
        },
      ]}
    >
      <Text variant="bodySmall" style={styles.statusTitle}>
        {title}
      </Text>
      <Text variant="bodySmall" color="secondary">
        {message}
      </Text>
    </View>
  );
};

const ReportSummary = ({
  report,
  currency,
  transactionCount,
  missingCategoryCount,
}: {
  report: Report;
  currency: string;
  transactionCount: number;
  missingCategoryCount: number;
}) => (
  <Card style={styles.reportCard}>
    <View style={styles.reportHeading}>
      <View style={styles.headingCopy}>
        <Text variant="h3">
          {readableMonth(report.month)}
        </Text>
        <Text variant="bodySmall" color="secondary">
          Generated {formatGeneratedAt(report.generatedAt)}
        </Text>
      </View>
      <Text variant="caption" color="secondary">
        Deterministic summary
      </Text>
    </View>

    <View style={styles.summaryGrid}>
      <View style={styles.summaryItem}>
        <Text variant="caption" color="secondary">
          Income
        </Text>
        <Text variant="h4">
          {formatCurrency(
            report.totalIncome,
            currency
          )}
        </Text>
      </View>
      <View style={styles.summaryItem}>
        <Text variant="caption" color="secondary">
          Expenses
        </Text>
        <Text variant="h4">
          {formatCurrency(
            report.totalExpense,
            currency
          )}
        </Text>
      </View>
      <View style={styles.summaryItem}>
        <Text variant="caption" color="secondary">
          Net cash flow
        </Text>
        <Text variant="h4">
          {formatCurrency(
            report.totalIncome -
              report.totalExpense,
            currency
          )}
        </Text>
      </View>
    </View>

    <View style={styles.detailRows}>
      {report.periodStart &&
      report.periodEnd ? (
        <View style={styles.detailRow}>
          <Text variant="bodySmall" color="secondary">
            Inclusive period
          </Text>
          <Text variant="bodySmall">
            {report.periodStart} to{' '}
            {report.periodEnd}
          </Text>
        </View>
      ) : null}
      <View style={styles.detailRow}>
        <Text variant="bodySmall" color="secondary">
          Data coverage
        </Text>
        <Text variant="bodySmall">
          {transactionCount}{' '}
          {transactionCount === 1
            ? 'transaction'
            : 'transactions'}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text variant="bodySmall" color="secondary">
          Top expense category
        </Text>
        <Text variant="bodySmall">
          {report.topCategory}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text variant="bodySmall" color="secondary">
          Budget status
        </Text>
        <Text variant="bodySmall">
          {report.budgetStatus}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text variant="bodySmall" color="secondary">
          Account savings snapshot
        </Text>
        <Text variant="bodySmall">
          {report.savingsProgress}%
        </Text>
      </View>
    </View>

    {report.coverage?.classification ===
      'partial' ||
    missingCategoryCount > 0 ? (
      <StatusBanner
        tone="warning"
        title="Partial data"
        message={
          missingCategoryCount > 0
            ? `${missingCategoryCount} transaction${
                missingCategoryCount === 1
                  ? ''
                  : 's'
              } reference a category that is no longer in the category collection.`
            : `The selected period is still in progress or ${
                report.coverage
                  ?.excludedTransactionCount ||
                0
              } transaction dates were excluded as invalid.`
        }
      />
    ) : null}

    <Text
      variant="bodySmall"
      color="secondary"
      style={styles.sourceNote}
    >
      Calculated from stored transactions, category references, the
      selected month budget, and the current account savings-goal
      snapshot. No AI interpretation is included.
    </Text>
  </Card>
);

export const ReportsScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const {
        isGuest,
        previewReport,
        saveReport,
      } = useFinance();
      const currentMonth = getMonthKey();
      const [month, setMonth] =
        useState(currentMonth);
      const [draft, setDraft] =
        useState<Report | null>(null);
      const [operation, setOperation] =
        useState<ReportOperation>(null);
      const [error, setError] =
        useState<string | null>(null);
      const [errorOperation, setErrorOperation] =
        useState<Exclude<
          ReportOperation,
          null
        > | null>(null);
      const [notice, setNotice] =
        useState<string | null>(null);

      const savedReport = useMemo(
        () =>
          data.reports.find(
            (report) =>
              report.month === month
          ) || null,
        [data.reports, month]
      );
      const visibleReport =
        draft || savedReport;
      const monthTransactions = useMemo(
        () => {
          const period =
            requireMonthlyReportPeriod(month);
          return data.transactions.filter(
            (transaction) =>
              isDateInMonthlyReportPeriod(
                transaction.date,
                period
              )
          );
        },
        [data.transactions, month]
      );
      const missingCategoryCount = useMemo(
        () =>
          monthTransactions.filter(
            (transaction) =>
              !data.categories.some(
                (category) =>
                  category.id ===
                  transaction.categoryId
              )
          ).length,
        [
          data.categories,
          monthTransactions,
        ]
      );
      const isSaved =
        savedReport !== null &&
        (
          draft === null ||
          savedReport.generatedAt ===
            draft.generatedAt
        );

      useEffect(() => {
        setDraft(null);
        setError(null);
        setErrorOperation(null);
        setNotice(null);
      }, [month]);

      const generate = async () => {
        if (operation) return;
        setOperation('generate');
        setError(null);
        setErrorOperation(null);
        setNotice(null);
        try {
          const report =
            await previewReport(month);
          setDraft(report);
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'The report could not be generated.'
          );
          setErrorOperation('generate');
        } finally {
          setOperation(null);
        }
      };

      const save = async () => {
        if (!draft || operation) return;
        setOperation('save');
        setError(null);
        setErrorOperation(null);
        try {
          await saveReport(draft);
          setNotice(
            isGuest
              ? 'Report saved to this guest workspace.'
              : 'Report saved to your workspace.'
          );
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'The report could not be saved.'
          );
          setErrorOperation('save');
        } finally {
          setOperation(null);
        }
      };

      return (
        <AppScroll>
          <ScreenHeader
            leading={
              <IconButton
                icon="arrow-back"
                label="Go back"
                onPress={() => navigation.goBack()}
              />
            }
            title="Reports"
            subtitle="Generate and save reconciled monthly summaries."
          />

          <View style={styles.controls}>
            <View style={styles.controlCopy}>
              <Text variant="bodySmall" color="secondary">
                Report type
              </Text>
              <Text variant="h4">
                Monthly summary
              </Text>
              <Text variant="bodySmall" color="secondary">
                Deterministic calculations only
              </Text>
            </View>
            <View style={styles.periodControl}>
              <IconButton
                icon="chevron-left"
                label="Previous month"
                onPress={() =>
                  setMonth(
                    shiftMonth(month, -1)
                  )
                }
              />
              <View style={styles.periodLabel}>
                <Text variant="bodySmall" color="secondary">
                  Reporting period
                </Text>
                <Text variant="h4">
                  {readableMonth(month)}
                </Text>
              </View>
              {month >= currentMonth ? (
                <View
                  style={
                    styles.controlPlaceholder
                  }
                />
              ) : (
                <IconButton
                  icon="chevron-right"
                  label="Next month"
                  onPress={() =>
                    setMonth(
                      shiftMonth(month, 1)
                    )
                  }
                />
              )}
            </View>
          </View>

          {operation === 'generate' ? (
            <StatusBanner
              tone="neutral"
              title="Generating"
              message={`Calculating ${readableMonth(
                month
              )} from local workspace data.`}
            />
          ) : error ? (
            <StatusBanner
              tone="danger"
              title={
                errorOperation === 'save'
                  ? 'Save failed'
                  : 'Generation failed'
              }
              message={`${error} Your selected month and saved reports were not reset.`}
            />
          ) : draft && !isSaved ? (
            <StatusBanner
              tone="warning"
              title="Generated, not saved"
              message={
                draft.coverage?.classification === 'empty'
                  ? 'No transactions were found in this report month. Review the zero-value preview before saving it to report history.'
                  : 'Review the deterministic summary before saving it to report history.'
              }
            />
          ) : notice ? (
            <StatusBanner
              tone="success"
              title="Saved"
              message={notice}
            />
          ) : savedReport ? (
            <StatusBanner
              tone="success"
              title="Saved report"
              message={
                savedReport.coverage?.classification === 'empty'
                  ? 'This saved monthly report has zero-value activity totals.'
                  : 'This monthly report is available in report history.'
              }
            />
          ) : (
            <StatusBanner
              tone="neutral"
              title="Not generated"
              message="Choose a month and generate a deterministic preview."
            />
          )}

          {visibleReport ? (
            <ReportSummary
              report={visibleReport}
              currency={data.user.currency}
              transactionCount={
                visibleReport.coverage
                  ?.transactionCount ??
                monthTransactions.length
              }
              missingCategoryCount={
                missingCategoryCount
              }
            />
          ) : (
            <EmptyState
              title="No report for this month"
              message="Generate a preview to review income, expenses, budget status, and data coverage."
            />
          )}

          <View style={styles.primaryActions}>
            <Button
              label={
                visibleReport
                  ? 'Regenerate preview'
                  : 'Generate preview'
              }
              onPress={generate}
              loading={
                operation === 'generate'
              }
              disabled={operation !== null}
              style={styles.action}
            />
            {draft && !isSaved ? (
              <Button
                label="Save report"
                variant="secondary"
                onPress={save}
                loading={
                  operation === 'save'
                }
                disabled={
                  operation !== null
                }
                style={styles.action}
              />
            ) : null}
            <Button
              label="Open Activity"
              variant="secondary"
              onPress={() =>
                navigation.navigate(
                  'Transactions'
                )
              }
              style={styles.action}
            />
          </View>

          <View style={styles.historyHeading}>
            <Text variant="h3">
              Saved reports
            </Text>
            <Text
              variant="bodySmall"
              color="secondary"
            >
              {isGuest
                ? 'Stored in this guest workspace.'
                : 'Stored in your signed-in workspace.'}
            </Text>
          </View>

          {data.reports.length === 0 ? (
            <EmptyState
              title="No saved reports"
              message="Saved monthly summaries will appear here."
            />
          ) : (
            [...data.reports]
              .sort((left, right) =>
                right.month.localeCompare(
                  left.month
                )
              )
              .map((report) => (
                <Card
                  key={report.id}
                  style={styles.historyRow}
                >
                  <View style={styles.historyCopy}>
                    <Text variant="h4">
                      {readableMonth(
                        report.month
                      )}
                    </Text>
                    <Text
                      variant="bodySmall"
                      color="secondary"
                    >
                      Generated{' '}
                      {formatGeneratedAt(
                        report.generatedAt
                      )}
                    </Text>
                  </View>
                  <View style={styles.historyTotals}>
                    <Text variant="bodySmall">
                      {formatCurrency(
                        report.totalIncome,
                        data.user.currency
                      )}{' '}
                      income
                    </Text>
                    <Text
                      variant="bodySmall"
                      color="secondary"
                    >
                      {formatCurrency(
                        report.totalExpense,
                        data.user.currency
                      )}{' '}
                      expenses
                    </Text>
                  </View>
                </Card>
              ))
          )}
        </AppScroll>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  controlCopy: {
    gap: Spacing.xs,
  },
  periodControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  periodLabel: {
    alignItems: 'center',
    minWidth: 160,
  },
  controlPlaceholder: {
    width: 42,
    height: 42,
  },
  statusBanner: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  statusTitle: {
    fontWeight: '700',
  },
  reportCard: {
    marginBottom: Spacing.lg,
  },
  reportHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  headingCopy: {
    gap: Spacing.xs,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  summaryItem: {
    flexGrow: 1,
    minWidth: 150,
    gap: Spacing.xs,
  },
  detailRows: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  sourceNote: {
    marginTop: Spacing.lg,
  },
  primaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  action: {
    flexGrow: 1,
    minWidth: 170,
  },
  historyHeading: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  historyCopy: {
    gap: Spacing.xs,
  },
  historyTotals: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
});

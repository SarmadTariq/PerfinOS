/**
 * ReportsView — generate AI-powered monthly reports and view saved report history.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  CategoryBadge,
  EmptyState,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { useThemeScheme } from '../../context/ThemeContext';
import type { AppData } from '../../models/finance';
import { generatePlannerResult, type AiPlannerResult } from '../../services/aiService';
import { Colors, Spacing } from '../../theme';
import { formatCurrency, readableMonth } from '../../utils/format';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

export const ReportsScreen = () => (
  <RequireData>
    {(data) => <ReportsContent data={data} />}
  </RequireData>
);

const ReportsContent = ({ data }: { data: AppData }) => {
  const navigation = useNavigation<any>();
  const { generateReport, canUseFeature, isGuest } = useFinance();
  const colors = useColors();

  const [notice, setNotice] = useState<string | null>(null);
  const [planner, setPlanner] = useState<AiPlannerResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const aiEnabled = canUseFeature('aiReports') && !isGuest;

  useEffect(() => {
    if (!notice) return undefined;

    const timeoutId = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timeoutId);
  }, [notice]);

  const handleGenerateReport = async () => {
    await generateReport();
    setNotice('Report generated');
  };

  const runPlanner = async () => {
    if (!aiEnabled) {
      setNotice('AI Reports require a signed-in account.');
      return;
    }

    setAiLoading(true);

    try {
      const result = await generatePlannerResult(data);
      setPlanner(result);
      setNotice(result.source === 'ai' ? 'AI report generated' : 'Planner fallback generated');
    } finally {
      setAiLoading(false);
    }
  };

  const headerAction = (
    <View style={styles.headerActions}>
      <IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />
      <IconButton icon="summarize" label="Generate report" onPress={handleGenerateReport} />
    </View>
  );

  return (
    <AppScroll>
      <ScreenHeader
        title="Reports"
        subtitle="Generate a monthly summary from current data."
        action={headerAction}
      />

      {notice ? (
        <Text variant="bodySmall" color="secondary" style={styles.notice}>
          {notice}
        </Text>
      ) : null}

      <Card shadow="sm" style={styles.aiCard}>
        <View style={styles.rowBetween}>
          <View style={styles.cardContent}>
            <Text variant="h4">AI Reports + Planner</Text>
            <Text variant="bodySmall" color="secondary" style={styles.description}>
              Uses aggregate-only totals and educational planning language. Receipt images, raw
              notes, and full transaction dumps are never sent.
            </Text>
          </View>

          <CategoryBadge
            label={aiEnabled ? 'Free plan' : 'Login required'}
            color={aiEnabled ? colors.success : colors.warning}
            icon={aiEnabled ? 'auto-awesome' : 'lock'}
            library="mi"
          />
        </View>

        <View style={styles.cardActions}>
          <Button
            label={aiLoading ? 'Generating...' : 'Generate Report'}
            onPress={runPlanner}
            disabled={aiLoading || !aiEnabled}
            style={styles.actionButton}
          />
          <Button
            label="Planner Chat"
            onPress={() => navigation.navigate('PlannerChat')}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>

        {planner ? (
          <View style={styles.plannerResult}>
            <Text variant="h4">{planner.title}</Text>
            <Text variant="body" color="secondary" style={styles.plannerSummary}>
              {planner.summary}
            </Text>

            {planner.recommendations.map((item) => (
              <Text key={item} variant="bodySmall" style={styles.recommendation}>
                • {item}
              </Text>
            ))}

            <Text variant="caption" color="secondary" style={styles.disclaimer}>
              Educational planning only. PerFin OS does not provide legal, tax, investment, or
              banking advice.
            </Text>
          </View>
        ) : null}
      </Card>

      {data.reports.length === 0 ? (
        <EmptyState
          title="No reports"
          message="Generate the current month report to create a saved summary."
          actionLabel="Generate Report"
          onAction={handleGenerateReport}
        />
      ) : (
        data.reports.map((report) => (
          <Card key={report.id} shadow="sm" style={styles.reportCard}>
            <Text variant="h4">{readableMonth(report.month)}</Text>
            <Text variant="body" color="secondary" style={styles.reportSummary}>
              Income {formatCurrency(report.totalIncome, data.user.currency)} · Expenses{' '}
              {formatCurrency(report.totalExpense, data.user.currency)}
            </Text>
            <Text variant="bodySmall" color="secondary">
              Top category: {report.topCategory}
            </Text>
            <Text variant="bodySmall" color="secondary">
              Budget status: {report.budgetStatus}
            </Text>
            <Text variant="bodySmall" color="secondary">
              Savings progress: {report.savingsProgress}%
            </Text>
          </Card>
        ))
      )}
    </AppScroll>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  aiCard: {
    marginBottom: Spacing.lg,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  description: {
    marginTop: Spacing.xs,
  },
  disclaimer: {
    marginTop: Spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  notice: {
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  plannerResult: {
    marginTop: Spacing.md,
  },
  plannerSummary: {
    marginTop: Spacing.sm,
  },
  recommendation: {
    marginTop: Spacing.sm,
  },
  reportCard: {
    marginBottom: Spacing.md,
  },
  reportSummary: {
    marginTop: Spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
});
/**
 * ReportsView — generate AI-powered monthly reports and view saved report history.
 * Extracted from PerFinOSScreens.tsx (ReportsScreen).
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  CategoryBadge,
  EmptyState,
  IconButton,
  ScreenHeader,
  Toast,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { useThemeScheme } from '../../context/ThemeContext';
import { AiPlannerResult } from '../../services/aiService';
import { generatePlannerResult } from '../../services/aiService';
import { Colors, Spacing } from '../../theme';
import { formatCurrency, readableMonth } from '../../utils/format';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

export const ReportsScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const { generateReport, canUseFeature, isGuest } = useFinance();
      const colors = useColors();
      const [toast, setToast] = useState<string | null>(null);
      const [planner, setPlanner] = useState<AiPlannerResult | null>(null);
      const [aiLoading, setAiLoading] = useState(false);
      const aiEnabled = canUseFeature('aiReports') && !isGuest;
      const runPlanner = async () => {
        if (!aiEnabled) {
          setToast('AI Reports require a signed-in account.');
          return;
        }
        setAiLoading(true);
        const result = await generatePlannerResult(data);
        setPlanner(result);
        setToast(result.source === 'ai' ? 'AI report generated' : 'Planner fallback generated');
        setAiLoading(false);
      };
      return (
        <AppScroll>
          <ScreenHeader title="Reports" subtitle="Generate a monthly summary from current data." action={<View style={{ flexDirection: 'row', gap: Spacing.sm }}><IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} /><IconButton icon="summarize" label="Generate report" onPress={() => generateReport().then(() => setToast('Report generated'))} /></View>} />
          <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text variant="h4">AI Reports + Planner</Text>
                <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
                  Uses aggregate-only totals and educational planning language. Receipt images, raw notes, and full transaction dumps are never sent.
                </Text>
              </View>
              <CategoryBadge label={aiEnabled ? 'Free plan' : 'Login required'} color={aiEnabled ? colors.success : colors.warning} icon={aiEnabled ? 'auto-awesome' : 'lock'} library="mi" />
            </View>
            <View style={[styles.cardActions, { marginTop: Spacing.md }]}>
              <Button label={aiLoading ? 'Generating...' : 'Generate Report'} onPress={runPlanner} disabled={aiLoading || !aiEnabled} style={{ flex: 1 }} />
              <Button label="Planner Chat" onPress={() => navigation.navigate('PlannerChat')} variant="secondary" style={{ flex: 1 }} />
            </View>
            {planner ? (
              <View style={{ marginTop: Spacing.md }}>
                <Text variant="h4">{planner.title}</Text>
                <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>{planner.summary}</Text>
                {planner.recommendations.map((item) => (
                  <Text key={item} variant="bodySmall" style={{ marginTop: Spacing.sm }}>• {item}</Text>
                ))}
                <Text variant="caption" color="secondary" style={{ marginTop: Spacing.md }}>
                  Educational planning only. PerFin OS does not provide legal, tax, investment, or banking advice.
                </Text>
              </View>
            ) : null}
          </Card>
          {data.reports.length === 0 ? <EmptyState title="No reports" message="Generate the current month report to create a saved summary." actionLabel="Generate Report" onAction={() => generateReport().then(() => setToast('Report generated'))} /> : data.reports.map((report) => (
            <Card key={report.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
              <Text variant="h4">{readableMonth(report.month)}</Text>
              <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
                Income {formatCurrency(report.totalIncome, data.user.currency)} · Expenses {formatCurrency(report.totalExpense, data.user.currency)}
              </Text>
              <Text variant="bodySmall" color="secondary">Top category: {report.topCategory}</Text>
              <Text variant="bodySmall" color="secondary">Budget status: {report.budgetStatus}</Text>
              <Text variant="bodySmall" color="secondary">Savings progress: {report.savingsProgress}%</Text>
            </Card>
          ))}
          <Toast message={toast} />
        </AppScroll>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
});

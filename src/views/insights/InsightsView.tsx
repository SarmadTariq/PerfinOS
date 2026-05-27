/**
 * InsightsView — automated spending signals derived from transaction data.
 * Extracted from PerFinOSScreens.tsx (InsightsScreen).
 */
import React from 'react';
import { Card, Text } from '../../components/base';
import {
  CategoryBadge,
  EmptyState,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useInsights } from '../../context/FinanceContext';
import { Colors, Spacing } from '../../theme';

export const InsightsScreen = () => (
  <RequireData>
    {() => {
      const insights = useInsights();
      return (
        <AppScroll>
          <ScreenHeader title="Insights" subtitle="Automated signals generated from your spending data." />
          {insights.length === 0 ? <EmptyState title="No insights yet" message="Add more transactions to generate behavior signals." /> : insights.map((insight) => (
            <Card key={insight.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
              <CategoryBadge label={insight.severity} color={insight.severity === 'high' ? Colors.light.danger : insight.severity === 'medium' ? Colors.light.warning : Colors.light.success} icon="tips-and-updates" library="mi" />
              <Text variant="h4" style={{ marginTop: Spacing.md }}>{insight.title}</Text>
              <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>{insight.description}</Text>
            </Card>
          ))}
        </AppScroll>
      );
    }}
  </RequireData>
);

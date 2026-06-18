/**
 * InsightsView — automated spending signals derived from transaction data.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Card, Text } from '../../components/base';
import {
  CategoryBadge,
  EmptyState,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useInsights } from '../../context/FinanceContext';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

const insightEntries: {
  title: string;
  subtitle: string;
  route: 'Analytics' | 'Reports';
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  {
    title: 'Analytics',
    subtitle: 'Category trends, spending patterns, and monthly breakdowns.',
    route: 'Analytics',
    icon: 'bar-chart',
  },
  {
    title: 'Reports',
    subtitle: 'Export-ready summaries and financial review snapshots.',
    route: 'Reports',
    icon: 'summarize',
  },
];

const InsightsContent = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const insights = useInsights();

  return (
    <AppScroll>
      <ScreenHeader title="Insights" subtitle="Overview, analytics, and reports for financial review." />

      <Text variant="h4" style={{ marginBottom: Spacing.md }}>
        Overview
      </Text>

      {insights.length === 0 ? (
        <EmptyState title="No insights yet" message="Add more transactions to generate behavior signals." />
      ) : (
        insights.map((insight) => (
          <Card key={insight.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
            <CategoryBadge
              label={insight.severity}
              color={
                insight.severity === 'high'
                  ? Colors.light.danger
                  : insight.severity === 'medium'
                    ? Colors.light.warning
                    : Colors.light.success
              }
              icon="tips-and-updates"
              library="mi"
            />
            <Text variant="h4" style={{ marginTop: Spacing.md }}>
              {insight.title}
            </Text>
            <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
              {insight.description}
            </Text>
          </Card>
        ))
      )}

      <Text variant="h4" style={{ marginTop: Spacing.lg, marginBottom: Spacing.md }}>
        Analysis tools
      </Text>

      <View style={styles.entryList}>
        {insightEntries.map((entry) => (
          <TouchableOpacity
            key={entry.route}
            accessibilityRole="button"
            accessibilityLabel={`Open ${entry.title}`}
            onPress={() => navigation.navigate(entry.route)}
            style={[styles.entryRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.entryIcon, { backgroundColor: colors.primarySoft }]}>
              <MaterialIcons name={entry.icon} size={23} color={colors.primary} />
            </View>

            <View style={styles.entryText}>
              <Text variant="h4">{entry.title}</Text>
              <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
                {entry.subtitle}
              </Text>
            </View>

            <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </AppScroll>
  );
};

export const InsightsScreen = () => (
  <RequireData>
    {() => <InsightsContent />}
  </RequireData>
);

const styles = StyleSheet.create({
  entryList: {
    gap: Spacing.md,
  },
  entryRow: {
    minHeight: 96,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  entryIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryText: {
    flex: 1,
  },
});
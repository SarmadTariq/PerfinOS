/**
 * InsightsView — financial review hub with analysis tools first,
 * followed by automated monthly signals.
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
import { InsightSeverity } from '../../models/finance';
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
    subtitle: 'Trends, categories, and spending patterns.',
    route: 'Analytics',
    icon: 'bar-chart',
  },
  {
    title: 'Reports',
    subtitle: 'Monthly summaries and export-ready snapshots.',
    route: 'Reports',
    icon: 'summarize',
  },
];

const getSeverityMeta = (
  severity: InsightSeverity,
  colors: ReturnType<typeof useColors>
): {
  label: string;
  color: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
} => {
  if (severity === 'high') {
    return {
      label: 'Risk',
      color: colors.danger,
      icon: 'priority-high',
    };
  }

  if (severity === 'medium') {
    return {
      label: 'Watch',
      color: colors.warning,
      icon: 'tips-and-updates',
    };
  }

  return {
    label: 'Note',
    color: colors.success,
    icon: 'check-circle',
  };
};

const InsightsContent = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const insights = useInsights();

  return (
    <AppScroll>
      <ScreenHeader title="Insights" subtitle="Explore analytics, reports, and monthly financial signals." />

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
              <MaterialIcons name={entry.icon} size={22} color={colors.primary} />
            </View>

            <View style={styles.entryText}>
              <Text variant="h4">{entry.title}</Text>
              <Text variant="bodySmall" color="secondary" style={styles.entrySubtitle}>
                {entry.subtitle}
              </Text>
            </View>

            <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.signalsHeader}>
        <Text variant="h4">This month’s signals</Text>
        <Text variant="bodySmall" color="secondary" style={styles.sectionSubtitle}>
          Auto-generated from your current transactions, budget, locations, and recurring expenses.
        </Text>
      </View>

      {insights.length === 0 ? (
        <EmptyState title="No signals yet" message="Add more transactions to generate behavior signals." />
      ) : (
        <View style={styles.signalList}>
          {insights.map((insight) => {
            const severity = getSeverityMeta(insight.severity, colors);

            return (
              <Card key={insight.id} shadow="sm" style={styles.signalCard}>
                <View style={styles.signalTopRow}>
                  <View style={styles.signalCopy}>
                    <Text variant="h4">{insight.title}</Text>
                    <Text variant="body" color="secondary" style={styles.signalDescription}>
                      {insight.description}
                    </Text>
                  </View>

                  <CategoryBadge
                    label={severity.label}
                    color={severity.color}
                    icon={severity.icon}
                    library="mi"
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </AppScroll>
  );
};

export const InsightsScreen = () => (
  <RequireData>
    {() => <InsightsContent />}
  </RequireData>
);

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionSubtitle: {
    marginTop: Spacing.xs,
  },
  entryList: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  entryRow: {
    minHeight: 88,
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
    flexShrink: 0,
  },
  entryText: {
    flex: 1,
    minWidth: 0,
  },
  entrySubtitle: {
    marginTop: Spacing.xs,
  },
  signalsHeader: {
    marginBottom: Spacing.md,
  },
  signalList: {
    gap: Spacing.md,
  },
  signalCard: {
    paddingVertical: Spacing.md,
  },
  signalTopRow: {
    gap: Spacing.md,
  },
  signalCopy: {
    gap: Spacing.sm,
  },
  signalDescription: {
    lineHeight: 22,
  },
});
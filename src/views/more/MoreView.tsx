/**
 * MoreView: secondary PerFin OS navigation grouped by user intent.
 * Keeps existing route names stable while reducing duplicated and misplaced entries.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../../components/base';
import { ScreenHeader } from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

type MoreItem = {
  label: string;
  description: string;
  route: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
};

type MoreSection = {
  title: string;
  items: MoreItem[];
};

const sections: MoreSection[] = [
  {
    title: 'Account',
    items: [
      {
        label: 'Profile',
        description: 'Account, plan, and workspace status.',
        route: 'Profile',
        icon: 'person',
      },
    ],
  },
  {
    title: 'Money setup',
    items: [
      {
        label: 'Categories',
        description: 'Customize income and expense categories.',
        route: 'Categories',
        icon: 'category',
      },
    ],
  },
  {
    title: 'Money Plan',
    items: [
      {
        label: 'Budgets',
        description: 'Set spending limits by category.',
        route: 'Budgets',
        icon: 'speed',
      },
      {
        label: 'Savings Goals',
        description: 'Track progress toward planned goals.',
        route: 'SavingsGoals',
        icon: 'savings',
      },
      {
        label: 'Recurring Expenses',
        description: 'Manage repeating bills and subscriptions.',
        route: 'RecurringExpenses',
        icon: 'subscriptions',
      },
    ],
  },
  {
    title: 'Preferences',
    items: [
      {
        label: 'Settings',
        description: 'Appearance, workspace, and session controls.',
        route: 'Settings',
        icon: 'settings',
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        label: 'Privacy & Help',
        description: 'Data use, app scope, and safety disclosures.',
        route: 'HelpAbout',
        icon: 'privacy-tip',
      },
    ],
  },
];

export const MoreScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();

  return (
    <AppScroll>
      <ScreenHeader title="More" subtitle="Manage setup, preferences, and support." />

      <View style={styles.sectionStack}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text variant="caption" color="secondary" style={styles.sectionTitle}>
              {section.title}
            </Text>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, index) => {
                const isLast = index === section.items.length - 1;

                return (
                  <TouchableOpacity
                    key={item.route}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.label}`}
                    onPress={() => navigation.navigate(item.route)}
                    activeOpacity={0.76}
                    style={[
                      styles.row,
                      !isLast && styles.rowDivider,
                      !isLast && { borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={[styles.iconTile, { backgroundColor: colors.primarySoft }]}>
                      <MaterialIcons name={item.icon} size={22} color={colors.primary} />
                    </View>

                    <View style={styles.rowCopy}>
                      <Text variant="body" style={styles.rowTitle}>
                        {item.label}
                      </Text>
                      <Text variant="bodySmall" color="secondary" numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>

                    <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </AppScroll>
  );
};

const styles = StyleSheet.create({
  sectionStack: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontWeight: '800',
  },
});
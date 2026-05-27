/**
 * MoreView — grid of navigation tiles for all secondary PerFin OS workflows.
 * Extracted from PerFinOSScreens.tsx (MoreScreen).
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

export const MoreScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const items: { label: string; route: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
    { label: 'Map', route: 'Map', icon: 'map' },
    { label: 'Budgets', route: 'Budgets', icon: 'speed' },
    { label: 'Categories', route: 'Categories', icon: 'category' },
    { label: 'Savings Goals', route: 'SavingsGoals', icon: 'savings' },
    { label: 'Analytics', route: 'Analytics', icon: 'bar-chart' },
    { label: 'Recurring Expenses', route: 'RecurringExpenses', icon: 'subscriptions' },
    { label: 'Reports', route: 'Reports', icon: 'summarize' },
    { label: 'Profile', route: 'Profile', icon: 'person' },
    { label: 'Settings', route: 'Settings', icon: 'settings' },
    { label: 'Help / About', route: 'HelpAbout', icon: 'help-outline' },
  ];
  return (
    <AppScroll>
      <ScreenHeader title="More" subtitle="Additional PerFin OS workflows and settings." />
      <View style={styles.moreGrid}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.route}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.label}`}
            onPress={() => navigation.navigate(item.route)}
            style={[styles.moreTile, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.moreIcon, { backgroundColor: colors.primarySoft }]}>
              <MaterialIcons name={item.icon} size={23} color={colors.primary} />
            </View>
            <Text variant="body" style={{ marginTop: Spacing.sm, fontWeight: '700', textAlign: 'center' }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </AppScroll>
  );
};

const styles = StyleSheet.create({
  moreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  moreTile: {
    width: '47%',
    minHeight: 112,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  moreIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

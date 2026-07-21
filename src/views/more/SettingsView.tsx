/**
 * SettingsView: workspace mode, appearance theme, and session controls.
 * Privacy and app scope disclosures live in Privacy & Help.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  CategoryBadge,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { useFinance } from '../../context/FinanceContext';
import { useColors, useTheme } from '../../context/ThemeContext';
import { ControlSize, Radius, Spacing, Typography } from '../../theme';

export const SettingsScreen = () => {
  const { logout, isGuest, data } = useFinance();
  const { mode, resolved, setMode } = useTheme();
  const navigation = useNavigation<any>();
  const colors = useColors();

  const themeOptions: {
    label: string;
    value: 'light' | 'dark' | 'system';
  }[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ];

  return (
    <AppScroll>
      <ScreenHeader
        title="Settings"
        subtitle="Appearance, workspace, and session controls."
        action={
          <IconButton
            icon="arrow-back"
            label="Go back"
            onPress={() => navigation.goBack()}
          />
        }
      />

      <Card style={styles.sectionCard}>
        <Text variant="h4">Workspace mode</Text>

        <Text variant="body" color="secondary" style={styles.sectionCopy}>
          {isGuest
            ? 'Guest data stays on this device. Sign in to unlock cloud sync, receipt uploads, account recovery, and AI planning.'
            : 'Your PerFin OS workspace syncs through Firebase. Receipt and AI features use configured production gateways when keys are provided.'}
        </Text>

        <View style={styles.badgeRow}>
          <CategoryBadge
            label={`Plan: ${data?.entitlement.plan || 'guest'}`}
            color={isGuest ? colors.warning : colors.success}
            icon={isGuest ? 'person-outline' : 'verified'}
            library="mi"
          />
        </View>

        <Button
          label="Logout"
          variant="danger"
          onPress={logout}
          style={styles.logoutAction}
        />
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeading}>
          <MaterialIcons
            name="brightness-6"
            size={20}
            color={colors.primary}
            style={styles.sectionIcon}
          />

          <Text variant="h4">Appearance</Text>
        </View>

        <Text
          variant="bodySmall"
          color="secondary"
          style={styles.currentTheme}
        >
          Currently: {resolved === 'dark' ? 'Dark theme' : 'Light theme'} ·{' '}
          {mode === 'system' ? 'Following system' : 'Manual override'}
        </Text>

        <View style={styles.themeOptions}>
          {themeOptions.map((option) => {
            const selected = mode === option.value;

            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => setMode(option.value)}
                accessibilityRole="button"
                accessibilityLabel={`Set theme to ${option.label}`}
                accessibilityState={{ selected }}
                activeOpacity={0.82}
                style={[
                  styles.themeOption,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected
                      ? colors.primarySoft
                      : colors.bgSecondary,
                  },
                ]}
              >
                <View style={styles.themeOptionContent}>
                  <MaterialIcons
                    name={
                      selected
                        ? 'check-circle'
                        : 'radio-button-unchecked'
                    }
                    size={16}
                    color={selected ? colors.primary : colors.textTertiary}
                  />

                  <Text
                    variant="bodySmall"
                    style={[
                      styles.themeOptionLabel,
                      {
                        color: selected
                          ? colors.primary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>
    </AppScroll>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionCopy: {
    marginTop: Spacing.sm,
  },
  badgeRow: {
    marginTop: Spacing.md,
  },
  logoutAction: {
    marginTop: Spacing.md,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    marginRight: Spacing.sm,
  },
  currentTheme: {
    marginBottom: Spacing.md,
  },
  themeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  themeOption: {
    flexGrow: 1,
    flexBasis: 96,
    minWidth: 88,
    minHeight: ControlSize.minimumTouchTarget,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  themeOptionLabel: {
    fontWeight: Typography.label.fontWeight,
  },
});

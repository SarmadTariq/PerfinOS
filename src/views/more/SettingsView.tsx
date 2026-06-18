/**
 * SettingsView: workspace mode, appearance theme, and session controls.
 * Privacy and app scope disclosures live in Privacy & Help.
 */
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
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
import { useTheme, useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

export const SettingsScreen = () => {
  const { logout, isGuest, data } = useFinance();
  const { mode, resolved, setMode } = useTheme();
  const navigation = useNavigation<any>();
  const colors = useColors();

  const themeOptions: { label: string; value: 'light' | 'dark' | 'system' }[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ];

  return (
    <AppScroll>
      <ScreenHeader
        title="Settings"
        subtitle="Appearance, workspace, and session controls."
        action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
      />

      <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
        <Text variant="h4">Workspace Mode</Text>

        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          {isGuest
            ? 'Guest data stays on this device. Sign in to unlock cloud sync, receipt uploads, account recovery, and AI planning.'
            : 'Your PerFin OS workspace syncs through Firebase. Receipt and AI features use configured production gateways when keys are provided.'}
        </Text>

        <View style={{ marginTop: Spacing.md }}>
          <CategoryBadge
            label={`Plan: ${data?.entitlement.plan || 'guest'}`}
            color={isGuest ? Colors.light.warning : Colors.light.success}
            icon={isGuest ? 'person-outline' : 'verified'}
            library="mi"
          />
        </View>

        <Button label="Logout" variant="danger" onPress={logout} style={{ marginTop: Spacing.md }} />
      </Card>

      <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
          <MaterialIcons
            name="brightness-6"
            size={20}
            color={colors.primary}
            style={{ marginRight: Spacing.sm }}
          />
          <Text variant="h4">Appearance</Text>
        </View>

        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.md }}>
          Currently: {resolved === 'dark' ? '🌙 Dark' : '☀️ Light'} {mode === 'system' ? '(following system)' : '(manual override)'}
        </Text>

        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setMode(opt.value)}
              accessibilityRole="button"
              accessibilityLabel={`Set theme to ${opt.label}`}
              style={{
                flex: 1,
                paddingVertical: Spacing.sm,
                paddingHorizontal: Spacing.md,
                borderRadius: Radius.md,
                borderWidth: 1.5,
                alignItems: 'center',
                borderColor: mode === opt.value ? colors.primary : colors.border,
                backgroundColor: mode === opt.value ? colors.primarySoft : colors.bgSecondary,
              }}
            >
              <Text
                variant="bodySmall"
                style={{
                  color: mode === opt.value ? colors.primary : colors.textSecondary,
                  fontWeight: '700',
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </AppScroll>
  );
};
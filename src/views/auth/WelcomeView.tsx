/**
 * WelcomeView — landing screen with login, signup, and guest access entry points.
 * Extracted from PerFinOSScreens.tsx (WelcomeScreen).
 */
import React from 'react';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import { useFinance } from '../../context/FinanceContext';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Spacing, Radius } from '../../theme';
import { AppScroll } from '../../components/layout/AppScroll';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

export const WelcomeScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const { continueAsGuest } = useFinance();
  return (
    <AppScroll>
      <View style={{ alignItems: 'center', paddingVertical: Spacing.xxxl }}>
        <View style={{ width: 74, height: 74, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg, backgroundColor: colors.primarySoft }}>
          <MaterialIcons name="query-stats" size={42} color={colors.primary} />
        </View>
        <Text variant="h1" style={{ textAlign: 'center' }}>
          PerFin OS
        </Text>
        <Text variant="bodyLarge" color="secondary" style={{ textAlign: 'center', marginTop: Spacing.md, maxWidth: 360 }}>
          Track expenses, see where they happen, and plan your next month with cleaner financial visibility.
        </Text>
      </View>
      <Card shadow="sm">
        <Text variant="h4">Secure finance workspace</Text>
        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          Sign in to sync your data, attach receipts, and unlock AI planning features.
        </Text>
        <Button label="Login" onPress={() => navigation.navigate('Login')} size="lg" style={{ marginTop: Spacing.lg }} />
        <Button label="Create Account" onPress={() => navigation.navigate('Signup')} variant="secondary" style={{ marginTop: Spacing.sm }} />
        <Button label="Continue as Guest" onPress={continueAsGuest} variant="secondary" style={{ marginTop: Spacing.sm }} />
      </Card>
    </AppScroll>
  );
};

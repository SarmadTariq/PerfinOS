/**
 * WelcomeView — professional auth landing with login, signup, and low-emphasis guest access.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Text } from '../../components/base';
import { useFinance } from '../../context/FinanceContext';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';
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
      <View style={styles.screen}>
        <View style={styles.brandBlock}>
          <View style={[styles.logoTile, { backgroundColor: colors.primarySoft }]}>
            <MaterialIcons name="query-stats" size={40} color={colors.primary} />
          </View>

          <Text variant="h1" style={styles.title}>
            PerFin OS
          </Text>

          <View style={styles.subtitleBlock}>
            <Text variant="bodyLarge" color="secondary" style={styles.subtitleLine}>
              Track spending by category and location.
            </Text>
            <Text variant="bodyLarge" color="secondary" style={styles.subtitleLine}>
              Review budgets, reports, and next-month plans with confidence.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Login"
            onPress={() => navigation.navigate('Login')}
            size="lg"
            accessibilityLabel="Log in to PerFin OS"
          />

          <Button
            label="Create Account"
            onPress={() => navigation.navigate('Signup')}
            variant="secondary"
            size="lg"
            accessibilityLabel="Create a PerFin OS account"
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Continue as guest"
            onPress={continueAsGuest}
            style={styles.guestAction}
            activeOpacity={0.7}
          >
            <Text variant="bodySmall" color="tertiary" style={styles.guestText}>
              Continue as guest
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppScroll>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 640,
    justifyContent: 'center',
    paddingTop: Spacing.xxxl,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoTile: {
    width: 84,
    height: 84,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitleBlock: {
    maxWidth: 360,
  },
  subtitleLine: {
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: Spacing.md,
  },
  guestAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  guestText: {
    fontWeight: '600',
  },
});
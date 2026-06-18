/**
 * WelcomeView — landing screen with login, signup, and guest access entry points.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Text } from '../../components/base';
import { useFinance } from '../../context/FinanceContext';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

export const WelcomeScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const { continueAsGuest } = useFinance();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={styles.screen}>
        <View style={styles.content}>
          <View style={styles.brandBlock}>
            <View style={[styles.logoTile, { backgroundColor: colors.primarySoft }]}>
              <MaterialIcons name="query-stats" size={42} color={colors.primary} />
            </View>

            <Text variant="h1" style={styles.title}>
              PerFin OS
            </Text>

            <Text variant="bodyLarge" color="secondary" style={styles.subtitle}>
              {'Track spending, map habits,\nand plan next month.'}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              label="Login"
              onPress={() => navigation.navigate('Login')}
              size="lg"
            />

            <Button
              label="Create Account"
              onPress={() => navigation.navigate('Signup')}
              variant="secondary"
              style={styles.secondaryAction}
            />

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Continue as Guest"
              onPress={continueAsGuest}
              style={styles.guestAction}
              activeOpacity={0.7}
            >
              <Text variant="bodySmall" color="tertiary" style={styles.guestText}>
                Continue as Guest
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoTile: {
    width: 74,
    height: 74,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.md,
    maxWidth: 340,
  },
  actions: {
    width: '100%',
  },
  secondaryAction: {
    marginTop: Spacing.sm,
  },
  guestAction: {
    alignSelf: 'center',
    marginTop: Spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  guestText: {
    fontWeight: '600',
  },
});
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Text } from '../../components/base';
import { AppScroll } from '../../components/layout/AppScroll';
import { useFinance } from '../../context/FinanceContext';
import { useColors } from '../../context/ThemeContext';
import { ControlSize, Radius, Spacing } from '../../theme';

export const WelcomeScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const { continueAsGuest } = useFinance();

  return (
    <AppScroll>
      <View style={styles.screen}>
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View
              style={[
                styles.brandMark,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <MaterialIcons
                name="query-stats"
                size={22}
                color={colors.primary}
                accessible={false}
              />
            </View>

            <Text variant="h4">PerFin OS</Text>
          </View>

          <View style={styles.hero}>
            <Text variant="h1" style={styles.title}>
              See your money clearly.
            </Text>

            <Text
              variant="bodyLarge"
              color="secondary"
              style={styles.subtitle}
            >
              Review activity, understand spending patterns, and turn
              insights into a practical plan.
            </Text>
          </View>
        </View>

        <View style={styles.decisionArea}>
          <View style={styles.actions}>
            <Button
              label="Log in"
              onPress={() => navigation.navigate('Login')}
              size="lg"
              accessibilityLabel="Log in to PerFin OS"
            />

            <Button
              label="Create account"
              onPress={() => navigation.navigate('Signup')}
              variant="secondary"
              size="lg"
              accessibilityLabel="Create a PerFin OS account"
            />

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Continue as guest"
              onPress={continueAsGuest}
              activeOpacity={0.82}
              style={styles.guestAction}
            >
              <Text variant="body" color="secondary">
                Continue as guest
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            variant="bodySmall"
            color="tertiary"
            style={styles.guestNote}
          >
            Guest mode keeps this workspace on this device.
          </Text>
        </View>
      </View>
    </AppScroll>
  );
};

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 480,
    minHeight: 620,
    alignSelf: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
  },
  content: {
    width: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  brandMark: {
    width: ControlSize.iconButton,
    height: ControlSize.iconButton,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginTop: Spacing.xxxl,
  },
  title: {
    maxWidth: 420,
  },
  subtitle: {
    maxWidth: 420,
    marginTop: Spacing.md,
  },
  decisionArea: {
    width: '100%',
    marginTop: Spacing.xxxl,
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
  },
  guestAction: {
    minHeight: ControlSize.minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  guestNote: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});

/**
 * Email and password login with optional
 * guest-data import.
 */
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Button,
  Card,
  Text,
} from '../../components/base';
import { ScreenHeader } from '../../components/finance';
import { Field } from '../../components/form/Field';
import { AppScroll } from '../../components/layout/AppScroll';
import { useFinance } from '../../context/FinanceContext';
import { useColors } from '../../context/ThemeContext';
import {
  ControlSize,
  Spacing,
  Typography,
} from '../../theme';

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();

  const {
    loginWithEmail,
    continueAsGuest,
    data,
  } = useFinance();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] =
    useState<string | null>(null);

  const submit = async (
    importGuestData = false,
  ) => {
    try {
      await loginWithEmail(
        email,
        password,
        { importGuestData },
      );
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const confirmLogin = () => {
    if (
      data?.entitlement?.isGuest &&
      data.transactions.length > 0
    ) {
      Alert.alert(
        'Import guest data?',
        'You have local guest data. Import it into this account after login?',
        [
          {
            text: 'Start Fresh',
            style: 'cancel',
            onPress: () => submit(false),
          },
          {
            text: 'Import',
            onPress: () => submit(true),
          },
        ],
      );

      return;
    }

    submit(false);
  };

  return (
    <AppScroll>
      <ScreenHeader
        title="Log in"
        subtitle="Access your PerFin OS workspace."
      />

      <Card shadow="sm">
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
        />

        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />

        {error ? (
          <Text
            accessibilityRole="alert"
            color="danger"
            style={styles.error}
          >
            {error}
          </Text>
        ) : null}

        <Button
          label="Log in"
          onPress={confirmLogin}
          size="lg"
        />

        <Button
          label="Continue as guest"
          onPress={continueAsGuest}
          variant="secondary"
          style={styles.guestAction}
        />

        <Button
          label="Create account"
          onPress={() =>
            navigation.navigate('Signup')
          }
          variant="secondary"
          style={styles.createAction}
        />

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
          onPress={() =>
            navigation.navigate('ForgotPassword')
          }
          activeOpacity={0.82}
          style={styles.forgotAction}
        >
          <Text
            style={[
              styles.forgotLabel,
              {
                color: colors.actionPrimary,
              },
            ]}
          >
            Forgot password?
          </Text>
        </TouchableOpacity>
      </Card>
    </AppScroll>
  );
};

const styles = StyleSheet.create({
  error: {
    marginBottom: Spacing.md,
  },

  guestAction: {
    marginTop: Spacing.md,
  },

  createAction: {
    marginTop: Spacing.sm,
  },

  forgotAction: {
    minHeight: ControlSize.minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },

  forgotLabel: {
    ...Typography.label,
    textAlign: 'center',
  },
});

/**
 * LoginView — email/password login with optional guest-data import dialog.
 * Extracted from PerFinOSScreens.tsx (LoginScreen).
 */
import React, { useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import { ScreenHeader } from '../../components/finance';
import { Field } from '../../components/form/Field';
import { AppScroll } from '../../components/layout/AppScroll';
import { useFinance } from '../../context/FinanceContext';
import { Colors, Spacing } from '../../theme';

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const { loginWithEmail, continueAsGuest, data } = useFinance();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (importGuestData = false) => {
    try {
      await loginWithEmail(email, password, { importGuestData });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const confirmLogin = () => {
    if (data?.entitlement?.isGuest && data.transactions.length > 0) {
      Alert.alert('Import guest data?', 'You have local guest data. Import it into this account after login?', [
        { text: 'Start Fresh', style: 'cancel', onPress: () => submit(false) },
        { text: 'Import', onPress: () => submit(true) },
      ]);
      return;
    }
    submit(false);
  };

  return (
    <AppScroll>
      <ScreenHeader title="Login" subtitle="Access your PerFin OS workspace." />
      <Card shadow="sm">
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {error ? <Text color="danger">{error}</Text> : null}
        <Button label="Login" onPress={confirmLogin} size="lg" />
        <Button label="Continue as Guest" onPress={continueAsGuest} variant="secondary" style={{ marginTop: Spacing.md }} />
        <Button label="Create Account" onPress={() => navigation.navigate('Signup')} variant="secondary" style={{ marginTop: Spacing.sm }} />
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} accessibilityRole="button">
          <Text style={{ color: Colors.light.primary, fontWeight: '700', textAlign: 'center', marginTop: Spacing.lg }}>Forgot password?</Text>
        </TouchableOpacity>
      </Card>
    </AppScroll>
  );
};

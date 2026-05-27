/**
 * SignupView — account creation with optional guest-data import dialog.
 * Extracted from PerFinOSScreens.tsx (SignupScreen).
 */
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import { ScreenHeader } from '../../components/finance';
import { Field } from '../../components/form/Field';
import { AppScroll } from '../../components/layout/AppScroll';
import { useFinance } from '../../context/FinanceContext';
import { Spacing } from '../../theme';

export const SignupScreen = () => {
  const navigation = useNavigation<any>();
  const { signupWithEmail, data } = useFinance();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (importGuestData = false) => {
    try {
      await signupWithEmail(name, email, password, { importGuestData });
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    }
  };

  const confirmSignup = () => {
    if (data?.entitlement?.isGuest && data.transactions.length > 0) {
      Alert.alert('Import guest data?', 'Create your account and import local guest data?', [
        { text: 'Start Fresh', style: 'cancel', onPress: () => submit(false) },
        { text: 'Import', onPress: () => submit(true) },
      ]);
      return;
    }
    submit(false);
  };

  return (
    <AppScroll>
      <ScreenHeader title="Create Account" subtitle="Create a synced PerFin OS workspace." />
      <Card shadow="sm">
        <Field label="Name" value={name} onChangeText={setName} placeholder="Full name" />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry />
        {error ? <Text color="danger">{error}</Text> : null}
        <Button label="Create Account" onPress={confirmSignup} size="lg" />
        <Button label="Back to Login" onPress={() => navigation.navigate('Login')} variant="secondary" style={{ marginTop: Spacing.md }} />
      </Card>
    </AppScroll>
  );
};

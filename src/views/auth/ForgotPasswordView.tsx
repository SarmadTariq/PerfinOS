/**
 * ForgotPasswordView — sends a password reset email via FinanceContext.
 * Extracted from PerFinOSScreens.tsx (ForgotPasswordScreen).
 */
import React, { useState } from 'react';
import { Button, Card, Text } from '../../components/base';
import { ScreenHeader } from '../../components/finance';
import { Field } from '../../components/form/Field';
import { AppScroll } from '../../components/layout/AppScroll';
import { useFinance } from '../../context/FinanceContext';
import { Spacing } from '../../theme';

export const ForgotPasswordScreen = () => {
  const { forgotPassword } = useFinance();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    try {
      await forgotPassword(email);
      setMessage('If this email exists, PerFin OS will send password recovery instructions.');
    } catch (err: any) {
      setMessage(err.message || 'Email is required');
    }
  };

  return (
    <AppScroll>
      <ScreenHeader title="Forgot Password" subtitle="Recover access to your PerFin OS account." />
      <Card shadow="sm">
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Button label="Send Reset Instructions" onPress={submit} />
        {message ? <Text color="secondary" style={{ marginTop: Spacing.md }}>{message}</Text> : null}
      </Card>
    </AppScroll>
  );
};

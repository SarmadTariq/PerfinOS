/**
 * OnboardingView — initial profile setup (name, income, budget, currency).
 */
import React, { useState } from 'react';
import { Button, Card, Text } from '../../components/base';
import { ScreenHeader } from '../../components/finance';
import { Field } from '../../components/form/Field';
import { SelectField } from '../../components/form/SelectField';
import { AppScroll } from '../../components/layout/AppScroll';
import { useFinance } from '../../context/FinanceContext';
import { sanitizeMoneyInput } from '../../utils/validation';

const CURRENCY_OPTIONS = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'INR', 'JPY'];

export const OnboardingScreen = () => {
  const { data, completeOnboarding } = useFinance();
  const [name, setName] = useState(data?.user.name || '');
  const [income, setIncome] = useState(String(data?.user.monthlyIncome || 0));
  const [budget, setBudget] = useState(String(data?.user.monthlyBudget || 0));
  const [currency, setCurrency] = useState(data?.user.currency || 'USD');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const monthlyIncome = Number(income);
    const monthlyBudget = Number(budget);
    if (!name.trim()) return setError('Name is required');
    if (monthlyIncome <= 0) return setError('Monthly income must be positive');
    if (monthlyBudget < 0) return setError('Budget cannot be negative');
    await completeOnboarding({ name, monthlyIncome, monthlyBudget, currency });
  };

  return (
    <AppScroll>
      <ScreenHeader title="Onboarding" subtitle="Set the profile basics that power the dashboard." />
      <Card shadow="sm">
        <Field label="Name" value={name} onChangeText={setName} placeholder="Full name" />
        <SelectField label="Currency" value={currency} options={CURRENCY_OPTIONS} onChange={setCurrency} />
        <Field label="Monthly Income" value={income} onChangeText={(value) => setIncome(sanitizeMoneyInput(value))} placeholder="4200" keyboardType="numeric" />
        <Field label="Monthly Budget" value={budget} onChangeText={(value) => setBudget(sanitizeMoneyInput(value))} placeholder="2600" keyboardType="numeric" />
        {error ? <Text color="danger">{error}</Text> : null}
        <Button label="Finish Setup" onPress={submit} size="lg" />
      </Card>
    </AppScroll>
  );
};

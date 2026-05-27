/**
 * ProfileView — edit user profile settings (name, email, phone, income, budget).
 * Extracted from PerFinOSScreens.tsx (ProfileScreen).
 */
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Button, Card } from '../../components/base';
import {
  IconButton,
  ScreenHeader,
  Toast,
} from '../../components/finance';
import { Field } from '../../components/form/Field';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';

export const ProfileScreen = () => (
  <RequireData>
    {(data) => {
      const { updateUser } = useFinance();
      const navigation = useNavigation<any>();
      const [name, setName] = useState(data.user.name);
      const [email, setEmail] = useState(data.user.email);
      const [phone, setPhone] = useState(data.user.phone);
      const [income, setIncome] = useState(String(data.user.monthlyIncome));
      const [budget, setBudget] = useState(String(data.user.monthlyBudget));
      const [toast, setToast] = useState<string | null>(null);
      return (
        <AppScroll>
          <ScreenHeader title="Profile" subtitle="Profile settings for your PerFin OS workspace." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          <Card shadow="sm">
            <Field label="Name" value={name} onChangeText={setName} placeholder="Full name" />
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
            <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 416 555 0198" keyboardType="phone-pad" />
            <Field label="Monthly Income" value={income} onChangeText={setIncome} placeholder="4200" keyboardType="numeric" />
            <Field label="Monthly Budget" value={budget} onChangeText={setBudget} placeholder="2600" keyboardType="numeric" />
            <Button label="Save Profile" onPress={() => updateUser({ name, email, phone, monthlyIncome: Number(income), monthlyBudget: Number(budget) }).then(() => setToast('Profile saved'))} />
          </Card>
          <Toast message={toast} />
        </AppScroll>
      );
    }}
  </RequireData>
);

/**
 * ProfileView — edit user profile settings (name, email, phone, income, budget).
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import { IconButton, ScreenHeader } from '../../components/finance';
import { Field } from '../../components/form/Field';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { Spacing } from '../../theme';

export const ProfileScreen = () => {
  const { logout } = useFinance();

  return (
    <RequireData>
      {(data) => {
        const { updateUser } = useFinance();
        const navigation = useNavigation<any>();
        const [name, setName] = useState(data.user.name);
        const [email, setEmail] = useState(data.user.email);
        const [phone, setPhone] = useState(data.user.phone);
        const [income, setIncome] = useState(String(data.user.monthlyIncome));
        const [budget, setBudget] = useState(String(data.user.monthlyBudget));
        const [notice, setNotice] = useState<string | null>(null);

        useEffect(() => {
          if (!notice) return;

          const timer = setTimeout(() => setNotice(null), 2500);
          return () => clearTimeout(timer);
        }, [notice]);

        return (
          <AppScroll>
            <ScreenHeader
              title="Profile"
              subtitle="Profile settings for your PerFin OS workspace."
              action={
                <IconButton
                  icon="arrow-back"
                  label="Go back"
                  onPress={() => navigation.goBack()}
                />
              }
            />

            {notice ? (
              <Text variant="bodySmall" color="secondary" style={styles.notice}>
                {notice}
              </Text>
            ) : null}

            <Card>
              <Field
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Full name"
              />

              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
              />

              <Field
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 416 555 0198"
                keyboardType="phone-pad"
              />

              <Field
                label="Monthly income"
                value={income}
                onChangeText={setIncome}
                placeholder="4200"
                keyboardType="numeric"
              />

              <Field
                label="Monthly budget"
                value={budget}
                onChangeText={setBudget}
                placeholder="2600"
                keyboardType="numeric"
              />

              <Button
                label="Save profile"
                onPress={() =>
                  updateUser({
                    name,
                    email,
                    phone,
                    monthlyIncome: Number(income),
                    monthlyBudget: Number(budget),
                  }).then(() => setNotice('Profile saved'))
                }
              />

              <Button
                label="Logout"
                variant="danger"
                onPress={logout}
                style={styles.logoutAction}
              />
            </Card>

            <Card style={styles.sectionCard}>
              <Text variant="h4">Account & app</Text>

              <Text
                variant="bodySmall"
                color="secondary"
                style={styles.sectionCopy}
              >
                Manage categories, preferences, privacy, and support.
              </Text>

              <Button
                label="Categories"
                variant="secondary"
                onPress={() => navigation.navigate('Categories')}
                style={styles.firstUtilityAction}
              />

              <Button
                label="Settings"
                variant="secondary"
                onPress={() => navigation.navigate('Settings')}
                style={styles.utilityAction}
              />

              <Button
                label="Privacy & help"
                variant="secondary"
                onPress={() => navigation.navigate('HelpAbout')}
                style={styles.utilityAction}
              />
            </Card>
          </AppScroll>
        );
      }}
    </RequireData>
  );
};

const styles = StyleSheet.create({
  notice: {
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  logoutAction: {
    marginTop: Spacing.md,
  },
  sectionCard: {
    marginTop: Spacing.lg,
  },
  sectionCopy: {
    marginTop: Spacing.sm,
  },
  firstUtilityAction: {
    marginTop: Spacing.md,
  },
  utilityAction: {
    marginTop: Spacing.sm,
  },
});

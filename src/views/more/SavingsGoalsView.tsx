/**
 * SavingsGoalsView — create, track, and manage savings targets.
 */
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  EmptyState,
  IconButton,
  ProgressBar,
  ScreenHeader,
} from '../../components/finance';
import { Field } from '../../components/form/Field';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { calculateSavingsProgress } from '../../repositories/AnalyticsRepository';
import { Spacing } from '../../theme';
import { formatCurrency } from '../../utils/format';

export const SavingsGoalsScreen = () => (
  <RequireData>
    {(data) => {
      const { addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } = useFinance();
      const navigation = useNavigation<any>();
      const [name, setName] = useState('');
      const [target, setTarget] = useState('');
      const [current, setCurrent] = useState('0');
      const [targetDate, setTargetDate] = useState('2026-12-31');
      const savings = calculateSavingsProgress(data.savingsGoals);
      const create = () => addSavingsGoal({ name, targetAmount: Number(target), currentAmount: Number(current), targetDate }).then(() => {
        setName('');
        setTarget('');
      }).catch((err) => Alert.alert('Savings goal error', err.message));
      return (
        <AppScroll>
          <ScreenHeader title="Savings Goals" subtitle={`${savings.percentage}% overall progress across active goals.`} action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
            <Field label="Goal Name" value={name} onChangeText={setName} placeholder="Emergency fund" />
            <Field label="Target Amount" value={target} onChangeText={setTarget} placeholder="5000" keyboardType="numeric" />
            <Field label="Current Amount" value={current} onChangeText={setCurrent} placeholder="1000" keyboardType="numeric" />
            <Field label="Target Date" value={targetDate} onChangeText={setTargetDate} placeholder="YYYY-MM-DD" />
            <Button label="Create Goal" onPress={create} />
          </Card>
          {data.savingsGoals.length === 0 ? <EmptyState title="No savings goals" message="Create a target to track savings progress." /> : data.savingsGoals.map((goal) => {
            const pct = (goal.currentAmount / goal.targetAmount) * 100;
            return (
              <Card key={goal.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
                <View style={styles.rowBetween}>
                  <Text variant="h4">{goal.name}</Text>
                  <Text variant="bodySmall" color="secondary">{Math.round(pct)}%</Text>
                </View>
                <ProgressBar value={pct} />
                <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.sm }}>
                  {formatCurrency(goal.currentAmount, data.user.currency)} saved of {formatCurrency(goal.targetAmount, data.user.currency)} by {goal.targetDate}
                </Text>
                <View style={styles.cardActions}>
                  <Button label="+ $100" variant="secondary" onPress={() => updateSavingsGoal(goal.id, { currentAmount: goal.currentAmount + 100 })} style={{ flex: 1 }} />
                  <Button label="Delete" variant="danger" onPress={() => deleteSavingsGoal(goal.id)} style={{ flex: 1 }} />
                </View>
              </Card>
            );
          })}
        </AppScroll>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
});

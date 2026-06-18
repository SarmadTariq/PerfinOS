/**
 * RecurringExpensesView — list and toggle detected recurring charges.
 */
import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Text } from '../../components/base';
import {
  EmptyState,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { Spacing } from '../../theme';
import { formatCurrencyPrecise } from '../../utils/format';

export const RecurringExpensesScreen = () => (
  <RequireData>
    {(data) => {
      const { updateRecurringExpense } = useFinance();
      const navigation = useNavigation<any>();
      return (
        <AppScroll>
          <ScreenHeader title="Recurring Expenses" subtitle="Detected subscriptions and recurring charges." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          {data.recurringExpenses.length === 0 ? <EmptyState title="No recurring expenses" message="Mark a transaction as recurring to track it here." /> : data.recurringExpenses.map((item) => (
            <Card key={item.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
              <View style={styles.rowBetween}>
                <Text variant="h4">{item.merchant}</Text>
                <Switch value={item.status === 'active'} onValueChange={(value) => updateRecurringExpense(item.id, { status: value ? 'active' : 'inactive' })} />
              </View>
              <Text variant="body" color="secondary">{formatCurrencyPrecise(item.amount, data.user.currency)} · {item.category} · {item.frequency}</Text>
              <Text variant="caption" color="tertiary">Next expected: {item.nextDate}</Text>
            </Card>
          ))}
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
});

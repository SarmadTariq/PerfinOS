/**
 * BudgetsView — monthly budget management with category-level breakdown.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  CategoryBadge,
  IconButton,
  ProgressBar,
  ScreenHeader,
} from '../../components/finance';
import { Field } from '../../components/form/Field';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { calculateBudgetHealth, calculateCategoryBreakdown } from '../../repositories/AnalyticsRepository';
import { Colors, Spacing } from '../../theme';
import { formatCurrency, getMonthKey } from '../../utils/format';

export const BudgetsScreen = () => (
  <RequireData>
    {(data) => {
      const { upsertBudget } = useFinance();
      const navigation = useNavigation<any>();
      const month = getMonthKey();
      const current = data.budgets.find((item) => item.month === month);
      const [budgetValue, setBudgetValue] = useState(String(current?.totalBudget || data.user.monthlyBudget));
      const health = calculateBudgetHealth(data.transactions, current, data.categories, month);
      const breakdown = calculateCategoryBreakdown(data.transactions, data.categories, month);
      return (
        <AppScroll>
          <ScreenHeader title="Budgets" subtitle="Monthly and category budget tracking." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
            <Text variant="h4">Monthly Budget</Text>
            <Field label="Total Budget" value={budgetValue} onChangeText={setBudgetValue} placeholder="2600" keyboardType="numeric" />
            <ProgressBar value={health.usedPercent} color={health.usedPercent > 100 ? Colors.light.danger : undefined} />
            <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.sm }}>
              {formatCurrency(health.spent, data.user.currency)} spent of {formatCurrency(Number(budgetValue), data.user.currency)}
            </Text>
            <Button label="Save Budget" onPress={() => upsertBudget({ month, totalBudget: Number(budgetValue) })} style={{ marginTop: Spacing.lg }} />
          </Card>
          {breakdown.map((item) => (
            <Card key={item.categoryId} shadow="sm" style={{ marginBottom: Spacing.md }}>
              <View style={styles.rowBetween}>
                <CategoryBadge label={item.categoryName} icon={item.icon} color={item.color} />
                <Text>{item.percentage}%</Text>
              </View>
              <ProgressBar value={item.monthlyBudget ? (item.amount / item.monthlyBudget) * 100 : 0} color={item.color} />
              <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.sm }}>
                {formatCurrency(item.amount, data.user.currency)} of {formatCurrency(item.monthlyBudget, data.user.currency)}
              </Text>
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

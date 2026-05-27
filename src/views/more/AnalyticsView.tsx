/**
 * AnalyticsView — responsive text-supported charts for full financial review.
 * Extracted from PerFinOSScreens.tsx (AnalyticsScreen).
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BarListChart,
  ChartCard,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import {
  groupTransactionsByMonth,
  groupTransactionsByWeek,
} from '../../repositories/AnalyticsRepository';
import { Colors } from '../../theme';

export const AnalyticsScreen = () => (
  <RequireData>
    {(data) => {
      const months = groupTransactionsByMonth(data.transactions);
      const weeks = groupTransactionsByWeek(data.transactions);
      const monthlyTrend = Object.entries(months).map(([label, items]) => ({
        label,
        value: items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
        color: '#367C9D',
      }));
      const weekly = Object.entries(weeks).map(([label, items]) => ({
        label,
        value: items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
        color: '#D95F43',
      }));
      const incomeVsExpenses = ['income', 'expense'].map((type) => ({
        label: type,
        value: data.transactions.filter((item) => item.type === type).reduce((sum, item) => sum + item.amount, 0),
        color: type === 'income' ? Colors.light.success : Colors.light.danger,
      }));
      const topMerchants = Object.entries(data.transactions.reduce<Record<string, number>>((acc, item) => {
        if (item.type === 'expense') acc[item.merchant] = (acc[item.merchant] || 0) + item.amount;
        return acc;
      }, {})).map(([label, value]) => ({ label, value, color: '#725EAB' })).sort((a, b) => b.value - a.value);
      const savingsData = data.savingsGoals.map((goal) => ({ label: goal.name, value: goal.currentAmount, secondary: `${Math.round((goal.currentAmount / goal.targetAmount) * 100)}% funded`, color: Colors.light.success }));
      const recurringData = data.recurringExpenses.map((item) => ({ label: item.merchant, value: item.amount, color: '#C18726', secondary: `${item.frequency}, next ${item.nextDate}` }));

      const navigation = useNavigation<any>();
      return (
        <AppScroll>
          <ScreenHeader title="Analytics" subtitle="Responsive text-supported charts for finance review." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          <ChartCard title="Monthly Spending Trend" summary="Compares expense totals by month.">
            <BarListChart data={monthlyTrend} currency={data.user.currency} />
          </ChartCard>
          <ChartCard title="Income vs Expenses" summary="Shows total income and spending across your tracked data.">
            <BarListChart data={incomeVsExpenses} currency={data.user.currency} />
          </ChartCard>
          <ChartCard title="Weekly Spending" summary="Groups expense activity by week start date.">
            <BarListChart data={weekly} currency={data.user.currency} />
          </ChartCard>
          <ChartCard title="Savings Progress" summary="Charts saved amounts for each goal.">
            <BarListChart data={savingsData} currency={data.user.currency} />
          </ChartCard>
          <ChartCard title="Recurring Expenses" summary="Detected and manually marked recurring charges.">
            <BarListChart data={recurringData} currency={data.user.currency} />
          </ChartCard>
          <ChartCard title="Top Merchants" summary="Ranks merchants by tracked spending.">
            <BarListChart data={topMerchants.slice(0, 8)} currency={data.user.currency} />
          </ChartCard>
        </AppScroll>
      );
    }}
  </RequireData>
);

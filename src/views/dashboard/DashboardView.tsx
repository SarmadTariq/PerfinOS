/**
 * DashboardView — main overview screen with hero panel, metric grid, budget health,
 * category chart, and recent transactions.
 * Includes DashboardHero inline component.
 * Extracted from PerFinOSScreens.tsx (DashboardScreen + DashboardHero).
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  BarListChart,
  ChartCard,
  EmptyState,
  IconButton,
  MetricGrid,
  ProgressBar,
  ScreenHeader,
  StatCard,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useThemeScheme } from '../../context/ThemeContext';
import { Category, Transaction } from '../../models/finance';
import {
  calculateBudgetHealth,
  calculateCategoryBreakdown,
  calculateSavingsProgress,
  calculateMonthlySummary,
  sortTransactions,
} from '../../repositories/AnalyticsRepository';
import { Colors, Radius, Spacing } from '../../theme';
import { formatCurrency, formatCurrencyPrecise, getMonthKey, readableMonth } from '../../utils/format';
import { mcIconName } from '../../utils/icons';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

const DashboardHero = ({
  name,
  month,
  netCashFlow,
  budgetUsed,
  currency,
  onAdd,
}: {
  name: string;
  month: string;
  netCashFlow: number;
  budgetUsed: number;
  currency: string;
  onAdd: () => void;
}) => {
  const colors = useColors();
  const status = budgetUsed >= 100 ? 'Over budget' : budgetUsed >= 85 ? 'Watch pace' : 'On track';
  const statusColor = budgetUsed >= 100 ? colors.danger : budgetUsed >= 85 ? colors.warning : colors.success;
  return (
    <View style={[styles.dashboardHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.heroCopy}>
        <Text variant="h1" style={styles.heroTitle}>
          Good afternoon, {name.split(' ')[0]}
        </Text>
        <Text variant="body" color="secondary" style={{ maxWidth: 480 }}>
          {readableMonth(month)} is showing {formatCurrency(netCashFlow, currency)} in net cash flow with budget usage currently marked as {status.toLowerCase()}.
        </Text>
      </View>
      <View style={[styles.heroPanel, { backgroundColor: colors.bg }]}>
        <Text variant="bodySmall" color="secondary">
          Monthly budget status
        </Text>
        <View style={styles.heroStatusRow}>
          <Text variant="h3" style={{ color: statusColor }}>
            {status}
          </Text>
          <Text variant="h3">{budgetUsed}%</Text>
        </View>
        <ProgressBar value={budgetUsed} color={statusColor} height={11} />
        <Button label="Add Transaction" onPress={onAdd} style={{ marginTop: Spacing.lg }} />
      </View>
    </View>
  );
};

const TransactionRow = ({
  transaction,
  categories,
  onPress,
}: {
  transaction: Transaction;
  categories: Category[];
  onPress?: () => void;
}) => {
  const category = categories.find((item) => item.id === transaction.categoryId);
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={styles.transactionRow}>
        <View style={[styles.iconTileSmall, { backgroundColor: `${category?.color || '#64748B'}22` }]}>
          <MaterialCommunityIcons name={mcIconName(category?.icon, 'food')} size={18} color={category?.color || '#64748B'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ fontWeight: '700' }}>{transaction.merchant}</Text>
          <Text variant="caption" color="secondary">
            {transaction.categoryName} · {transaction.location.neighborhood || transaction.location.address} · {transaction.date}
          </Text>
        </View>
        <Text style={{ color: transaction.type === 'income' ? Colors.light.success : Colors.light.danger, fontWeight: '700' }}>
          {transaction.type === 'income' ? '+' : '-'}{formatCurrencyPrecise(transaction.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const DashboardScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const month = getMonthKey();
      const budget = data.budgets.find((item) => item.month === month);
      const summary = calculateMonthlySummary(data.transactions, month);
      const breakdown = calculateCategoryBreakdown(data.transactions, data.categories, month);
      const health = calculateBudgetHealth(data.transactions, budget, data.categories, month);
      const savings = calculateSavingsProgress(data.savingsGoals);
      const recent = sortTransactions(data.transactions, 'date-desc').slice(0, 4);

      return (
        <AppScroll>
          <ScreenHeader
            title="Dashboard"
            subtitle={`${readableMonth(month)} overview for ${data.user.name}`}
            action={<IconButton icon="add" label="Add transaction" onPress={() => navigation.navigate('AddTransaction')} />}
          />
          <DashboardHero
            name={data.user.name}
            month={month}
            netCashFlow={summary.netCashFlow}
            budgetUsed={health.usedPercent}
            currency={data.user.currency}
            onAdd={() => navigation.navigate('AddTransaction')}
          />
          <MetricGrid>
            <StatCard label="Income" value={formatCurrency(summary.income, data.user.currency)} icon="trending-up" tone="success" helper={`${summary.transactionCount} tracked entries`} />
            <StatCard label="Expenses" value={formatCurrency(summary.expenses, data.user.currency)} icon="trending-down" tone="danger" helper={`${formatCurrency(summary.averageExpense, data.user.currency)} avg expense`} />
            <StatCard label="Budget Used" value={`${health.usedPercent}%`} icon="speed" tone={health.usedPercent > 85 ? 'warning' : 'primary'} helper={health.status} />
            <StatCard label="Savings" value={`${savings.percentage}%`} icon="savings" tone="success" helper={`${formatCurrency(savings.saved, data.user.currency)} saved`} />
          </MetricGrid>
          <ChartCard title="Budget Health" summary={`${formatCurrency(Math.max(health.remaining, 0), data.user.currency)} remaining from ${formatCurrency(health.totalBudget, data.user.currency)}.`}>
            <ProgressBar value={health.usedPercent} color={health.usedPercent > 100 ? Colors.light.danger : undefined} />
          </ChartCard>
          <ChartCard title="Top Categories" summary={breakdown[0] ? `${breakdown[0].categoryName} is the leading category at ${breakdown[0].percentage}% of spending.` : 'No category spend yet.'}>
            <BarListChart data={breakdown.slice(0, 5).map((item) => ({ label: item.categoryName, value: item.amount, color: item.color, secondary: `${item.percentage}% of expenses` }))} currency={data.user.currency} />
          </ChartCard>
          <Card shadow="sm">
            <View style={styles.rowBetween}>
              <Text variant="h4">Recent Transactions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Transactions')} accessibilityRole="button">
                <Text style={styles.linkInline}>View all</Text>
              </TouchableOpacity>
            </View>
            {recent.length === 0 ? (
              <EmptyState title="No transactions" message="Add your first transaction to unlock dashboard insights." />
            ) : (
              recent.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  categories={data.categories}
                  onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
                />
              ))
            )}
          </Card>
        </AppScroll>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  dashboardHero: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xl,
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
    minWidth: 260,
  },
  heroTitle: {
    marginBottom: Spacing.md,
  },
  heroPanel: {
    flex: 1,
    minWidth: 250,
    maxWidth: 380,
    borderRadius: Radius.lg,
    backgroundColor: Colors.light.bg,
    padding: Spacing.lg,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginVertical: Spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 64,
  },
  iconTileSmall: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInline: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
});

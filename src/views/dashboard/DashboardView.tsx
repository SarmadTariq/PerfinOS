/**
 * DashboardView - monthly command center for cash flow, budget pace,
 * focus panels, and recent activity.
 */
import React, { useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Card, Text } from '../../components/base';
import { BarListChart, EmptyState, IconButton, ProgressBar, ScreenHeader } from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useColors } from '../../context/ThemeContext';
import { AppData, Category, Transaction } from '../../models/finance';
import { calculateBudgetHealth, calculateCategoryBreakdown, calculateSavingsProgress, calculateMonthlySummary, sortTransactions } from '../../repositories/AnalyticsRepository';
import { ControlSize, Radius, Spacing, Typography } from '../../theme';
import { formatCurrency, formatCurrencyPrecise, getMonthKey, readableMonth } from '../../utils/format';
import { mcIconName } from '../../utils/icons';

type Tone = 'primary' | 'success' | 'warning' | 'danger';
type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];
type FocusKey = 'snapshot' | 'attention' | 'categories';

interface AttentionItem {
  title: string;
  detail: string;
  icon: MaterialIconName;
  tone: Tone;
}

interface SnapshotItem {
  label: string;
  value: string;
  detail: string;
  icon: MaterialIconName;
  tone: Tone;
}

interface CategoryFocusItem {
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
}

const focusTabs: { key: FocusKey; label: string }[] = [
  { key: 'snapshot', label: 'Snapshot' },
  { key: 'attention', label: 'Attention' },
  { key: 'categories', label: 'Categories' },
];

const HERO_TEXT_PROPS = {
  numberOfLines: 2,
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.92,
} as const;

const VALUE_TEXT_PROPS = {
  numberOfLines: 1,
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.86,
} as const;

const getBudgetStatus = (usedPercent: number): { label: string; tone: Tone } => {
  if (usedPercent >= 100) {
    return { label: 'Over budget', tone: 'danger' };
  }

  if (usedPercent >= 85) {
    return { label: 'Watch pace', tone: 'warning' };
  }

  return { label: 'On track', tone: 'success' };
};

const getToneColor = (tone: Tone, colors: ReturnType<typeof useColors>) => {
  if (tone === 'success') {
    return colors.success;
  }

  if (tone === 'warning') {
    return colors.warning;
  }

  if (tone === 'danger') {
    return colors.danger;
  }

  return colors.primary;
};

const getPanelContentWidth = (windowWidth: number) => {
  const horizontalPadding = windowWidth >= 900 ? Spacing.xxxl : Spacing.lg;
  const frameWidth = Math.min(windowWidth - horizontalPadding * 2, 1180);

  return Math.max(frameWidth - 36, 280);
};

const DashboardHero = ({
  month,
  netCashFlow,
  budgetUsed,
  budgetRemaining,
  totalBudget,
  topCategoryName,
  currency,
}: {
  month: string;
  netCashFlow: number;
  budgetUsed: number;
  budgetRemaining: number;
  totalBudget: number;
  topCategoryName?: string;
  currency: string;
}) => {
  const colors = useColors();
  const status = getBudgetStatus(budgetUsed);
  const statusColor = getToneColor(status.tone, colors);
  const hasBudget = totalBudget > 0;

  const statusInsight = topCategoryName
    ? `${topCategoryName} is the largest spending driver this month.`
    : 'Add transactions to unlock category-level spending signals.';

  return (
    <View style={[styles.dashboardHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.heroHeaderRow}>
        <View style={styles.heroTitleBlock}>
          <Text variant="caption" color="secondary" style={styles.eyebrow}>
            {readableMonth(month)} status
          </Text>
          <Text variant="h2" style={styles.heroMainMetric} {...HERO_TEXT_PROPS}>
            {formatCurrency(netCashFlow, currency)} net cash flow
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: `${statusColor}1F` }]}>
          <Text variant="bodySmall" style={[styles.statusPillText, { color: statusColor }]}>
            {status.label}
          </Text>
        </View>
      </View>

      <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />

      <View style={styles.heroBudgetRow}>
        <View style={styles.budgetTextBlock}>
          <Text variant="bodySmall" color="secondary" style={styles.budgetLabel}>
            Budget remaining
          </Text>
          <Text variant="h4" style={styles.budgetRemainingMetric} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.88}>
            {hasBudget
              ? `${formatCurrency(Math.max(budgetRemaining, 0), currency)} left from ${formatCurrency(totalBudget, currency)}`
              : 'No budget set for this month'}
          </Text>
        </View>

        <View style={styles.budgetPercentBlock}>
          <Text variant="h4" style={styles.budgetPercentText}>
            {hasBudget ? `${budgetUsed}%` : '0%'}
          </Text>
          <Text variant="caption" color="tertiary" style={styles.budgetUsedLabel}>
            used
          </Text>
        </View>
      </View>

      <ProgressBar value={budgetUsed} color={statusColor} height={8} />

      <View style={styles.heroInsightRow}>
        <MaterialIcons name="insights" size={18} color={colors.primary} />
        <Text variant="bodySmall" color="secondary" style={styles.heroInsightText}>
          {statusInsight}
        </Text>
      </View>
    </View>
  );
};

const SnapshotPanel = ({ items }: { items: SnapshotItem[] }) => {
  const colors = useColors();

  return (
    <View style={styles.focusPanelPageInner}>
      {items.map((item, index) => {
        const toneColor = getToneColor(item.tone, colors);

        return (
          <View
            key={item.label}
            style={[
              styles.snapshotRow,
              index < items.length - 1
                ? { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                : null,
            ]}
          >
            <View style={styles.snapshotIconAndLabel}>
              <View style={[styles.focusIcon, { backgroundColor: `${toneColor}1F` }]}>
                <MaterialIcons name={item.icon} size={19} color={toneColor} />
              </View>

              <View style={styles.snapshotCopy}>
                <Text variant="bodySmall" color="secondary" style={styles.snapshotLabel}>
                  {item.label}
                </Text>
                <Text variant="caption" color="tertiary" style={styles.snapshotDetail} numberOfLines={1}>
                  {item.detail}
                </Text>
              </View>
            </View>

            <View style={styles.snapshotValueBlock}>
              <Text variant="h4" style={styles.snapshotValue} {...VALUE_TEXT_PROPS}>
                {item.value}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const AttentionPanel = ({ items }: { items: AttentionItem[] }) => {
  const colors = useColors();

  return (
    <View style={styles.focusPanelPageInner}>
      {items.map((item, index) => {
        const toneColor = getToneColor(item.tone, colors);

        return (
          <View
            key={`${item.title}-${index}`}
            style={[
              styles.attentionRow,
              index < items.length - 1
                ? { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                : null,
            ]}
          >
            <View style={[styles.focusIcon, { backgroundColor: `${toneColor}1F` }]}>
              <MaterialIcons name={item.icon} size={18} color={toneColor} />
            </View>

            <View style={styles.attentionCopy}>
              <Text variant="body" style={styles.attentionTitle}>
                {item.title}
              </Text>
              <Text variant="bodySmall" color="secondary" style={styles.attentionDetail}>
                {item.detail}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const CategoriesPanel = ({
  items,
  currency,
}: {
  items: CategoryFocusItem[];
  currency: string;
}) => {
  if (items.length === 0) {
    return (
      <View style={styles.focusPanelPageInner}>
        <EmptyState title="No category spend yet" message="Add transactions to see your leading categories." />
      </View>
    );
  }

  return (
    <View style={styles.focusPanelPageInner}>
      <BarListChart
        data={items.map((item) => ({
          label: item.categoryName,
          value: item.amount,
          color: item.color,
          secondary: `${item.percentage}% of expenses`,
        }))}
        currency={currency}
      />
    </View>
  );
};

const DashboardFocusPanel = ({
  snapshotItems,
  attentionItems,
  categoryItems,
  currency,
}: {
  snapshotItems: SnapshotItem[];
  attentionItems: AttentionItem[];
  categoryItems: CategoryFocusItem[];
  currency: string;
}) => {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const pageWidth = getPanelContentWidth(width);
  const scrollRef = useRef<ScrollView>(null);
  const [activeFocus, setActiveFocus] = useState<FocusKey>('snapshot');

  const setFocus = (key: FocusKey, index: number) => {
    setActiveFocus(key);
    scrollRef.current?.scrollTo({ x: pageWidth * index, animated: true });
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    const safeIndex = Math.max(0, Math.min(index, focusTabs.length - 1));
    setActiveFocus(focusTabs[safeIndex].key);
  };

  return (
    <Card style={styles.focusCard}>
      <View style={styles.focusHeader}>
        <Text variant="h4" style={styles.focusTitle}>
          Month focus
        </Text>
        <Text variant="caption" color="tertiary" style={styles.focusSubtitle}>
          Choose a view or swipe between sections
        </Text>
      </View>

      <View style={[styles.segmentedControl, { backgroundColor: colors.bgTertiary }]}>
        {focusTabs.map((tab, index) => {
          const isActive = activeFocus === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Show ${tab.label}`}
              onPress={() => setFocus(tab.key, index)}
              style={[
                styles.segmentButton,
                {
                  backgroundColor: isActive
                    ? colors.primarySoft
                    : 'transparent',
                  borderColor: isActive
                    ? colors.primary
                    : 'transparent',
                },
              ]}
            >
              <Text
                variant="bodySmall"
                style={[
                  styles.segmentLabel,
                  {
                    color: isActive ? colors.text : colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        nestedScrollEnabled
      >
        <View style={{ width: pageWidth }}>
          <SnapshotPanel items={snapshotItems} />
        </View>

        <View style={{ width: pageWidth }}>
          <AttentionPanel items={attentionItems} />
        </View>

        <View style={{ width: pageWidth }}>
          <CategoriesPanel items={categoryItems} currency={currency} />
        </View>
      </ScrollView>

    </Card>
  );
};

const TransactionRow = ({
  transaction,
  categories,
  currency,
  onPress,
}: {
  transaction: Transaction;
  categories: Category[];
  currency: string;
  onPress?: () => void;
}) => {
  const category = categories.find((item) => item.id === transaction.categoryId);
  const colors = useColors();
  const categoryColor = category?.color || colors.textTertiary;
  const amountColor =
    transaction.type === 'income' ? colors.success : colors.danger;

  return (
    <TouchableOpacity
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        onPress
          ? `${transaction.merchant}, ${
              transaction.type === 'income' ? 'income' : 'expense'
            } ${formatCurrencyPrecise(transaction.amount, currency)}`
          : undefined
      }
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.82}
    >
      <View style={styles.transactionRow}>
        <View
          style={[
            styles.iconTileSmall,
            { backgroundColor: `${categoryColor}22` },
          ]}
        >
          <MaterialCommunityIcons
            name={mcIconName(category?.icon, 'food')}
            size={17}
            color={categoryColor}
          />
        </View>

        <View style={styles.transactionCopy}>
          <Text variant="body" style={styles.transactionMerchant} numberOfLines={1}>
            {transaction.merchant}
          </Text>
          <Text variant="caption" color="secondary" style={styles.transactionMeta} numberOfLines={1}>
            {transaction.categoryName} · {transaction.location.neighborhood || transaction.location.address} · {transaction.date}
          </Text>
        </View>

        <Text variant="bodySmall" style={[styles.transactionAmount, { color: amountColor }]} numberOfLines={1}>
          {transaction.type === 'income' ? '+' : '-'}{formatCurrencyPrecise(transaction.amount, currency)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const DashboardContent = ({ data }: { data: AppData }) => {
  const navigation = useNavigation<any>();
  const colors = useColors();

  const month = getMonthKey();
  const budget = data.budgets.find((item) => item.month === month);
  const summary = calculateMonthlySummary(data.transactions, month);
  const breakdown = calculateCategoryBreakdown(data.transactions, data.categories, month);
  const health = calculateBudgetHealth(data.transactions, budget, data.categories, month);
  const savings = calculateSavingsProgress(data.savingsGoals);
  const recent = sortTransactions(data.transactions, 'date-desc').slice(0, 3);
  const topCategories = breakdown.slice(0, 3);
  const topCategory = topCategories[0];
  const budgetRemaining = Math.max(health.remaining, 0);
  const budgetStatus = getBudgetStatus(health.usedPercent);
  const currency = data.user.currency;

  const attentionItems: AttentionItem[] = [
    summary.expenses > summary.income
      ? {
          title: 'Cash flow is negative',
          detail: `Expenses are ${formatCurrency(summary.expenses - summary.income, currency)} above income this month.`,
          icon: 'trending-down',
          tone: 'danger',
        }
      : null,
    health.usedPercent >= 100
      ? {
          title: 'Budget is over limit',
          detail: `${formatCurrency(Math.max(Math.abs(health.remaining), 0), currency)} over the monthly budget.`,
          icon: 'warning',
          tone: 'danger',
        }
      : health.usedPercent >= 85
        ? {
            title: 'Budget pace needs watching',
            detail: `${health.usedPercent}% of the monthly budget is already used.`,
            icon: 'speed',
            tone: 'warning',
          }
        : null,
    topCategory
      ? {
          title: `${topCategory.categoryName} leads spending`,
          detail: `${topCategory.percentage}% of expenses are concentrated here.`,
          icon: 'category',
          tone: 'primary',
        }
      : null,
    savings.percentage > 0 && savings.percentage < 50
      ? {
          title: 'Savings goal is early-stage',
          detail: `${formatCurrency(savings.saved, currency)} saved so far across active goals.`,
          icon: 'savings',
          tone: 'success',
        }
      : null,
  ].filter(Boolean).slice(0, 3) as AttentionItem[];

  const resolvedAttentionItems: AttentionItem[] = attentionItems.length > 0
    ? attentionItems
    : [
        {
          title: 'No urgent issues',
          detail: 'The month looks stable based on the current transactions and budget.',
          icon: 'check-circle',
          tone: 'success',
        },
      ];

  const snapshotItems: SnapshotItem[] = [
    {
      label: 'Income',
      value: formatCurrency(summary.income, currency),
      detail: `${summary.transactionCount} tracked entries`,
      icon: 'trending-up',
      tone: 'success',
    },
    {
      label: 'Expenses',
      value: formatCurrency(summary.expenses, currency),
      detail: `${formatCurrency(summary.averageExpense, currency)} avg expense`,
      icon: 'trending-down',
      tone: 'danger',
    },
    {
      label: 'Budget left',
      value: formatCurrency(budgetRemaining, currency),
      detail: `${health.usedPercent}% used · ${budgetStatus.label}`,
      icon: 'speed',
      tone: budgetStatus.tone === 'danger' ? 'danger' : budgetStatus.tone === 'warning' ? 'warning' : 'primary',
    },
    {
      label: 'Savings',
      value: `${savings.percentage}%`,
      detail: `${formatCurrency(savings.saved, currency)} saved`,
      icon: 'savings',
      tone: 'success',
    },
  ];

  return (
    <AppScroll>
      <ScreenHeader
        title="Dashboard"
        subtitle={`${readableMonth(month)} command center for ${data.user.name}`}
        action={
          <IconButton
            icon="add"
            label="Add transaction"
            onPress={() => navigation.navigate('AddTransaction')}
          />
        }
      />

      <DashboardHero
        month={month}
        netCashFlow={summary.netCashFlow}
        budgetUsed={health.usedPercent}
        budgetRemaining={budgetRemaining}
        totalBudget={health.totalBudget}
        topCategoryName={topCategory?.categoryName}
        currency={currency}
      />

      <DashboardFocusPanel
        snapshotItems={snapshotItems}
        attentionItems={resolvedAttentionItems}
        categoryItems={topCategories}
        currency={currency}
      />

      <Card>
        <View style={styles.rowBetween}>
          <Text variant="h4" style={styles.recentTitle}>
            Recent transactions
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View all transactions"
            onPress={() => navigation.navigate('Transactions')}
            activeOpacity={0.82}
            style={styles.linkAction}
          >
            <Text
              variant="bodySmall"
              style={[styles.linkInline, { color: colors.primary }]}
            >
              View all
            </Text>
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
              currency={currency}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
            />
          ))
        )}
      </Card>
    </AppScroll>
  );
};

export const DashboardScreen = () => (
  <RequireData>
    {(data) => <DashboardContent data={data} />}
  </RequireData>
);

const styles = StyleSheet.create({
  dashboardHero: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroTitleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: Spacing.xs,
  },
  eyebrow: {
    letterSpacing: 0.1,
    marginBottom: Spacing.xs,
    fontWeight: Typography.label.fontWeight,
    includeFontPadding: false,
  },
  heroMainMetric: {
    marginTop: Spacing.xs,
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
  statusPill: {
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusPillText: {
    fontWeight: Typography.label.fontWeight,
    includeFontPadding: false,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.7,
  },
  heroBudgetRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  budgetTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  budgetLabel: {
    includeFontPadding: false,
  },
  budgetRemainingMetric: {
    marginTop: Spacing.xs,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  budgetPercentBlock: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    minWidth: 56,
    flexShrink: 0,
  },
  budgetPercentText: {
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  budgetUsedLabel: {
    marginTop: 2,
    fontWeight: '600',
    includeFontPadding: false,
  },
  heroInsightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  heroInsightText: {
    flex: 1,
    includeFontPadding: false,
  },
  focusCard: {
    marginBottom: Spacing.lg,
  },
  focusHeader: {
    marginBottom: Spacing.md,
  },
  focusTitle: {
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
  focusSubtitle: {
    marginTop: Spacing.xs,
    includeFontPadding: false,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  segmentButton: {
    flex: 1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minHeight: ControlSize.minimumTouchTarget,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontWeight: Typography.label.fontWeight,
    includeFontPadding: false,
  },
  focusPanelPageInner: {
    paddingBottom: Spacing.sm,
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 66,
    width: "100%",
    // paddingVertical: Spacing.md,
    justifyContent: "space-between"
  },
  snapshotIconAndLabel: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "50%",
  },
  snapshotCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  snapshotLabel: {
    letterSpacing: 0.1,
    fontWeight: Typography.label.fontWeight,
    includeFontPadding: false,
  },
  snapshotDetail: {
    marginTop: Spacing.xs,
    includeFontPadding: false,
  },
  snapshotValueBlock: {
    width: 112,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  snapshotValue: {
    width: '100%',
    textAlign: 'right',
    paddingRight: 10,
    includeFontPadding: false,
  },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 66,
  },
  attentionCopy: {
    flex: 1,
    minWidth: 0,
  },
  attentionTitle: {
    fontWeight: Typography.label.fontWeight,
    includeFontPadding: false,
  },
  attentionDetail: {
    marginTop: Spacing.xs,
    includeFontPadding: false,
  },
  focusIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  recentTitle: {
    includeFontPadding: false,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 64,
  },
  transactionCopy: {
    flex: 1,
    minWidth: 0,
  },
  transactionMerchant: {
    fontWeight: Typography.label.fontWeight,
    includeFontPadding: false,
  },
  transactionMeta: {
    marginTop: 2,
    includeFontPadding: false,
  },
  transactionAmount: {
    maxWidth: 104,
    textAlign: 'right',
    fontWeight: Typography.label.fontWeight,
    includeFontPadding: false,
    flexShrink: 0,
  },
  iconTileSmall: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  linkAction: {
    minHeight: ControlSize.minimumTouchTarget,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInline: {
    fontWeight: Typography.label.fontWeight,
    includeFontPadding: false,
  },
});

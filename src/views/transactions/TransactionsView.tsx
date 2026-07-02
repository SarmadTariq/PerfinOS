/**
 * TransactionsView - Activity feed with compact search, quick filters,
 * advanced filter panel, and clean transaction rows.
 */
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  EmptyState,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { Field } from '../../components/form/Field';
import { Segmented } from '../../components/form/Segmented';
import { RequireData } from '../../components/layout/RequireData';
import { useThemeScheme } from '../../context/ThemeContext';
import { AppData, Category, Transaction, TransactionSortKey } from '../../models/finance';
import {
  calculateMonthlySummary,
  filterTransactions,
  sortTransactions,
} from '../../repositories/AnalyticsRepository';
import { Colors, Radius, Spacing } from '../../theme';
import {
  formatCurrency,
  formatCurrencyPrecise,
  getMonthKey,
  readableMonth,
} from '../../utils/format';
import { mcIconName } from '../../utils/icons';
import { ScrollView, Switch } from 'react-native-gesture-handler';
import DateTimePicker, { DateType, useDefaultStyles } from 'react-native-ui-datepicker';
import { Value } from 'react-native/types_generated/Libraries/Animated/AnimatedExports';

type TransactionTypeFilter = 'all' | 'income' | 'expense';
type ReceiptFilter = 'any' | 'attached' | 'missing';

type FeedItem =
  | { type: 'date'; date: string }
  | { type: 'transaction'; transaction: Transaction };

const today = Date.now();

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

const formatDateLabel = (dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const buildFeedItems = (transactions: Transaction[]): FeedItem[] => {
  const items: FeedItem[] = [];
  let activeDate = '';

  transactions.forEach((transaction) => {
    if (transaction.date !== activeDate) {
      activeDate = transaction.date;
      items.push({ type: 'date', date: transaction.date });
    }

    items.push({ type: 'transaction', transaction });
  });

  return items;
};

const SummaryStrip = ({
  income,
  expenses,
  net,
  currency,
}: {
  income: number;
  expenses: number;
  net: number;
  currency: string;
}) => {
  const colors = useColors();

  return (
    <Card shadow="sm" style={styles.summaryCard}>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text variant="caption" color="secondary" style={styles.summaryLabel}>
            Income
          </Text>
          <Text variant="h4" style={{ color: colors.success }} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(income, currency)}
          </Text>
        </View>

        <View style={[styles.summaryItem, styles.summaryDivider, { borderColor: colors.border }]}>
          <Text variant="caption" color="secondary" style={styles.summaryLabel}>
            Spend
          </Text>
          <Text variant="h4" style={{ color: colors.danger }} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(expenses, currency)}
          </Text>
        </View>

        <View style={[styles.summaryItem, styles.summaryDivider, { borderColor: colors.border }]}>
          <Text variant="caption" color="secondary" style={styles.summaryLabel}>
            Net
          </Text>
          <Text variant="h4" numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(net, currency)}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const QuickFilters = ({
  value,
  onChange,
  advancedCount,
  onOpenFilters,
}: {
  value: TransactionTypeFilter;
  onChange: (value: TransactionTypeFilter) => void;
  advancedCount: number;
  onOpenFilters: () => void;
}) => {
  const colors = useColors();

  return (
    <View style={styles.quickFilterRow}>
      <View style={{ flex: 1 }}>
        <Segmented
          options={['all', 'income', 'expense']}
          value={value}
          onChange={(next) => onChange(next as TransactionTypeFilter)}
        />
      </View>

      <TouchableOpacity
        onPress={onOpenFilters}
        accessibilityRole="button"
        accessibilityLabel="Open filters"
        style={[styles.filterButton, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
      >
        <MaterialIcons name="tune" size={18} color={colors.primary} />
        <Text variant="caption" style={{ color: colors.primary, fontWeight: '800' }}>
          Filter
        </Text>

        {advancedCount > 0 ? (
          <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
            <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '800' }}>
              {advancedCount}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

const FilterPanel = ({
  visible,
  categories,
  sortKey,
  categoryId,
  receiptFilter,
  onSortChange,
  onCategoryChange,
  onReceiptFilterChange,
  onClear,
  onClose,
  dateStart,
  dateEnd,
  onSetDateStart,
  onSetDateEnd,
  enableDateRange,
  onSetEnableDateRange
}: {
  visible: boolean;
  categories: Category[];
  sortKey: TransactionSortKey;
  categoryId: string;
  receiptFilter: ReceiptFilter;
  onSortChange: (value: TransactionSortKey) => void;
  onCategoryChange: (value: string) => void;
  onReceiptFilterChange: (value: ReceiptFilter) => void;
  onClear: () => void;
  onClose: () => void;
  dateStart: DateType;
  dateEnd: DateType;
  onSetDateStart: (value: DateType) => void;
  onSetDateEnd: (value: DateType) => void;
  enableDateRange: boolean;
  onSetEnableDateRange: (value: boolean) => void;
}) => {
  const colors = useColors();
  const defaultStyles = useDefaultStyles();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView style={[styles.filterPanel, { backgroundColor: colors.card }]}>
          <View style={styles.rowBetween}>
            <View>
              <Text variant="h3">Filters</Text>
              <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
                Refine activity without cluttering the feed.
              </Text>
            </View>

            <IconButton icon="close" label="Close filters" onPress={onClose} />
          </View>

          <View style={styles.filterSection}>
            <Text variant="bodySmall" style={styles.filterSectionTitle}>
              Sort by
            </Text>
            <Segmented
              options={['date-desc', 'date-asc', 'amount-desc', 'amount-asc', 'merchant-asc']}
              value={sortKey}
              onChange={(value) => onSortChange(value as TransactionSortKey)}
            />
          </View>

          <View style={styles.filterSection}>
            <Text variant="bodySmall" style={styles.filterSectionTitle}>
              Category
            </Text>

            <View style={styles.chipWrap}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: categoryId === 'all' }}
                onPress={() => onCategoryChange('all')}
                style={[
                  styles.filterChip,
                  {
                    borderColor: categoryId === 'all' ? colors.primary : colors.border,
                    backgroundColor: categoryId === 'all' ? colors.primarySoft : colors.bgSecondary,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{
                    color: categoryId === 'all' ? colors.primary : colors.textSecondary,
                    fontWeight: '800',
                  }}
                >
                  All categories
                </Text>
              </TouchableOpacity>

              {categories.map((category) => {
                const selected = categoryId === category.id;

                return (
                  <TouchableOpacity
                    key={category.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onCategoryChange(category.id)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: selected ? category.color : colors.border,
                        backgroundColor: selected ? `${category.color}1F` : colors.bgSecondary,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: selected ? category.color : colors.textSecondary,
                        fontWeight: '800',
                      }}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text variant="bodySmall" style={styles.filterSectionTitle}>
              Receipts
            </Text>
            <Segmented
              options={['any', 'attached', 'missing']}
              value={receiptFilter}
              onChange={(value) => onReceiptFilterChange(value as ReceiptFilter)}
            />
          </View>

          <View style={styles.filterSection}>
            <Text variant="bodySmall" style={styles.filterSectionTitle}>
              Date range
            </Text>

            <View style={{flexDirection: 'row'}}>
              <Text>Enable Date Range</Text>
              <Switch value={enableDateRange} onValueChange={(value) => {onSetEnableDateRange(value as boolean)}}/>
            </View>

            {
              (() => {
                if (enableDateRange){
                  return (

                    <View>
                      <DateTimePicker
                        mode="range"
                        startDate={dateStart}
                        endDate={dateEnd}
                        onChange={({ startDate, endDate }) =>  {
                          onSetDateStart(startDate as DateType)
                          onSetDateEnd(endDate as DateType)
                        }}
                        styles={defaultStyles}
                        allowRangeReset={true}
                      />

                      <View>
                        <Text>{dateStart?.toDateString()} - {dateEnd?.toDateString()}</Text>
                      </View>
                    </View>
                  )
                }
                return null;
              })()
            }


            {/* <DateTimePicker
              mode="range"
              startDate={dateStart}
              endDate={dateEnd}
              onChange={({ startDate, endDate }) =>  {
                onSetDateStart(startDate as DateType)
                onSetDateEnd(endDate as DateType)
              }}
              styles={defaultStyles}
              allowRangeReset={true}
            /> */}
          </View>

          <View style={styles.modalActions}>
            <Button label="Clear all" variant="secondary" onPress={onClear} style={{ flex: 1 }} />
            <Button label="Apply" onPress={onClose} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const DateHeader = ({ date }: { date: string }) => {
  const colors = useColors();

  return (
    <View style={styles.dateHeader}>
      <Text variant="caption" color="secondary" style={[styles.dateHeaderText, { color: colors.textTertiary }]}>
        {formatDateLabel(date)}
      </Text>
    </View>
  );
};

const TransactionCard = ({
  transaction,
  categories,
  currency,
  onPress,
}: {
  transaction: Transaction;
  categories: Category[];
  currency: string;
  onPress: () => void;
}) => {
  const colors = useColors();
  const category = categories.find((item) => item.id === transaction.categoryId);
  const amountColor = transaction.type === 'income' ? colors.success : colors.danger;
  const receiptCount = transaction.receipts?.length || 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${transaction.merchant} transaction`}
      activeOpacity={0.76}
    >
      <Card shadow="sm" style={styles.transactionCard}>
        <View style={styles.transactionRow}>
          <View style={[styles.iconTile, { backgroundColor: `${category?.color || colors.primary}1F` }]}>
            <MaterialCommunityIcons
              name={mcIconName(category?.icon, transaction.type === 'income' ? 'cash-plus' : 'receipt')}
              size={20}
              color={category?.color || colors.primary}
            />
          </View>

          <View style={styles.transactionCopy}>
            <View style={styles.transactionTitleRow}>
              <Text variant="body" style={{ fontWeight: '800', flex: 1 }} numberOfLines={1}>
                {transaction.merchant}
              </Text>

              {receiptCount > 0 ? (
                <View style={[styles.receiptPill, { backgroundColor: colors.primarySoft }]}>
                  <MaterialIcons name="receipt-long" size={13} color={colors.primary} />
                  <Text variant="caption" style={{ color: colors.primary, fontWeight: '800' }}>
                    {receiptCount}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text variant="caption" color="secondary" numberOfLines={1} style={{ marginTop: Spacing.xs }}>
              {transaction.categoryName} · {transaction.paymentMethod} · {transaction.location.neighborhood || transaction.location.name || transaction.location.address}
            </Text>
          </View>

          <View style={styles.amountBlock}>
            <Text style={{ color: amountColor, fontWeight: '900' }} numberOfLines={1}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrencyPrecise(transaction.amount, currency)}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textTertiary} style={{ marginTop: Spacing.xs }} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const TransactionsContent = ({ data }: { data: AppData }) => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const month = getMonthKey();
  const summary = calculateMonthlySummary(data.transactions, month);

  const [query, setQuery] = useState('');
  const [type, setType] = useState<TransactionTypeFilter>('all');
  const [sortKey, setSortKey] = useState<TransactionSortKey>('date-desc');
  const [categoryId, setCategoryId] = useState('all');
  const [receiptFilter, setReceiptFilter] = useState<ReceiptFilter>('any');
  const [showFilters, setShowFilters] = useState(false);
  const [enableDateRange, setEnableDateRange] = useState<boolean>(false);
  const [dateStart, setDateStart] = useState<DateType>(today);
  const [dateEnd, setDateEnd] = useState<DateType>(today);


  const categoriesForFilter = useMemo(() => {
    if (type === 'all') {
      return data.categories;
    }

    return data.categories.filter((category) => category.type === type);
  }, [data.categories, type]);

  const visibleTransactions = useMemo(() => {
    const filtered = filterTransactions(data.transactions, {
      query,
      type,
      categoryId: categoryId === 'all' ? undefined : categoryId,
      month,
    }).filter((transaction) => {
      const hasReceipt = (transaction.receipts?.length || 0) > 0;

      if (receiptFilter === 'attached') {
        return hasReceipt;
      }

      if (receiptFilter === 'missing') {
        return !hasReceipt;
      }

      return true;
    });

    return sortTransactions(filtered, sortKey);
  }, [categoryId, data.transactions, month, query, receiptFilter, sortKey, type]);

  const feedItems = useMemo(() => buildFeedItems(visibleTransactions), [visibleTransactions]);

  const advancedFilterCount =
    (sortKey !== 'date-desc' ? 1 : 0) +
    (categoryId !== 'all' ? 1 : 0) +
    (receiptFilter !== 'any' ? 1 : 0);

  const clearFilters = () => {
    setSortKey('date-desc');
    setCategoryId('all');
    setReceiptFilter('any');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <FlatList
        data={feedItems}
        keyExtractor={(item, index) => (item.type === 'date' ? `date-${item.date}` : `transaction-${item.transaction.id}-${index}`)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <ScreenHeader
              title="Activity"
              subtitle={`${readableMonth(month)} transaction feed`}
              action={<IconButton icon="add" label="Add transaction" onPress={() => navigation.navigate('AddTransaction')} />}
            />

            <SummaryStrip
              income={summary.income}
              expenses={summary.expenses}
              net={summary.netCashFlow}
              currency={data.user.currency}
            />

            <Card shadow="sm" style={styles.searchCard}>
              <Field
                label="Search transactions"
                value={query}
                onChangeText={setQuery}
                placeholder="Merchant, note, category, or payment method"
              />

              <QuickFilters
                value={type}
                onChange={(value) => {
                  setType(value);
                  setCategoryId('all');
                }}
                advancedCount={advancedFilterCount}
                onOpenFilters={() => setShowFilters(true)}
              />

              <View style={styles.resultLine}>
                <Text variant="caption" color="tertiary">
                  {visibleTransactions.length} result{visibleTransactions.length === 1 ? '' : 's'}
                </Text>

                {query || type !== 'all' || advancedFilterCount > 0 ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Reset all activity filters"
                    onPress={() => {
                      setQuery('');
                      setType('all');
                      clearFilters();
                    }}
                  >
                    <Text variant="caption" style={{ color: colors.primary, fontWeight: '800' }}>
                      Reset
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Card>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title="No matching transactions"
            message="Try a different search or filter, or add a new transaction."
            actionLabel="Add Transaction"
            onAction={() => navigation.navigate('AddTransaction')}
          />
        }
        renderItem={({ item }) => {
          if (item.type === 'date') {
            return <DateHeader date={item.date} />;
          }

          return (
            <TransactionCard
              transaction={item.transaction}
              categories={data.categories}
              currency={data.user.currency}
              onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.transaction.id })}
            />
          );
        }}
        ListFooterComponent={<View style={{ height: Spacing.xxxl }} />}
      />

      <FilterPanel
        visible={showFilters}
        categories={categoriesForFilter}
        sortKey={sortKey}
        categoryId={categoryId}
        receiptFilter={receiptFilter}
        onSortChange={setSortKey}
        onCategoryChange={setCategoryId}
        onReceiptFilterChange={setReceiptFilter}
        onClear={clearFilters}
        onClose={() => setShowFilters(false)}
        dateStart={dateStart}
        dateEnd={dateEnd}
        onSetDateStart={setDateStart}
        onSetDateEnd={setDateEnd}
        enableDateRange={enableDateRange}
        onSetEnableDateRange={setEnableDateRange}
      />
    </SafeAreaView>
  );
};

export const TransactionsScreen = () => (
  <RequireData>
    {(data) => <TransactionsContent data={data} />}
  </RequireData>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 140,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryItem: {
    flex: 1,
    gap: Spacing.xs,
  },
  summaryDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.md,
    marginLeft: Spacing.md,
  },
  summaryLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    fontWeight: '800',
  },
  searchCard: {
    marginBottom: Spacing.md,
  },
  quickFilterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  filterButton: {
    minHeight: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  resultLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -Spacing.xs,
  },
  dateHeader: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  dateHeaderText: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '800',
  },
  transactionCard: {
    marginBottom: Spacing.sm,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 66,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionCopy: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  receiptPill: {
    minHeight: 24,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  amountBlock: {
    alignItems: 'flex-end',
    maxWidth: 116,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  filterPanel: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    maxHeight: '86%',
  },
  filterSection: {
    marginTop: Spacing.lg,
  },
  filterSectionTitle: {
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
});
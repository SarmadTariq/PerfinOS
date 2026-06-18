/**
 * TransactionsView — searchable, filterable, sortable transaction list with FlatList layout.
 * Includes TransactionRow inline component.
 */
import React, { useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  ConfirmModal,
  EmptyState,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { Field } from '../../components/form/Field';
import { Segmented } from '../../components/form/Segmented';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { useThemeScheme } from '../../context/ThemeContext';
import { Category, Transaction, TransactionSortKey } from '../../models/finance';
import { filterTransactions, sortTransactions } from '../../repositories/AnalyticsRepository';
import { Colors, Radius, Spacing } from '../../theme';
import { formatCurrencyPrecise } from '../../utils/format';
import { mcIconName } from '../../utils/icons';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
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

export const TransactionsScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const { deleteTransaction } = useFinance();
      const colors = useColors();
      const [query, setQuery] = useState('');
      const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
      const [sortKey, setSortKey] = useState<TransactionSortKey>('date-desc');
      const [showSort, setShowSort] = useState(false);
      const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
      const visible = sortTransactions(filterTransactions(data.transactions, { query, type }), sortKey);

      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
          <FlatList
            data={visible}
            keyExtractor={(transaction) => transaction.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                <ScreenHeader title="Transactions" subtitle="Create, search, filter, sort, edit, and delete cash activity." action={<IconButton icon="add" label="Add transaction" onPress={() => navigation.navigate('AddTransaction')} />} />
                <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
                  <Field label="Search" value={query} onChangeText={setQuery} placeholder="Merchant, note, category, payment method" />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Segmented options={['all', 'income', 'expense']} value={type} onChange={(value) => setType(value as 'all' | 'income' | 'expense')} />
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowSort((v) => !v)}
                      accessibilityRole="button"
                      accessibilityLabel="Sort options"
                      style={[styles.sortIconBtn, { backgroundColor: showSort ? colors.primarySoft : colors.bgSecondary, borderColor: showSort ? colors.primary : colors.border }]}
                    >
                      <MaterialIcons name="sort" size={20} color={showSort ? colors.primary : colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {showSort ? (
                    <Segmented options={['date-desc', 'amount-desc', 'amount-asc', 'merchant-asc']} value={sortKey} onChange={(value) => setSortKey(value as TransactionSortKey)} />
                  ) : null}
                </Card>
              </>
            }
            ListEmptyComponent={
              <EmptyState title="No matching transactions" message="Try a different search or add a new transaction." actionLabel="Add Transaction" onAction={() => navigation.navigate('AddTransaction')} />
            }
            renderItem={({ item: transaction }) => (
              <Card key={transaction.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
                <TransactionRow
                  transaction={transaction}
                  categories={data.categories}
                  onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
                />
                <View style={styles.cardActions}>
                  <Button
                    label={transaction.updateCount >= 2 ? 'Edit Limit Reached' : 'Edit'}
                    variant="secondary"
                    disabled={transaction.updateCount >= 2}
                    onPress={() => navigation.navigate('EditTransaction', { transactionId: transaction.id })}
                    style={{ flex: 1 }}
                  />
                  <Button label="Delete" variant="danger" onPress={() => setPendingDelete(transaction)} style={{ flex: 1 }} />
                </View>
              </Card>
            )}
            ListFooterComponent={
              <View style={{ height: Spacing.xxxl }}>
          <ConfirmModal
            visible={!!pendingDelete}
            title="Delete transaction?"
            message={`This removes ${pendingDelete?.merchant || 'this transaction'} from this workspace.`}
            confirmLabel="Delete"
            onCancel={() => setPendingDelete(null)}
            onConfirm={async () => {
              if (pendingDelete) await deleteTransaction(pendingDelete.id);
              setPendingDelete(null);
            }}
          />
              </View>
            }
          />
        </SafeAreaView>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  listContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 140,
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
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  sortIconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

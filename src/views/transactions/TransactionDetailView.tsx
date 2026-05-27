/**
 * TransactionDetailView — full expense breakdown with map preview and delete flow.
 * Extracted from PerFinOSScreens.tsx (ExpenseDetailScreen).
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  CategoryBadge,
  ChartCard,
  ConfirmModal,
  EmptyState,
  IconButton,
  MetricGrid,
  ScreenHeader,
  StatCard,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { MapCanvas } from '../../components/map/MapCanvas';
import { useFinance } from '../../context/FinanceContext';
import { Colors, Spacing } from '../../theme';
import { formatCurrencyPrecise } from '../../utils/format';

export const ExpenseDetailScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const route = useRoute<RouteProp<Record<string, { transactionId?: string }>, string>>();
      const { deleteTransaction } = useFinance();
      const [confirmDelete, setConfirmDelete] = useState(false);
      const transaction = data.transactions.find((item) => item.id === route.params?.transactionId);
      const category = data.categories.find((item) => item.id === transaction?.categoryId);

      if (!transaction) {
        return (
          <AppScroll>
            <EmptyState title="Transaction not found" message="This transaction may have been deleted." actionLabel="Back to Activity" onAction={() => navigation.navigate('Transactions')} />
          </AppScroll>
        );
      }

      return (
        <AppScroll>
          <ScreenHeader
            title="Expense Detail"
            subtitle="Full breakdown with map context and history guard."
            action={<IconButton icon="map" label="Open map" onPress={() => navigation.navigate('MainTabs', { screen: 'Map' })} />}
          />
          <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
            <View style={styles.rowBetween}>
              <CategoryBadge label={transaction.categoryName} icon={category?.icon} color={category?.color || Colors.light.primary} />
              <Text variant="h2" style={{ color: transaction.type === 'income' ? Colors.light.success : Colors.light.danger }}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrencyPrecise(transaction.amount, data.user.currency)}
              </Text>
            </View>
            <Text variant="h3" style={{ marginTop: Spacing.lg }}>{transaction.merchant}</Text>
            <Text variant="body" color="secondary" style={{ marginTop: Spacing.xs }}>{transaction.notes || 'No description provided.'}</Text>
            <MetricGrid>
              <StatCard label="Date" value={transaction.date} icon="event" helper={transaction.paymentMethod} />
              <StatCard label="Location" value={transaction.location.neighborhood || 'Mapped'} icon="place" helper={transaction.location.address} />
              <StatCard label="Edits" value={`${transaction.updateCount}/2`} icon="edit" tone={transaction.updateCount >= 2 ? 'warning' : 'primary'} helper="Maximum edits allowed" />
            </MetricGrid>
          </Card>
          <ChartCard title="Map Preview" summary={`${transaction.location.latitude.toFixed(4)}, ${transaction.location.longitude.toFixed(4)}`}>
            <MapCanvas
              transactions={[transaction]}
              categories={data.categories}
              selectedId={transaction.id}
              onSelect={() => undefined}
              mode="pins"
              currency={data.user.currency}
            />
          </ChartCard>
          <View style={styles.cardActions}>
            <Button
              label={transaction.updateCount >= 2 ? 'Edit Limit Reached' : 'Edit Expense'}
              disabled={transaction.updateCount >= 2}
              variant="secondary"
              onPress={() => navigation.navigate('EditTransaction', { transactionId: transaction.id })}
              style={{ flex: 1 }}
            />
            <Button label="Delete" variant="danger" onPress={() => setConfirmDelete(true)} style={{ flex: 1 }} />
          </View>
          <ConfirmModal
            visible={confirmDelete}
            title="Delete expense?"
            message={`This removes ${transaction.merchant} from PerFin OS.`}
            confirmLabel="Delete"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={async () => {
              await deleteTransaction(transaction.id);
              setConfirmDelete(false);
              navigation.navigate('Transactions');
            }}
          />
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

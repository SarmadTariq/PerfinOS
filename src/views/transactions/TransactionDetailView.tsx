/**
 * TransactionDetailView - receipt-style transaction record with receipt visibility,
 * map context, edit history, and guarded delete flow.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  CategoryBadge,
  ConfirmModal,
  EmptyState,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { MapCanvas } from '../../components/map/MapCanvas';
import { useFinance } from '../../context/FinanceContext';
import { useThemeScheme } from '../../context/ThemeContext';
import { AppData, ReceiptAttachment, Transaction } from '../../models/finance';
import { Colors, Radius, Spacing } from '../../theme';
import { formatCurrencyPrecise } from '../../utils/format';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 'Unknown size';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getReceiptTone = (status: ReceiptAttachment['status'], colors: ReturnType<typeof useColors>) => {
  if (status === 'uploaded') {
    return colors.success;
  }

  if (status === 'error') {
    return colors.danger;
  }

  if (status === 'uploading') {
    return colors.warning;
  }

  return colors.primary;
};

const DetailRow = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}) => {
  const colors = useColors();

  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.detailIcon, { backgroundColor: colors.primarySoft }]}>
        <MaterialIcons name={icon} size={18} color={colors.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="caption" color="tertiary" style={styles.detailLabel}>
          {label}
        </Text>
        <Text variant="body" style={{ fontWeight: '700', marginTop: Spacing.xs }}>
          {value || 'Not provided'}
        </Text>
      </View>
    </View>
  );
};

const ReceiptRow = ({ receipt }: { receipt: ReceiptAttachment }) => {
  const colors = useColors();
  const tone = getReceiptTone(receipt.status, colors);

  return (
    <View style={[styles.receiptRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.receiptIcon, { backgroundColor: `${tone}1F` }]}>
        <MaterialIcons name="receipt-long" size={18} color={tone} />
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="body" style={{ fontWeight: '800' }} numberOfLines={1}>
          {receipt.fileName || 'Receipt image'}
        </Text>

        <Text variant="caption" color="secondary" style={{ marginTop: Spacing.xs }}>
          {receipt.status} · {formatBytes(receipt.sizeBytes)}
        </Text>

        {receipt.error ? (
          <Text variant="caption" color="danger" style={{ marginTop: Spacing.xs }}>
            {receipt.error}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const ReceiptsSection = ({
  transaction,
  canEdit,
  onManageReceipts,
}: {
  transaction: Transaction;
  canEdit: boolean;
  onManageReceipts: () => void;
}) => {
  const colors = useColors();
  const receipts = transaction.receipts || [];

  return (
    <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
      <View style={styles.rowBetween}>
        <View>
          <Text variant="h4">Receipts</Text>
          <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
            Stored proof attached to this transaction.
          </Text>
        </View>

        <View style={[styles.countPill, { backgroundColor: colors.primarySoft }]}>
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '800' }}>
            {receipts.length}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: Spacing.md }}>
        {receipts.length === 0 ? (
          <View style={[styles.emptyReceiptBox, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
            <MaterialIcons name="receipt-long" size={24} color={colors.textTertiary} />
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '800' }}>
                No receipt attached
              </Text>
              <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
                Add a receipt from Edit Transaction to keep proof with this record.
              </Text>
            </View>
          </View>
        ) : (
          receipts.map((receipt) => <ReceiptRow key={receipt.id} receipt={receipt} />)
        )}
      </View>

      <Button
        label={canEdit ? 'Manage Receipts' : 'Edit Limit Reached'}
        variant="secondary"
        disabled={!canEdit}
        onPress={onManageReceipts}
        style={{ marginTop: Spacing.md }}
      />
    </Card>
  );
};

const TransactionHero = ({
  transaction,
  categoryColor,
  categoryIcon,
  currency,
}: {
  transaction: Transaction;
  categoryColor: string;
  categoryIcon?: string;
  currency: string;
}) => {
  const colors = useColors();
  const amountColor = transaction.type === 'income' ? colors.success : colors.danger;

  return (
    <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
      <View style={styles.rowBetween}>
        <CategoryBadge
          label={transaction.categoryName}
          icon={categoryIcon}
          color={categoryColor}
        />

        <View style={[styles.typePill, { backgroundColor: `${amountColor}1F` }]}>
          <Text variant="caption" style={{ color: amountColor, fontWeight: '800', textTransform: 'capitalize' }}>
            {transaction.type}
          </Text>
        </View>
      </View>

      <Text variant="h1" style={{ color: amountColor, marginTop: Spacing.lg }} numberOfLines={1} adjustsFontSizeToFit>
        {transaction.type === 'income' ? '+' : '-'}{formatCurrencyPrecise(transaction.amount, currency)}
      </Text>

      <Text variant="h3" style={{ marginTop: Spacing.md }}>
        {transaction.merchant}
      </Text>

      <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
        {transaction.notes || 'No notes added.'}
      </Text>
    </Card>
  );
};

const TransactionDetailContent = ({ data }: { data: AppData }) => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, { transactionId?: string }>, string>>();
  const colors = useColors();
  const { deleteTransaction } = useFinance();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const transaction = data.transactions.find((item) => item.id === route.params?.transactionId);
  const category = data.categories.find((item) => item.id === transaction?.categoryId);

  if (!transaction) {
    return (
      <AppScroll>
        <EmptyState
          title="Transaction not found"
          message="This transaction may have been deleted."
          actionLabel="Back to Activity"
          onAction={() => navigation.navigate('MainTabs', { screen: 'Transactions' })}
        />
      </AppScroll>
    );
  }

  const canEdit = transaction.updateCount < 2;
  const locationLabel =
    transaction.location.name ||
    transaction.location.neighborhood ||
    transaction.location.address ||
    'Mapped location';

  return (
    <AppScroll>
      <ScreenHeader
        title="Transaction"
        subtitle="Receipt, location, and edit history."
        action={
          <View style={styles.headerActions}>
            <IconButton
              icon="arrow-back"
              label="Go back"
              onPress={() => navigation.goBack()}
            />
            <IconButton
              icon="edit"
              label="Edit transaction"
              onPress={() => navigation.navigate('EditTransaction', { transactionId: transaction.id })}
            />
          </View>
        }
      />

      <TransactionHero
        transaction={transaction}
        categoryColor={category?.color || colors.primary}
        categoryIcon={category?.icon}
        currency={data.user.currency}
      />

      <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
        <Text variant="h4">Details</Text>

        <View style={{ marginTop: Spacing.sm }}>
          <DetailRow label="Date" value={transaction.date} icon="event" />
          <DetailRow label="Payment method" value={transaction.paymentMethod} icon="credit-card" />
          <DetailRow label="Location" value={locationLabel} icon="place" />
          <DetailRow label="Address" value={transaction.location.formattedAddress || transaction.location.address} icon="location-on" />
          <DetailRow label="Recurring" value={transaction.isRecurring ? 'Yes' : 'No'} icon="repeat" />
        </View>
      </Card>

      <ReceiptsSection
        transaction={transaction}
        canEdit={canEdit}
        onManageReceipts={() => navigation.navigate('EditTransaction', { transactionId: transaction.id })}
      />

      <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
        <View style={styles.rowBetween}>
          <View>
            <Text variant="h4">Map Preview</Text>
            <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
              {transaction.location.latitude.toFixed(4)}, {transaction.location.longitude.toFixed(4)}
            </Text>
          </View>

          <IconButton
            icon="map"
            label="Open map"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Map' })}
          />
        </View>

        <MapCanvas
          transactions={[transaction]}
          categories={data.categories}
          selectedId={transaction.id}
          onSelect={() => undefined}
          mode="pins"
          currency={data.user.currency}
          style={styles.mapPreview}
        />
      </Card>

      <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
        <Text variant="h4">Record History</Text>

        <View style={[styles.historyBox, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          <View style={[styles.detailIcon, { backgroundColor: colors.primarySoft }]}>
            <MaterialIcons name="edit-note" size={20} color={colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontWeight: '800' }}>
              {transaction.updateCount}/2 edits used
            </Text>
            <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
              Transaction edits are limited to preserve record reliability.
            </Text>
          </View>
        </View>
      </Card>

      <Card shadow="sm">
        <Text variant="h4">Danger Zone</Text>
        <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
          Delete this transaction only if it was added by mistake.
        </Text>

        <Button
          label="Delete Transaction"
          variant="danger"
          onPress={() => setConfirmDelete(true)}
          style={{ marginTop: Spacing.md }}
        />
      </Card>

      <ConfirmModal
        visible={confirmDelete}
        title="Delete transaction?"
        message={`This removes ${transaction.merchant} from this workspace.`}
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteTransaction(transaction.id);
          setConfirmDelete(false);
          navigation.navigate('MainTabs', { screen: 'Transactions' });
        }}
      />
    </AppScroll>
  );
};

export const ExpenseDetailScreen = () => (
  <RequireData>
    {(data) => <TransactionDetailContent data={data} />}
  </RequireData>
);

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  typePill: {
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    fontWeight: '800',
  },
  countPill: {
    minWidth: 34,
    height: 30,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  emptyReceiptBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  receiptIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPreview: {
    height: 220,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  historyBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
});
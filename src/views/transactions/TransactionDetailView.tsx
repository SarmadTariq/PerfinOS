/**
 * TransactionDetailView - calm financial record with payment,
 * place, receipt, history, edit, and delete actions.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  Card,
  Text,
} from '../../components/base';
import {
  ConfirmModal,
  EmptyState,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { useColors } from '../../context/ThemeContext';
import {
  AppData,
  ReceiptAttachment,
  Transaction,
} from '../../models/finance';
import {
  ControlSize,
  Radius,
  Spacing,
  Typography,
} from '../../theme';
import { formatCurrencyPrecise } from '../../utils/format';

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 'Unknown size';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-CA', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const formatTimestamp = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const formatReceiptStatus = (
  status: ReceiptAttachment['status']
) =>
  `${status.charAt(0).toUpperCase()}${status.slice(1)}`;

const getReceiptTone = (
  status: ReceiptAttachment['status'],
  colors: ReturnType<typeof useColors>
) => {
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
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) => {
  const colors = useColors();

  return (
    <View
      style={[
        styles.detailRow,
        {
          borderBottomColor: colors.border,
        },
        last ? styles.detailRowLast : null,
      ]}
    >
      <Text
        variant="bodySmall"
        color="secondary"
        style={styles.detailLabel}
      >
        {label}
      </Text>

      <Text
        variant="body"
        numberOfLines={2}
        style={styles.detailValue}
      >
        {value}
      </Text>
    </View>
  );
};

const ReceiptRow = ({
  receipt,
  last,
}: {
  receipt: ReceiptAttachment;
  last: boolean;
}) => {
  const colors = useColors();
  const tone = getReceiptTone(
    receipt.status,
    colors
  );

  return (
    <View
      style={[
        styles.receiptRow,
        {
          borderBottomColor: colors.border,
        },
        last ? styles.detailRowLast : null,
      ]}
    >
      <View
        style={[
          styles.receiptIcon,
          {
            backgroundColor: `${tone}1F`,
          },
        ]}
      >
        <MaterialIcons
          name="receipt-long"
          size={18}
          color={tone}
        />
      </View>

      <View style={styles.receiptCopy}>
        <Text
          variant="body"
          numberOfLines={1}
          style={styles.receiptTitle}
        >
          {receipt.fileName || 'Receipt image'}
        </Text>

        <Text
          variant="caption"
          color="secondary"
          style={styles.receiptMeta}
        >
          {formatReceiptStatus(receipt.status)}
          {' · '}
          {formatBytes(receipt.sizeBytes)}
        </Text>

        {receipt.error ? (
          <Text
            variant="caption"
            color="danger"
            style={styles.receiptMeta}
          >
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
    <Card style={styles.sectionCard}>
      <View style={styles.rowBetween}>
        <View style={styles.sectionCopy}>
          <Text variant="h4">Receipts</Text>

          <Text
            variant="bodySmall"
            color="secondary"
            style={styles.sectionSubheading}
          >
            {receipts.length === 0
              ? 'No proof is attached to this record.'
              : `${receipts.length} ${
                  receipts.length === 1
                    ? 'receipt'
                    : 'receipts'
                } attached`}
          </Text>
        </View>

        {canEdit ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Manage transaction receipts"
            activeOpacity={0.76}
            onPress={onManageReceipts}
            style={styles.linkAction}
          >
            <Text
              variant="bodySmall"
              style={[
                styles.linkActionLabel,
                { color: colors.primary },
              ]}
            >
              Manage
            </Text>

            <MaterialIcons
              name="chevron-right"
              size={19}
              color={colors.primary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {receipts.length === 0 ? (
        <View
          style={[
            styles.emptyReceiptRow,
            {
              borderColor: colors.border,
              backgroundColor:
                colors.bgSecondary,
            },
          ]}
        >
          <MaterialIcons
            name="receipt-long"
            size={20}
            color={colors.textTertiary}
          />

          <Text
            variant="bodySmall"
            color="secondary"
            style={styles.sectionCopy}
          >
            Add a receipt through Edit Transaction when proof is useful.
          </Text>
        </View>
      ) : (
        <View style={styles.receiptList}>
          {receipts.map((receipt, index) => (
            <ReceiptRow
              key={receipt.id}
              receipt={receipt}
              last={
                index === receipts.length - 1
              }
            />
          ))}
        </View>
      )}
    </Card>
  );
};

const TransactionHero = ({
  transaction,
  categoryColor,
  currency,
}: {
  transaction: Transaction;
  categoryColor: string;
  currency: string;
}) => {
  const colors = useColors();
  const amountColor =
    transaction.type === 'income'
      ? colors.success
      : colors.danger;

  return (
    <Card style={styles.heroCard}>
      <Text
        variant="caption"
        color="secondary"
        style={styles.heroEyebrow}
      >
        FINANCIAL RECORD
      </Text>

      <Text
        variant="h2"
        style={styles.heroMerchant}
      >
        {transaction.merchant}
      </Text>

      <Text
        variant="h1"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.heroAmount,
          { color: amountColor },
        ]}
      >
        {transaction.type === 'income'
          ? '+'
          : '-'}
        {formatCurrencyPrecise(
          transaction.amount,
          currency
        )}
      </Text>

      <View style={styles.heroMetaRow}>
        <View
          style={[
            styles.heroMetaDot,
            {
              backgroundColor: categoryColor,
            },
          ]}
        />

        <Text
          variant="bodySmall"
          color="secondary"
          style={styles.heroMetaText}
        >
          {[
            transaction.categoryName,
            formatDate(transaction.date),
            transaction.paymentMethod,
          ].join(' · ')}
        </Text>
      </View>

      {transaction.notes.trim() ? (
        <>
          <View
            style={[
              styles.heroDivider,
              {
                backgroundColor:
                  colors.border,
              },
            ]}
          />

          <Text
            variant="caption"
            color="secondary"
            style={styles.heroNotesLabel}
          >
            Notes
          </Text>

          <Text
            variant="body"
            style={styles.heroNotes}
          >
            {transaction.notes}
          </Text>
        </>
      ) : null}
    </Card>
  );
};

const TransactionDetailContent = ({
  data,
}: {
  data: AppData;
}) => {
  const navigation = useNavigation<any>();
  const route =
    useRoute<
      RouteProp<
        Record<
          string,
          { transactionId?: string }
        >,
        string
      >
    >();
  const colors = useColors();
  const { deleteTransaction } = useFinance();
  const [
    confirmDelete,
    setConfirmDelete,
  ] = useState(false);

  const transaction = data.transactions.find(
    (item) =>
      item.id ===
      route.params?.transactionId
  );

  const category = data.categories.find(
    (item) =>
      item.id === transaction?.categoryId
  );

  if (!transaction) {
    return (
      <AppScroll>
        <EmptyState
          title="Transaction not found"
          message="This transaction may have been deleted."
          actionLabel="Back to Activity"
          onAction={() =>
            navigation.navigate('MainTabs', {
              screen: 'Transactions',
            })
          }
        />
      </AppScroll>
    );
  }

  const canEdit =
    transaction.updateCount < 2;
  const remainingEdits = Math.max(
    0,
    2 - transaction.updateCount
  );

  const location = transaction.location;
  const normalizedLocationName =
    location.name.trim().toLowerCase();

  const hasPlace =
    normalizedLocationName !== 'no place' &&
    Boolean(
      location.name ||
        location.neighborhood ||
        location.formattedAddress ||
        location.address
    );

  const hasCoordinates =
    hasPlace &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    !(
      location.latitude === 0 &&
      location.longitude === 0
    );

  const placeName =
    location.neighborhood ||
    location.name;

  const placeAddress =
    location.formattedAddress ||
    location.address;

  return (
    <AppScroll>
      <View style={styles.leadingHeader}>
        <IconButton
          icon="arrow-back"
          label="Return to previous screen"
          onPress={() => navigation.goBack()}
        />

        <Text
          variant="bodySmall"
          color="secondary"
        >
          Back
        </Text>
      </View>

      <ScreenHeader
        title="Transaction details"
        subtitle={transaction.merchant}
        action={
          canEdit ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Edit transaction"
              activeOpacity={0.76}
              onPress={() =>
                navigation.navigate(
                  'EditTransaction',
                  {
                    transactionId:
                      transaction.id,
                  }
                )
              }
              style={[
                styles.editAction,
                {
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.bgSecondary,
                },
              ]}
            >
              <MaterialIcons
                name="edit"
                size={17}
                color={colors.primary}
              />

              <Text
                variant="bodySmall"
                style={[
                  styles.editActionLabel,
                  {
                    color: colors.primary,
                  },
                ]}
              >
                Edit
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <TransactionHero
        transaction={transaction}
        categoryColor={
          category?.color || colors.primary
        }
        currency={data.user.currency}
      />

      <Card style={styles.sectionCard}>
        <Text variant="h4">
          Payment details
        </Text>

        <View style={styles.detailList}>
          <DetailRow
            label="Date"
            value={formatDate(
              transaction.date
            )}
          />

          <DetailRow
            label="Category"
            value={
              transaction.categoryName ||
              'Uncategorized'
            }
          />

          <DetailRow
            label="Payment method"
            value={
              transaction.paymentMethod ||
              'Not provided'
            }
            last={!transaction.isRecurring}
          />

          {transaction.isRecurring ? (
            <DetailRow
              label="Recurring"
              value="Repeats regularly"
              last
            />
          ) : null}
        </View>
      </Card>

      {hasPlace ? (
        <Card style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <View style={styles.sectionCopy}>
              <Text variant="h4">
                Place
              </Text>

              <Text
                variant="body"
                style={styles.placeName}
              >
                {placeName}
              </Text>

              {placeAddress &&
              placeAddress !== placeName ? (
                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.placeAddress}
                >
                  {placeAddress}
                </Text>
              ) : null}
            </View>

            {hasCoordinates ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="View transaction place on map"
                activeOpacity={0.76}
                onPress={() =>
                  navigation.navigate(
                    'MainTabs',
                    { screen: 'Map' }
                  )
                }
                style={styles.linkAction}
              >
                <Text
                  variant="bodySmall"
                  style={[
                    styles.linkActionLabel,
                    {
                      color:
                        colors.primary,
                    },
                  ]}
                >
                  View on Map
                </Text>

                <MaterialIcons
                  name="chevron-right"
                  size={19}
                  color={colors.primary}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>
      ) : null}

      <ReceiptsSection
        transaction={transaction}
        canEdit={canEdit}
        onManageReceipts={() =>
          navigation.navigate(
            'EditTransaction',
            {
              transactionId:
                transaction.id,
            }
          )
        }
      />

      <Card style={styles.sectionCard}>
        <Text variant="h4">
          Record information
        </Text>

        <View style={styles.detailList}>
          <DetailRow
            label="Created"
            value={formatTimestamp(
              transaction.createdAt
            )}
          />

          <DetailRow
            label="Last updated"
            value={formatTimestamp(
              transaction.updatedAt
            )}
          />

          <DetailRow
            label="Edit allowance"
            value={
              remainingEdits === 0
                ? 'No edits remaining'
                : `${remainingEdits} ${
                    remainingEdits === 1
                      ? 'edit'
                      : 'edits'
                  } remaining`
            }
            last
          />
        </View>

        <Text
          variant="caption"
          color="tertiary"
          style={styles.recordNote}
        >
          Edit limits help preserve the reliability of this financial record.
        </Text>
      </Card>

      <Card style={styles.sectionCard}>
        <Text variant="h4">
          More actions
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Delete transaction"
          accessibilityHint="Opens a confirmation before deleting"
          activeOpacity={0.76}
          onPress={() =>
            setConfirmDelete(true)
          }
          style={[
            styles.deleteAction,
            {
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.deleteIcon,
              {
                backgroundColor:
                  `${colors.danger}1F`,
              },
            ]}
          >
            <MaterialIcons
              name="delete-outline"
              size={20}
              color={colors.danger}
            />
          </View>

          <View style={styles.deleteCopy}>
            <Text
              variant="body"
              style={styles.deleteTitle}
            >
              Delete transaction
            </Text>

            <Text
              variant="bodySmall"
              color="secondary"
              style={styles.deleteDescription}
            >
              Permanently remove this financial record.
            </Text>
          </View>

          <MaterialIcons
            name="chevron-right"
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      </Card>

      <ConfirmModal
        visible={confirmDelete}
        title="Delete this transaction?"
        message={`This permanently removes ${transaction.merchant} from Activity and your PerFin OS workspace.`}
        confirmLabel="Delete"
        onCancel={() =>
          setConfirmDelete(false)
        }
        onConfirm={async () => {
          await deleteTransaction(
            transaction.id
          );

          setConfirmDelete(false);

          navigation.navigate('MainTabs', {
            screen: 'Transactions',
          });
        }}
      />
    </AppScroll>
  );
};

export const ExpenseDetailScreen = () => (
  <RequireData>
    {(data) => (
      <TransactionDetailContent
        data={data}
      />
    )}
  </RequireData>
);

const styles = StyleSheet.create({
  leadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  editAction: {
    minHeight:
      ControlSize.minimumTouchTarget,
    borderWidth: 1,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  editActionLabel: {
    fontWeight:
      Typography.label.fontWeight,
  },
  heroCard: {
    marginBottom: Spacing.lg,
  },
  heroEyebrow: {
    letterSpacing: 0.8,
    fontWeight:
      Typography.label.fontWeight,
  },
  heroMerchant: {
    marginTop: Spacing.sm,
  },
  heroAmount: {
    marginTop: Spacing.lg,
    letterSpacing: -0.4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  heroMetaDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.round,
    flexShrink: 0,
  },
  heroMetaText: {
    flex: 1,
    minWidth: 0,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.lg,
  },
  heroNotesLabel: {
    fontWeight:
      Typography.label.fontWeight,
  },
  heroNotes: {
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionSubheading: {
    marginTop: Spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  detailList: {
    marginTop: Spacing.md,
  },
  detailRow: {
    minHeight: 56,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    flex: 1,
    minWidth: 0,
  },
  detailValue: {
    flex: 1.45,
    minWidth: 0,
    textAlign: 'right',
    fontWeight:
      Typography.label.fontWeight,
  },
  placeName: {
    marginTop: Spacing.md,
    fontWeight:
      Typography.label.fontWeight,
  },
  placeAddress: {
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  linkAction: {
    minHeight:
      ControlSize.minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    flexShrink: 0,
  },
  linkActionLabel: {
    fontWeight:
      Typography.label.fontWeight,
  },
  receiptList: {
    marginTop: Spacing.md,
  },
  receiptRow: {
    minHeight: 62,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  receiptIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  receiptCopy: {
    flex: 1,
    minWidth: 0,
  },
  receiptTitle: {
    fontWeight:
      Typography.label.fontWeight,
  },
  receiptMeta: {
    marginTop: Spacing.xs,
  },
  emptyReceiptRow: {
    minHeight: 62,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  recordNote: {
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  deleteAction: {
    minHeight: 72,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  deleteIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deleteCopy: {
    flex: 1,
    minWidth: 0,
  },
  deleteTitle: {
    fontWeight:
      Typography.label.fontWeight,
  },
  deleteDescription: {
    marginTop: Spacing.xs,
  },
});

/**
 * TransactionsView - Activity feed with compact search, quick filters,
 * advanced filter panel, and clean transaction rows.
 */
import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import { EmptyState, IconButton } from '../../components/finance';
import { Field } from '../../components/form/Field';
import { Segmented } from '../../components/form/Segmented';
import { RequireData } from '../../components/layout/RequireData';
import { RootAppHeader } from '../../components/layout/RootAppHeader';
import {
  FloatingActionLayer,
  RootTabBottomSpacer,
} from '../../components/layout/FloatingTabChrome';
import {
  useActivityFilters,
  calculateActivitySummary,
  DATE_PRESET_OPTIONS,
  FREQUENCY_FILTER_OPTIONS,
  toLocalIsoDate,
} from '../../context/ActivityFilterContext';
import {
  useColors,
  useTheme,
} from '../../context/ThemeContext';
import { AppData, Category, Transaction, TransactionDatePreset, TransactionFrequencyFilter, TransactionSortKey } from '../../models/finance';
import { filterTransactions, sortTransactions } from '../../repositories/AnalyticsRepository';
import { ControlSize, Radius, Spacing, Typography, Shadows } from '../../theme/index';
import { formatCurrency, formatCurrencyPrecise } from '../../utils/format';
import { mcIconName } from '../../utils/icons';

type TransactionTypeFilter = 'all' | 'income' | 'expense';
type ReceiptFilter = 'any' | 'attached' | 'missing';
type ActivitySheet =
  | 'date'
  | 'category'
  | 'refine'
  | null;

const DATE_PRESET_LABELS: Record<
  TransactionDatePreset,
  string
> = {
  'this-week': 'This week',
  'last-2-weeks': 'Last 2 weeks',
  'this-month': 'This month',
  'last-3-months': 'Last 3 months',
  'last-6-months': 'Last 6 months',
  'last-12-months': 'Last 12 months',
  custom: 'Custom dates',
};

const parseIsoDate = (value: string) => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(`${value}T12:00:00`);

  return Number.isNaN(parsed.getTime())
    ? new Date()
    : parsed;
};

const CalendarDateField = ({
  label,
  value,
  open,
  minimumDate,
  maximumDate,
  onOpen,
  onClose,
  onChange,
}: {
  label: string;
  value: string;
  open: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  onOpen: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
}) => {
  const colors = useColors();
  const { resolved: themeScheme } = useTheme();

  if (Platform.OS === 'web') {
    return (
      <View style={styles.calendarFieldGroup}>
        <Text
          variant="bodySmall"
          style={styles.calendarFieldLabel}
        >
          {label}
        </Text>

        <input
          type="date"
          value={value}
          min={
            minimumDate
              ? toLocalIsoDate(minimumDate)
              : undefined
          }
          max={
            maximumDate
              ? toLocalIsoDate(maximumDate)
              : undefined
          }
          onChange={(event: any) =>
            onChange(event.target.value)
          }
          style={
            {
              width: '100%',
              padding: '13px 16px',
              fontSize: 16,
              borderRadius: 12,
              border: `1px solid ${colors.borderDefault}`,
              backgroundColor:
                colors.backgroundSurface,
              color: colors.textPrimary,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              cursor: 'pointer',
            } as any
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.calendarFieldGroup}>
      <Text
        variant="bodySmall"
        style={styles.calendarFieldLabel}
      >
        {label}
      </Text>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Select ${label.toLowerCase()}`}
        onPress={onOpen}
        activeOpacity={0.76}
        style={[
          styles.calendarField,
          {
            borderColor: colors.borderDefault,
            backgroundColor:
              colors.backgroundSurface,
          },
        ]}
      >
        <Text
          variant="body"
          color={value ? 'primary' : 'secondary'}
          style={styles.calendarFieldValue}
        >
          {value
            ? formatDateLabel(value)
            : `Select ${label.toLowerCase()}`}
        </Text>

        <MaterialIcons
          name="calendar-today"
          size={19}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {open ? (
        <View style={styles.calendarPicker}>
          <DateTimePicker
            value={parseIsoDate(value)}
            mode="date"
            display={
              Platform.OS === 'ios'
                ? 'inline'
                : 'default'
            }
            themeVariant={themeScheme}
            accentColor={colors.actionPrimary}
            style={[
              styles.nativeCalendar,
              {
                backgroundColor: colors.backgroundElevated,
              },
            ]}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(
              event: any,
              selectedDate?: Date
            ) => {
              if (
                Platform.OS !== 'ios' ||
                event.type === 'dismissed'
              ) {
                onClose();
              }

              if (
                event.type === 'dismissed' ||
                !selectedDate
              ) {
                return;
              }

              onChange(
                toLocalIsoDate(selectedDate)
              );

              if (Platform.OS === 'ios') {
                onClose();
              }
            }}
          />
        </View>
      ) : null}
    </View>
  );
};



type FeedItem =
  | {
      type: 'date';
      date: string;
      net: number;
      transactionCount: number;
    }
  | { type: 'transaction'; transaction: Transaction };

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

const formatPeriodRange = (
  startDate?: string,
  endDate?: string
) => {
  const formatValue = (
    value: string | undefined,
    fallback: string
  ) => {
    if (!value) {
      return fallback;
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  if (!startDate && !endDate) {
    return '';
  }

  return `${formatValue(startDate, 'Start')} – ${formatValue(
    endDate,
    'Today'
  )}`;
};

const buildFeedItems = (transactions: Transaction[]): FeedItem[] => {
  const items: FeedItem[] = [];
  const dailySummaries = new Map<
    string,
    { net: number; transactionCount: number }
  >();

  transactions.forEach((transaction) => {
    const current = dailySummaries.get(transaction.date) ?? {
      net: 0,
      transactionCount: 0,
    };

    current.net +=
      transaction.type === 'income'
        ? transaction.amount
        : -transaction.amount;
    current.transactionCount += 1;

    dailySummaries.set(transaction.date, current);
  });

  let activeDate = '';

  transactions.forEach((transaction) => {
    if (transaction.date !== activeDate) {
      activeDate = transaction.date;
      const summary = dailySummaries.get(transaction.date) ?? {
        net: 0,
        transactionCount: 0,
      };

      items.push({
        type: 'date',
        date: transaction.date,
        net: summary.net,
        transactionCount: summary.transactionCount,
      });
    }

    items.push({ type: 'transaction', transaction });
  });

  return items;
};

const PeriodSelector = ({
  label,
  startDate,
  endDate,
  onPress,
}: {
  label: string;
  startDate?: string;
  endDate?: string;
  onPress: () => void;
}) => {
  const colors = useColors();
  const rangeLabel = formatPeriodRange(startDate, endDate);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.76}
      accessibilityRole="button"
      accessibilityLabel={`Review period: ${label}${
        rangeLabel ? `, ${rangeLabel}` : ''
      }`}
      accessibilityHint="Opens date range options"
      style={[
        styles.periodSelector,
        {
          backgroundColor: colors.backgroundSurface,
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <View
        style={[
          styles.periodIcon,
          { backgroundColor: colors.actionPrimarySoft },
        ]}
      >
        <MaterialIcons
          name="calendar-today"
          size={19}
          color={colors.actionPrimary}
        />
      </View>

      <View style={styles.periodCopy}>
        <Text variant="bodySmall" style={styles.periodTitle}>
          {label}
        </Text>

        {rangeLabel ? (
          <Text
            variant="caption"
            color="secondary"
            numberOfLines={1}
            style={styles.periodRange}
          >
            {rangeLabel}
          </Text>
        ) : null}
      </View>

      <View style={styles.periodTrailing}>
        <MaterialIcons
          name="keyboard-arrow-down"
          size={22}
          color={colors.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );
};

const SummaryStrip = ({
  income,
  expenses,
  net,
  transactionCount,
  currency,
}: {
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  currency: string;
}) => {
  const colors = useColors();
  const netColor = net >= 0 ? colors.amountIncome : colors.amountExpense;

  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryMetric}>
          <View style={styles.summaryMetricHeader}>
            <View
              style={[
                styles.summaryIcon,
                { backgroundColor: `${colors.amountIncome}1F` },
              ]}
            >
              <MaterialIcons
                name="south"
                size={17}
                color={colors.amountIncome}
              />
            </View>

            <Text
              variant="caption"
              color="secondary"
              style={styles.summaryLabel}
            >
              Income
            </Text>
          </View>

          <Text
            variant="h4"
            color="success"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(income, currency)}
          </Text>
        </View>

        <View style={styles.summaryMetric}>
          <View style={styles.summaryMetricHeader}>
            <View
              style={[
                styles.summaryIcon,
                { backgroundColor: `${colors.amountExpense}1F` },
              ]}
            >
              <MaterialIcons
                name="north"
                size={17}
                color={colors.amountExpense}
              />
            </View>

            <Text
              variant="caption"
              color="secondary"
              style={styles.summaryLabel}
            >
              Spending
            </Text>
          </View>

          <Text
            variant="h4"
            color="danger"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(expenses, currency)}
          </Text>
        </View>

        <View style={styles.summaryMetric}>
          <View style={styles.summaryMetricHeader}>
            <View
              style={[
                styles.summaryIcon,
                { backgroundColor: `${netColor}1F` },
              ]}
            >
              <MaterialIcons
                name="swap-vert"
                size={18}
                color={netColor}
              />
            </View>

            <Text
              variant="caption"
              color="secondary"
              style={styles.summaryLabel}
            >
              Net movement
            </Text>
          </View>

          <Text
            variant="h4"
            color={
              net >= 0
                ? 'success'
                : 'danger'
            }
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(net, currency)}
          </Text>
        </View>

        <View style={styles.summaryMetric}>
          <View style={styles.summaryMetricHeader}>
            <View
              style={[
                styles.summaryIcon,
                { backgroundColor: colors.actionPrimarySoft },
              ]}
            >
              <MaterialIcons
                name="receipt-long"
                size={17}
                color={colors.actionPrimary}
              />
            </View>

            <Text
              variant="caption"
              color="secondary"
              style={styles.summaryLabel}
            >
              Transactions
            </Text>
          </View>

          <Text
            variant="h4"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {transactionCount}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const QuickFilters = ({
  value,
  onChange,
  categorySelected,
  refineFilterCount,
  onOpenCategory,
  onOpenRefine,
}: {
  value: TransactionTypeFilter;
  onChange: (value: TransactionTypeFilter) => void;
  categorySelected: boolean;
  refineFilterCount: number;
  onOpenCategory: () => void;
  onOpenRefine: () => void;
}) => {
  const colors = useColors();

  const chips = [
    {
      key: 'all',
      label: 'All',
      selected: value === 'all',
      onPress: () => onChange('all'),
    },
    {
      key: 'expense',
      label: 'Expenses',
      selected: value === 'expense',
      onPress: () => onChange('expense'),
    },
    {
      key: 'income',
      label: 'Income',
      selected: value === 'income',
      onPress: () => onChange('income'),
    },
    {
      key: 'category',
      label: 'Category',
      selected: categorySelected,
      onPress: onOpenCategory,
    },
    {
      key: 'refine',
      label: 'Refine',
      selected: refineFilterCount > 0,
      onPress: onOpenRefine,
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.quickFilterScroll}
      contentContainerStyle={styles.quickFilterRow}
    >
      {chips.map((chip) => (
        <TouchableOpacity
          key={chip.key}
          onPress={chip.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${chip.label} activity filter`}
          accessibilityHint={
            chip.key === 'category' ||
            chip.key === 'refine'
              ? `Opens ${chip.label.toLowerCase()} filters`
              : `Shows ${chip.label.toLowerCase()} transactions`
          }
          accessibilityState={{
            selected: chip.selected,
          }}
          style={[
            styles.filterChip,
            {
              borderColor: chip.selected
                ? colors.actionPrimary
                : colors.borderDefault,
              backgroundColor: chip.selected
                ? colors.actionPrimarySoft
                : colors.backgroundSurface,
            },
          ]}
        >
          <Text
            variant="caption"
            style={[
              styles.filterChipLabel,
              {
                color: chip.selected
                  ? colors.actionPrimary
                  : colors.textSecondary,
              },
            ]}
          >
            {chip.label}
          </Text>

          {chip.key === 'refine' &&
          refineFilterCount > 0 ? (
            <View
              style={[
                styles.filterBadge,
                {
                  backgroundColor: colors.actionPrimary,
                },
              ]}
            >
              <Text
                variant="caption"
                style={[
                  styles.filterBadgeLabel,
                  { color: colors.textInverse },
                ]}
              >
                {refineFilterCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const ActivityFilterSheet = ({
  mode,
  categories,
  sortKey,
  categoryId,
  receiptFilter,
  datePreset,
  customStartDate,
  customEndDate,
  frequencyFilter,
  onSortChange,
  onCategoryChange,
  onReceiptFilterChange,
  onDatePresetChange,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onFrequencyFilterChange,
  onClearDate,
  onClearCategory,
  onClearRefine,
  onClose,
}: {
  mode: ActivitySheet;
  categories: Category[];
  sortKey: TransactionSortKey;
  categoryId: string;
  receiptFilter: ReceiptFilter;
  datePreset: TransactionDatePreset;
  customStartDate: string;
  customEndDate: string;
  frequencyFilter: TransactionFrequencyFilter;
  onSortChange: (
    value: TransactionSortKey
  ) => void;
  onCategoryChange: (value: string) => void;
  onReceiptFilterChange: (
    value: ReceiptFilter
  ) => void;
  onDatePresetChange: (
    value: TransactionDatePreset
  ) => void;
  onCustomStartDateChange: (
    value: string
  ) => void;
  onCustomEndDateChange: (
    value: string
  ) => void;
  onFrequencyFilterChange: (
    value: TransactionFrequencyFilter
  ) => void;
  onClearDate: () => void;
  onClearCategory: () => void;
  onClearRefine: () => void;
  onClose: () => void;
}) => {
  const colors = useColors();
  const [draftDatePreset, setDraftDatePreset] =
    useState<TransactionDatePreset>(datePreset);
  const [draftStartDate, setDraftStartDate] =
    useState(customStartDate);
  const [draftEndDate, setDraftEndDate] =
    useState(customEndDate);
  const [activeDateField, setActiveDateField] =
    useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (mode !== 'date') {
      return;
    }

    setDraftDatePreset(datePreset);
    setDraftStartDate(customStartDate);
    setDraftEndDate(customEndDate);
    setActiveDateField(null);
  }, [
    customEndDate,
    customStartDate,
    datePreset,
    mode,
  ]);

  const customDateInvalid =
    Boolean(
      draftStartDate &&
      draftEndDate &&
      draftStartDate > draftEndDate
    );

  const dateApplyDisabled =
    mode === 'date' &&
    draftDatePreset === 'custom' &&
    (
      !draftStartDate ||
      !draftEndDate ||
      customDateInvalid
    );

  if (!mode) {
    return null;
  }

  const sheetCopy = {
    date: {
      title: 'Review period',
      subtitle:
        'Choose the dates included in Activity.',
      clearLabel: 'Reset dates',
      applyLabel: 'Apply dates',
    },
    category: {
      title: 'Category',
      subtitle:
        'Show activity from one category.',
      clearLabel: 'All categories',
      applyLabel: 'Apply category',
    },
    refine: {
      title: 'Refine activity',
      subtitle:
        'Adjust frequency, receipts, and sorting.',
      clearLabel: 'Clear refine',
      applyLabel: 'Apply filters',
    },
  }[mode];

  const handleClear = () => {
    if (mode === 'date') {
      setDraftDatePreset('this-month');
      setDraftStartDate('');
      setDraftEndDate('');
      setActiveDateField(null);
      onClearDate();
      return;
    }

    if (mode === 'category') {
      onClearCategory();
      return;
    }

    onClearRefine();
  };

  const handleApply = () => {
    if (mode === 'date') {
      onDatePresetChange(draftDatePreset);

      if (draftDatePreset === 'custom') {
        onCustomStartDateChange(
          draftStartDate
        );
        onCustomEndDateChange(
          draftEndDate
        );
      }

      onClose();
      return;
    }

    onClose();
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={[
          styles.modalBackdrop,
          {
            backgroundColor: colors.overlay,
          },
        ]}
      >
        <View
          style={[
            styles.filterPanel,
            { backgroundColor: colors.backgroundElevated },
          ]}
        >
          <View style={styles.rowBetween}>
            <View style={styles.sheetTitleCopy}>
              <Text variant="h3">
                {sheetCopy.title}
              </Text>

              <Text
                variant="bodySmall"
                color="secondary"
                style={
                  styles.sheetSubtitle
                }
              >
                {sheetCopy.subtitle}
              </Text>
            </View>

            <IconButton
              icon="close"
              label={`Close ${sheetCopy.title}`}
              onPress={onClose}
            />
          </View>

          <ScrollView
            style={styles.filterScroll}
            contentContainerStyle={
              styles.filterScrollContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {mode === 'date' ? (
              <View style={styles.filterSection}>
                <Text
                  variant="bodySmall"
                  style={
                    styles.filterSectionTitle
                  }
                >
                  Date range
                </Text>

                <View
                  style={styles.datePresetGrid}
                >
                  {DATE_PRESET_OPTIONS.map(
                    (preset) => {
                      const selected =
                        draftDatePreset ===
                        preset;
                      const custom =
                        preset === 'custom';

                      return (
                        <TouchableOpacity
                          key={preset}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected,
                          }}
                          accessibilityLabel={
                            DATE_PRESET_LABELS[
                              preset
                            ] || preset
                          }
                          activeOpacity={0.76}
                          onPress={() => {
                            setDraftDatePreset(
                              preset
                            );

                            if (custom) {
                              setActiveDateField(
                                null
                              );
                              return;
                            }

                            setDraftStartDate('');
                            setDraftEndDate('');
                            setActiveDateField(
                              null
                            );
                          }}
                          style={[
                            styles.datePresetButton,
                            custom &&
                              styles.datePresetButtonWide,
                            {
                              borderColor:
                                selected
                                  ? colors.actionPrimary
                                  : colors.borderDefault,
                              backgroundColor:
                                selected
                                  ? colors.actionPrimarySoft
                                  : colors.backgroundSurface,
                            },
                          ]}
                        >
                          <Text
                            variant="bodySmall"
                            style={[
                              styles.datePresetLabel,
                              {
                                color: selected
                                  ? colors.actionPrimary
                                  : colors.textPrimary,
                              },
                            ]}
                          >
                            {
                              DATE_PRESET_LABELS[
                                preset
                              ] || preset
                            }
                          </Text>

                          {selected ? (
                            <MaterialIcons
                              name="check"
                              size={18}
                              color={
                                colors.actionPrimary
                              }
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>

                {draftDatePreset ===
                'custom' ? (
                  <View
                    style={
                      styles.customCalendarRange
                    }
                  >
                    <CalendarDateField
                      label="Start date"
                      value={draftStartDate}
                      open={
                        activeDateField ===
                        'start'
                      }
                      maximumDate={
                        draftEndDate
                          ? parseIsoDate(
                              draftEndDate
                            )
                          : new Date()
                      }
                      onOpen={() =>
                        setActiveDateField(
                          'start'
                        )
                      }
                      onClose={() =>
                        setActiveDateField(
                          null
                        )
                      }
                      onChange={(value) => {
                        setDraftStartDate(
                          value
                        );

                        if (
                          draftEndDate &&
                          value > draftEndDate
                        ) {
                          setDraftEndDate('');
                        }
                      }}
                    />

                    <CalendarDateField
                      label="End date"
                      value={draftEndDate}
                      open={
                        activeDateField ===
                        'end'
                      }
                      minimumDate={
                        draftStartDate
                          ? parseIsoDate(
                              draftStartDate
                            )
                          : undefined
                      }
                      maximumDate={
                        new Date()
                      }
                      onOpen={() =>
                        setActiveDateField(
                          'end'
                        )
                      }
                      onClose={() =>
                        setActiveDateField(
                          null
                        )
                      }
                      onChange={
                        setDraftEndDate
                      }
                    />

                    {customDateInvalid ? (
                      <Text
                        variant="caption"
                        color="danger"
                        style={
                          styles.customDateError
                        }
                      >
                        End date must be on or
                        after the start date.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {mode === 'category' ? (
              <View style={styles.filterSection}>
                <View style={styles.chipWrap}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{
                      selected:
                        categoryId === 'all',
                    }}
                    onPress={() =>
                      onCategoryChange('all')
                    }
                    style={[
                      styles.filterChip,
                      {
                        borderColor:
                          categoryId === 'all'
                            ? colors.actionPrimary
                            : colors.borderDefault,
                        backgroundColor:
                          categoryId === 'all'
                            ? colors.actionPrimarySoft
                            : colors.backgroundSurface,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={[
                        styles.filterChipLabel,
                        {
                          color:
                            categoryId === 'all'
                              ? colors.actionPrimary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      All categories
                    </Text>
                  </TouchableOpacity>

                  {categories.map((category) => {
                    const selected =
                      categoryId === category.id;

                    return (
                      <TouchableOpacity
                        key={category.id}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected,
                        }}
                        onPress={() =>
                          onCategoryChange(
                            category.id
                          )
                        }
                        style={[
                          styles.filterChip,
                          {
                            borderColor: selected
                              ? category.color
                              : colors.borderDefault,
                            backgroundColor:
                              selected
                                ? `${category.color}1F`
                                : colors.backgroundSurface,
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          style={[
                            styles.filterChipLabel,
                            {
                              color: selected
                                ? category.color
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {mode === 'refine' ? (
              <>
                <View style={styles.filterSection}>
                  <Text
                    variant="bodySmall"
                    style={
                      styles.filterSectionTitle
                    }
                  >
                    Frequency
                  </Text>

                  <Segmented
                    options={
                      FREQUENCY_FILTER_OPTIONS
                    }
                    value={frequencyFilter}
                    onChange={(value) =>
                      onFrequencyFilterChange(
                        value as TransactionFrequencyFilter
                      )
                    }
                  />
                </View>

                <View style={styles.filterSection}>
                  <Text
                    variant="bodySmall"
                    style={
                      styles.filterSectionTitle
                    }
                  >
                    Receipts
                  </Text>

                  <Segmented
                    options={[
                      'any',
                      'attached',
                      'missing',
                    ]}
                    value={receiptFilter}
                    onChange={(value) =>
                      onReceiptFilterChange(
                        value as ReceiptFilter
                      )
                    }
                  />
                </View>

                <View style={styles.filterSection}>
                  <Text
                    variant="bodySmall"
                    style={
                      styles.filterSectionTitle
                    }
                  >
                    Sort by
                  </Text>

                  <Segmented
                    options={[
                      'date-desc',
                      'date-asc',
                      'amount-desc',
                      'amount-asc',
                      'merchant-asc',
                    ]}
                    value={sortKey}
                    onChange={(value) =>
                      onSortChange(
                        value as TransactionSortKey
                      )
                    }
                  />
                </View>
              </>
            ) : null}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              label={sheetCopy.clearLabel}
              variant="secondary"
              onPress={handleClear}
              style={styles.modalAction}
            />

            <Button
              label={sheetCopy.applyLabel}
              onPress={handleApply}
              disabled={dateApplyDisabled}
              style={styles.modalAction}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const DateHeader = ({
  date,
  net,
  transactionCount,
  currency,
}: {
  date: string;
  net: number;
  transactionCount: number;
  currency: string;
}) => {
  const colors = useColors();
  const amountColor = net >= 0 ? colors.amountIncome : colors.amountExpense;

  return (
    <View style={styles.dateHeader}>
      <View style={styles.rowBetween}>
        <View>
          <Text
            variant="bodySmall"
            style={styles.dateHeaderText}
          >
            {formatDateLabel(date)}
          </Text>

          <Text variant="caption" color="tertiary">
            {transactionCount}{' '}
            {transactionCount === 1 ? 'transaction' : 'transactions'}
          </Text>
        </View>

        <Text
          variant="bodySmall"
          style={[
            styles.dateHeaderAmount,
            { color: amountColor },
          ]}
          numberOfLines={1}
        >
          {net > 0 ? '+' : ''}
          {formatCurrency(net, currency)}
        </Text>
      </View>
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
  const amountColor = transaction.type === 'income' ? colors.amountIncome : colors.amountExpense;
  const receiptCount = transaction.receipts?.length || 0;
  const placeLabel =
    transaction.location?.neighborhood ||
    transaction.location?.name ||
    'No place';
  const metadata = [
    transaction.categoryName || category?.name || 'Uncategorized',
    transaction.paymentMethod,
    placeLabel,
    transaction.isRecurring ? 'Recurring' : null,
    receiptCount > 0
      ? `${receiptCount} receipt${receiptCount === 1 ? '' : 's'}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${transaction.merchant} transaction`}
      accessibilityHint="Opens transaction details"
      activeOpacity={0.76}
    >
      <View
        style={[
          styles.transactionCard,
          { borderBottomColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.transactionRow}>
          <View style={[styles.iconTile, { backgroundColor: `${category?.color || colors.actionPrimary}1F` }]}>
            <MaterialCommunityIcons
              name={mcIconName(category?.icon, transaction.type === 'income' ? 'cash-plus' : 'receipt')}
              size={20}
              color={category?.color || colors.actionPrimary}
            />
          </View>

          <View style={styles.transactionCopy}>
            <View style={styles.transactionTitleRow}>
              <Text
                variant="body"
                style={styles.transactionTitle}
                numberOfLines={1}
              >
                {transaction.merchant}
              </Text>

              {transaction.isRecurring ? (
                <View style={[styles.receiptPill, { backgroundColor: colors.actionPrimarySoft }]}>
                  <MaterialIcons name="autorenew" size={13} color={colors.actionPrimary} />
                  <Text
                    variant="caption"
                    style={[styles.pillLabel, { color: colors.actionPrimary }]}
                  >
                    Recurring
                  </Text>
                </View>
              ) : null}

              {receiptCount > 0 ? (
                <View style={[styles.receiptPill, { backgroundColor: colors.actionPrimarySoft }]}>
                  <MaterialIcons name="receipt-long" size={13} color={colors.actionPrimary} />
                  <Text
                    variant="caption"
                    style={[styles.pillLabel, { color: colors.actionPrimary }]}
                  >
                    {receiptCount}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              variant="caption"
              color="secondary"
              numberOfLines={1}
              style={styles.transactionMeta}
            >
              {metadata}
            </Text>
          </View>

          <View style={styles.amountBlock}>
            <Text
              style={[styles.amountText, { color: amountColor }]}
              numberOfLines={1}
            >
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrencyPrecise(transaction.amount, currency)}
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={colors.textMuted}
              style={styles.chevron}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const TransactionsContent = ({ data }: { data: AppData }) => {
  const navigation = useNavigation<any>();
  const colors = useColors();

  const [query, setQuery] = useState('');
  const [type, setType] = useState<TransactionTypeFilter>('all');
  const [sortKey, setSortKey] = useState<TransactionSortKey>('date-desc');
  const [categoryId, setCategoryId] = useState('all');
  const [receiptFilter, setReceiptFilter] = useState<ReceiptFilter>('any');
  const {
    datePreset,
    customStartDate,
    customEndDate,
    frequencyFilter,
    dateRange,
    setDatePreset,
    setCustomStartDate,
    setCustomEndDate,
    setFrequencyFilter,
  } = useActivityFilters();
  const [activeSheet, setActiveSheet] =
    useState<ActivitySheet>(null);

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
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      frequency: frequencyFilter,
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
  }, [categoryId, data.transactions, dateRange.endDate, dateRange.startDate, frequencyFilter, query, receiptFilter, sortKey, type]);

  const feedItems = useMemo(() => buildFeedItems(visibleTransactions), [visibleTransactions]);

  const summary = useMemo(() => calculateActivitySummary(visibleTransactions), [visibleTransactions]);

  const resultSummary = `${summary.transactionCount} transaction${summary.transactionCount === 1 ? '' : 's'} · ${summary.recurringCount} recurring · ${summary.oneTimeCount} one-time`;


  const refineFilterCount =
    (sortKey !== 'date-desc' ? 1 : 0) +
    (receiptFilter !== 'any' ? 1 : 0) +
    (frequencyFilter !== 'all' ? 1 : 0);

  const activeFilters: Array<{
    key: string;
    label: string;
    clear: () => void;
  }> = [];

  if (query.trim()) {
    activeFilters.push({
      key: 'query',
      label: `Search: ${query.trim()}`,
      clear: () => setQuery(''),
    });
  }

  if (type !== 'all') {
    activeFilters.push({
      key: 'type',
      label: type === 'income' ? 'Income' : 'Expenses',
      clear: () => setType('all'),
    });
  }

  if (datePreset !== 'this-month') {
    activeFilters.push({
      key: 'date',
      label: dateRange.label,
      clear: () => {
        setDatePreset('this-month');
        setCustomStartDate('');
        setCustomEndDate('');
      },
    });
  }

  if (frequencyFilter !== 'all') {
    activeFilters.push({
      key: 'frequency',
      label:
        frequencyFilter === 'recurring'
          ? 'Recurring'
          : 'One-time',
      clear: () => setFrequencyFilter('all'),
    });
  }

  if (categoryId !== 'all') {
    activeFilters.push({
      key: 'category',
      label:
        data.categories.find(
          (category) => category.id === categoryId
        )?.name || 'Category',
      clear: () => setCategoryId('all'),
    });
  }

  if (receiptFilter !== 'any') {
    activeFilters.push({
      key: 'receipt',
      label:
        receiptFilter === 'attached'
          ? 'Receipt attached'
          : 'Receipt missing',
      clear: () => setReceiptFilter('any'),
    });
  }

  if (sortKey !== 'date-desc') {
    const sortLabels: Partial<
      Record<TransactionSortKey, string>
    > = {
      'date-asc': 'Oldest first',
      'amount-desc': 'Highest amount first',
      'amount-asc': 'Lowest amount first',
      'merchant-asc': 'Merchant A–Z',
    };

    activeFilters.push({
      key: 'sort',
      label: sortLabels[sortKey] || 'Custom sort',
      clear: () => setSortKey('date-desc'),
    });
  }

  const clearDateFilters = () => {
    setDatePreset('this-month');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const clearCategoryFilter = () => {
    setCategoryId('all');
  };

  const clearRefineFilters = () => {
    setSortKey('date-desc');
    setReceiptFilter('any');
    setFrequencyFilter('all');
  };

  const resetAllFilters = () => {
    setQuery('');
    setType('all');
    clearDateFilters();
    clearCategoryFilter();
    clearRefineFilters();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundCanvas }]}>
      <FlatList
        data={feedItems}
        keyExtractor={(item, index) => (item.type === 'date' ? `date-${item.date}` : `transaction-${item.transaction.id}-${index}`)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <RootAppHeader
              title="Activity"
              subtitle="Review the money movement behind your financial picture."
            />

            <PeriodSelector
              label={dateRange.label}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onPress={() =>
                setActiveSheet('date')
              }
            />

            <View style={styles.searchCard}>
              <Field
                label="Search transactions"
                value={query}
                onChangeText={setQuery}
                placeholder="Merchant, category, location, note, or payment method"
              />
            </View>

            <View style={styles.filterArea}>
              <QuickFilters
                value={type}
                onChange={(value) => {
                  setType(value);
                  setCategoryId('all');
                }}
                categorySelected={
                  categoryId !== 'all'
                }
                refineFilterCount={
                  refineFilterCount
                }
                onOpenCategory={() =>
                  setActiveSheet('category')
                }
                onOpenRefine={() =>
                  setActiveSheet('refine')
                }
              />

              <SummaryStrip
                income={summary.income}
                expenses={summary.expenses}
                net={summary.netCashFlow}
                transactionCount={
                  summary.transactionCount
                }
                currency={data.user.currency}
              />

              {activeFilters.length > 0 ? (
                <View
                  style={styles.activeFilterRow}
                >
                  {activeFilters.map((filter) => (
                    <TouchableOpacity
                      key={filter.key}
                      onPress={filter.clear}
                      activeOpacity={0.72}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${filter.label} filter`}
                      style={[
                        styles.activeFilterChip,
                        {
                          backgroundColor:
                            colors.actionPrimarySoft,
                          borderColor:
                            colors.actionPrimary,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        numberOfLines={1}
                        style={[
                          styles.activeFilterChipLabel,
                          {
                            color:
                              colors.actionPrimary,
                          },
                        ]}
                      >
                        {filter.label}
                      </Text>

                      <MaterialIcons
                        name="close"
                        size={15}
                        color={colors.actionPrimary}
                      />
                    </TouchableOpacity>
                  ))}


                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Reset all activity filters"
                    activeOpacity={0.76}
                    style={styles.activeFilterReset}
                    onPress={resetAllFilters}
                  >
                    <Text
                      variant="caption"
                      style={[
                        styles.actionLabel,
                        { color: colors.actionPrimary },
                      ]}
                    >
                      Reset
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.resultLine}>
                <Text
                  variant="caption"
                  color="tertiary"
                >
                  {resultSummary}
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          data.transactions.length === 0 ? (
            <EmptyState
              title="No activity yet"
              message="Add your first transaction to start building your money history."
              actionLabel="Add transaction"
              onAction={() => navigation.navigate('AddTransaction')}
            />
          ) : activeFilters.length > 0 ? (
            <EmptyState
              title="No matching transactions"
              message="No transactions match the current search or filters."
              actionLabel="Reset filters"
              onAction={resetAllFilters}
            />
          ) : (
            <EmptyState
              title={`No activity in ${dateRange.label.toLowerCase()}`}
              message="Choose another review period to see earlier transactions."
              actionLabel="Adjust period"
              onAction={() =>
                setActiveSheet('date')
              }
            />
          )
        }
        renderItem={({ item }) => {
          if (item.type === 'date') {
            return (
              <DateHeader
                date={item.date}
                net={item.net}
                transactionCount={item.transactionCount}
                currency={data.user.currency}
              />
            );
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
        ListFooterComponent={
          <>
            <View style={styles.listFooter} />
            <RootTabBottomSpacer />
          </>
        }
      />

      <FloatingActionLayer>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('AddTransaction')
          }
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          accessibilityHint="Opens the new transaction form"
          hitSlop={4}
          style={[
            styles.activityAddButton,
            { backgroundColor: colors.actionPrimary },
          ]}
        >
          <MaterialIcons
            name="add"
            size={24}
            color={colors.textInverse}
          />
        </TouchableOpacity>
      </FloatingActionLayer>

      <ActivityFilterSheet
        mode={activeSheet}
        categories={categoriesForFilter}
        sortKey={sortKey}
        categoryId={categoryId}
        receiptFilter={receiptFilter}
        datePreset={datePreset}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        frequencyFilter={frequencyFilter}
        onSortChange={setSortKey}
        onCategoryChange={setCategoryId}
        onReceiptFilterChange={
          setReceiptFilter
        }
        onDatePresetChange={setDatePreset}
        onCustomStartDateChange={
          setCustomStartDate
        }
        onCustomEndDateChange={
          setCustomEndDate
        }
        onFrequencyFilterChange={
          setFrequencyFilter
        }
        onClearDate={clearDateFilters}
        onClearCategory={clearCategoryFilter}
        onClearRefine={clearRefineFilters}
        onClose={() => setActiveSheet(null)}
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  searchCard: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  periodSelector: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    minHeight: 52,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  periodIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  periodTitle: {
    textAlign: 'center',
    fontWeight: Typography.label.fontWeight,
  },
  periodRange: {
    textAlign: 'center',
  },
  periodTrailing: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryMetric: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  summaryMetricHeader: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIcon: {
    display: 'none',
  },
  summaryLabel: {
    width: '100%',
    textAlign: 'center',
    fontWeight: Typography.label.fontWeight,
  },
  filterArea: {
    marginBottom: Spacing.sm,
  },
  quickFilterScroll: {
    marginHorizontal: -Spacing.lg,
  },
  quickFilterRow: {
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quickFilterControl: {
    flex: 1,
    minWidth: 0,
  },
  filterButton: {
    minHeight: ControlSize.minimumTouchTarget,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  filterBadgeLabel: {
    fontWeight: Typography.label.fontWeight,
  },
  actionLabel: {
    fontWeight: Typography.label.fontWeight,
  },
  activeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  activeFilterChip: {
    maxWidth: 250,
    minHeight: 34,
    borderWidth: 1,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  activeFilterReset: {
    minHeight: 34,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultLine: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  resetAction: {
    minHeight: ControlSize.minimumTouchTarget,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateHeader: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  dateHeaderText: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: Typography.label.fontWeight,
  },
  transactionCard: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 52,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  transactionCopy: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionTitle: {
    flex: 1,
    minWidth: 0,
    fontWeight: Typography.label.fontWeight,
  },
  transactionMeta: {
    marginTop: 2,
  },
  receiptPill: {
    display: 'none',
  },
  pillLabel: {
    fontWeight: Typography.label.fontWeight,
  },
  amountBlock: {
    minWidth: 108,
    maxWidth: 150,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  amountText: {
    flexShrink: 1,
    textAlign: 'right',
    fontWeight: Typography.label.fontWeight,
  },
  chevron: {
    marginTop: 0,
    flexShrink: 0,
  },
  addActionButton: {
    minHeight: ControlSize.minimumTouchTarget,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  activityAddButton: {
    width: ControlSize.minimumTouchTarget,
    height: ControlSize.minimumTouchTarget,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetTitleCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: Spacing.sm,
  },
  sheetSubtitle: {
    marginTop: Spacing.xs,
  },
  filterPanel: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    maxHeight: '86%',
  },
  filterScroll: {
    marginTop: Spacing.sm,
  },
  filterScrollContent: {
    paddingBottom: Spacing.md,
  },
  datePresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  datePresetButton: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight:
      ControlSize.minimumTouchTarget,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  datePresetButtonWide: {
    flexBasis: '100%',
  },
  datePresetLabel: {
    flexShrink: 1,
    fontWeight:
      Typography.label.fontWeight,
  },
  customCalendarRange: {
    marginTop: Spacing.xl,
    gap: Spacing.lg,
  },
  calendarFieldGroup: {
    width: '100%',
  },
  calendarFieldLabel: {
    marginBottom: Spacing.sm,
    fontWeight:
      Typography.label.fontWeight,
  },
  calendarField: {
    minHeight:
      ControlSize.minimumTouchTarget,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  calendarFieldValue: {
    flex: 1,
    minWidth: 0,
  },
  calendarPicker: {
    marginTop: Spacing.sm,
  },
  nativeCalendar: {
    width: '100%',
    alignSelf: 'center',
  },
  customDateError: {
    marginTop: -Spacing.sm,
  },
  filterSection: {
    marginTop: Spacing.lg,
  },
  filterSectionTitle: {
    fontWeight: Typography.label.fontWeight,
    marginBottom: Spacing.sm,
  },
  customDateGrid: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterChip: {
    minHeight: ControlSize.minimumTouchTarget,
    borderWidth: 1,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipLabel: {
    fontWeight: Typography.label.fontWeight,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  modalAction: {
    flexGrow: 1,
    flexBasis: 140,
  },
  listFooter: {
    height: Spacing.xl,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  activeFilterChipLabel: {
    flexShrink: 1,
  },
  dateHeaderAmount: {
    flexShrink: 1,
    marginLeft: Spacing.md,
    fontWeight: Typography.label.fontWeight,
  },

});

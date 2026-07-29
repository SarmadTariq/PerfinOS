/**
 * TransactionFormView - shared add/edit form for transactions.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Text } from '../../components/base';
import { CategoryBadge, IconButton, ScreenHeader } from '../../components/finance';
import { Field } from '../../components/form/Field';
import { SelectField } from '../../components/form/SelectField';
import { Segmented } from '../../components/form/Segmented';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { MapCanvas } from '../../components/map/MapCanvas';
import { useFinance } from '../../context/FinanceContext';
import { useColors } from '../../context/ThemeContext';
import { AppData, Category, ReceiptAttachment, Transaction } from '../../models/finance';
import { Radius, Spacing, Typography } from '../../theme/index';
import { todayIso } from '../../utils/format';
import { createClientEntityId } from '../../utils/ids';
import { getTransactionCategoryOptions } from '../../utils/categories';
import { MAX_RECEIPTS_PER_TRANSACTION, MAX_RECEIPT_BYTES, parseMoney, sanitizeMoneyInput, SUPPORTED_RECEIPT_MIME_TYPES } from '../../utils/validation';
import { getCurrentLocation, getLocationSuggestions } from '../../services/locationService';
import {
  createLocalReceiptAttachment,
  deleteReceiptFromWorker,
  receiptUploadConfigured,
  uploadReceiptToWorker,
} from '../../services/receiptService';
import {
  persistedReceiptAttachments,
} from '../../services/receiptPersistence';
import {
  hasPlaceChanged,
  initialPlaceDisclosureOpen,
  limitPlaceSuggestions,
  shouldSearchPlaceSuggestions,
  toLocationPayload,
  toPlaceSelection,
} from './transactionPlaceDisclosure';
import type { PlaceSelection } from './transactionPlaceDisclosure';

type TransactionFormMode = 'add' | 'edit';

const PAYMENT_METHOD_OPTIONS = [
  'Debit card',
  'Credit card',
  'Cash',
  'Bank transfer',
  'Digital wallet',
  'Cheque',
  'Other',
];

const STANDARD_EXPENSE_CATEGORY_NAMES = [
  'Housing',
  'Food & Dining',
  'Transportation',
  'Utilities',
  'Healthcare',
  'Shopping',
  'Entertainment',
  'Travel',
  'Education',
  'Insurance',
  'Taxes',
  'Other',
];

const STANDARD_INCOME_CATEGORY_NAMES = [
  'Salary',
  'Business',
  'Freelance',
  'Investment',
  'Rental Income',
  'Benefits',
  'Other Income',
];

const normalizeName = (value: string) => value.trim().toLowerCase();

const isValidDateInput = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00`).getTime());

const uniqueCategories = (categories: Category[]) => {
  const seen = new Set<string>();

  return categories.filter((category) => {
    if (seen.has(category.id)) {
      return false;
    }

    seen.add(category.id);
    return true;
  });
};

const getVisibleCategories = (
  allCategories: Category[],
  type: 'income' | 'expense',
  selectedCategoryId?: string,
  includeSelectedArchived = false
) => {
  const pool = getTransactionCategoryOptions(
    allCategories,
    type,
    selectedCategoryId,
    includeSelectedArchived
  );
  const standardNames = type === 'income' ? STANDARD_INCOME_CATEGORY_NAMES : STANDARD_EXPENSE_CATEGORY_NAMES;
  const selectedCategory = selectedCategoryId
    ? pool.find((category) => category.id === selectedCategoryId)
    : undefined;

  const standardCategories = standardNames
    .map((name) => pool.find((category) => normalizeName(category.name) === normalizeName(name)))
    .filter(Boolean) as Category[];

  const userCreatedCategories = pool.filter((category) => !category.isDefault);
  const fallbackCategories = standardCategories.length ? [] : pool.slice(0, 8);

  return uniqueCategories([
    ...(selectedCategory ? [selectedCategory] : []),
    ...standardCategories,
    ...userCreatedCategories,
    ...fallbackCategories,
  ]);
};

const buildPreviewTransaction = ({
  selectedPlace,
  selectedCategory,
  type,
  amount,
  merchant,
  date,
  userId,
}: {
  selectedPlace: PlaceSelection;
  selectedCategory?: Category;
  type: 'income' | 'expense';
  amount: number;
  merchant: string;
  date: string;
  userId: string;
}): Transaction => ({
  id: 'form-location-preview',
  userId,
  type,
  amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
  categoryId: selectedCategory?.id || 'preview-category',
  categoryName: selectedCategory?.name || (type === 'income' ? 'Income' : 'Expense'),
  merchant: merchant.trim() || selectedPlace.name || 'Selected place',
  date,
  notes: '',
  location: {
    placeId: selectedPlace.placeId,
    name: selectedPlace.name || selectedPlace.address,
    formattedAddress: selectedPlace.formattedAddress || selectedPlace.address,
    latitude: selectedPlace.latitude,
    longitude: selectedPlace.longitude,
    address: selectedPlace.formattedAddress || selectedPlace.address,
    neighborhood: selectedPlace.neighborhood || selectedPlace.name,
    source:
      selectedPlace.source ||
      (selectedPlace.placeId
        ? 'google_place'
        : 'current_location'),
    placeType: selectedPlace.placeType,
  },
  paymentMethod: 'Preview',
  isRecurring: false,
  receipts: [],
  updateCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  subtitle: string;
}) => {
  const colors = useColors();

  return (
    <View style={styles.sectionHeader}>
      <MaterialIcons
        name={icon}
        size={20}
        color={colors.textSecondary}
      />

      <View style={styles.sectionHeaderCopy}>
        <Text variant="h4">{title}</Text>

        <Text
          variant="bodySmall"
          color="secondary"
          style={{ marginTop: Spacing.xs }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
};

const DateField = ({
  date,
  setDate,
  showDatePicker,
  setShowDatePicker,
}: {
  date: string;
  setDate: (date: string) => void;
  showDatePicker: boolean;
  setShowDatePicker: (visible: boolean) => void;
}) => {
  const colors = useColors();

  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text variant="bodySmall" style={styles.label}>
        Date
      </Text>

      {Platform.OS === 'web' ? (
        <input
          type="date"
          value={date}
          onChange={(event: any) => setDate(event.target.value)}
          onKeyDown={(event: any) => event.preventDefault()}
          style={
            {
              width: '100%',
              padding: '13px 16px',
              fontSize: 16,
              borderRadius: 12,
              border: `1px solid ${colors.borderDefault}`,
              backgroundColor: colors.backgroundSurface,
              color: colors.textPrimary,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              cursor: 'pointer',
            } as any
          }
        />
      ) : (
        <>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Select transaction date"
            onPress={() => setShowDatePicker(true)}
            style={[styles.dateButton, { borderColor: colors.borderDefault, backgroundColor: colors.backgroundSurface }]}
          >
            <Text variant="body" style={{ color: colors.textPrimary }}>
              {date}
            </Text>
            <MaterialIcons name="calendar-today" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {showDatePicker ? (
            <DateTimePicker
              value={new Date(date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_event: any, selectedDate?: Date) => {
                if (selectedDate) {
                  setDate(selectedDate.toISOString().split('T')[0]);
                }

                setShowDatePicker(false);
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
};

const CategorySelector = ({
  categories,
  selectedCategoryId,
  onSelect,
  onCreateCategory,
}: {
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  onCreateCategory: () => void;
}) => {
  const colors = useColors();

  return (
    <View>
      <Text variant="bodySmall" style={styles.label}>
        Category
      </Text>

      <View style={styles.categoryGrid}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => onSelect(category.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: category.id === selectedCategoryId }}
            accessibilityLabel={`Select ${category.name} category`}
            style={styles.categoryTapTarget}
          >
            <CategoryBadge
              label={category.name}
              icon={category.icon}
              color={category.color}
              selected={category.id === selectedCategoryId}
            />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={onCreateCategory}
          accessibilityRole="button"
          accessibilityLabel="Add custom category"
          style={[styles.addCategoryChip, { borderColor: colors.borderDefault, backgroundColor: colors.backgroundSurface }]}
        >
          <MaterialIcons name="add" size={14} color={colors.textSecondary} />
          <Text variant="caption" color="secondary" style={{ marginLeft: 3 }}>
            New
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const LocationSection = ({
  data,
  selectedPlace,
  isChangingPlace,
  selectedCategory,
  type,
  amount,
  merchant,
  date,
  placeQuery,
  setPlaceQuery,
  selectedSuggestions,
  onSelectPlace,
  onUseCurrentLocation,
  onChangeLocation,
  onCancelChange,
  onClearLocation,
}: {
  data: AppData;
  selectedPlace: PlaceSelection | null;
  isChangingPlace: boolean;
  selectedCategory?: Category;
  type: 'income' | 'expense';
  amount: string;
  merchant: string;
  date: string;
  placeQuery: string;
  setPlaceQuery: (value: string) => void;
  selectedSuggestions: PlaceSelection[];
  onSelectPlace: (place: PlaceSelection) => void;
  onUseCurrentLocation: () => void;
  onChangeLocation: () => void;
  onCancelChange: () => void;
  onClearLocation: () => void;
}) => {
  const colors = useColors();
  const parsedAmount = Number.parseFloat(amount);
  const showSearch = !selectedPlace || isChangingPlace;
  const previewTransaction = selectedPlace && !isChangingPlace
    ? buildPreviewTransaction({
      selectedPlace,
      selectedCategory,
      type,
      amount: parsedAmount,
      merchant,
      date,
      userId: data.user.id,
    })
    : null;

  return (
    <Card style={styles.sectionCard}>
      <SectionHeader
        icon="place"
        title="Place"
        subtitle="Optional. Add a place for Map review and neighborhood context."
      />

      {showSearch ? (
        <>
          <Field
            label="Place search"
            value={placeQuery}
            onChangeText={setPlaceQuery}
            placeholder="Search business, store, address, or area"
          />

          {selectedSuggestions.length > 0 ? (
            <View style={styles.suggestionList}>
              {selectedSuggestions.map((location) => (
                <TouchableOpacity
                  key={`${location.placeId || location.address}-${location.latitude}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${location.name}, ${location.formattedAddress || location.address}`}
                  onPress={() => onSelectPlace(location)}
                  style={[styles.suggestionRow, { borderColor: colors.borderDefault, backgroundColor: colors.backgroundSurface }]}
                >
                  <View style={[styles.suggestionIcon, { backgroundColor: colors.actionPrimarySoft }]}>
                    <MaterialIcons name="place" size={17} color={colors.actionPrimary} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '800' }} numberOfLines={1}>
                      {location.name}
                    </Text>
                    <Text variant="caption" color="secondary" numberOfLines={2} style={{ marginTop: Spacing.xs }}>
                      {location.formattedAddress || location.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <Button
            label="Use current location"
            variant="secondary"
            onPress={onUseCurrentLocation}
          />

          {isChangingPlace ? (
            <Button
              label="Cancel change"
              variant="secondary"
              onPress={onCancelChange}
              style={{ marginTop: Spacing.sm }}
            />
          ) : null}
        </>
      ) : selectedPlace ? (
        <>
          <View
            style={[
              styles.selectedPlaceBox,
              {
                borderColor: colors.borderDefault,
                backgroundColor: colors.backgroundSurface,
              },
            ]}
          >
            <View style={[styles.suggestionIcon, { backgroundColor: colors.actionPrimarySoft }]}>
              <MaterialIcons
                name="check-circle"
                size={18}
                color={colors.actionPrimary}
              />
            </View>

            <View style={styles.selectedPlaceCopy}>
              <Text
                variant="body"
                style={{ fontWeight: '800' }}
                numberOfLines={1}
              >
                {selectedPlace.name ||
                  selectedPlace.formattedAddress ||
                  selectedPlace.address}
              </Text>

              <Text
                variant="caption"
                color="secondary"
                numberOfLines={2}
                style={{ marginTop: Spacing.xs }}
              >
                {selectedPlace.formattedAddress ||
                  selectedPlace.address}
              </Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <Button
              label="Change"
              variant="secondary"
              onPress={onChangeLocation}
              style={{ flex: 1 }}
            />

            <Button
              label="Remove"
              variant="secondary"
              onPress={onClearLocation}
              style={{ flex: 1 }}
            />
          </View>
        </>
      ) : null}

      {previewTransaction ? (
        <View style={[styles.mapFrame, { borderColor: colors.borderDefault, backgroundColor: colors.backgroundSurface }]}>
          <MapCanvas
            transactions={[previewTransaction]}
            categories={data.categories}
            selectedId={previewTransaction.id}
            onSelect={() => undefined}
            mode="pins"
            currency={data.user.currency}
            showsUserLocation={false}
            style={styles.mapPreview}
          />
        </View>
      ) : null}
    </Card>
  );
};

const ReceiptsSection = ({
  receipts,
  receiptsEnabled,
  receiptBackendReady,
  onPickReceipts,
  onRemoveReceipt,
}: {
  receipts: ReceiptAttachment[];
  receiptsEnabled: boolean;
  receiptBackendReady: boolean;
  onPickReceipts: () => void;
  onRemoveReceipt: (receiptId: string) => void;
}) => {
  const colors = useColors();

  return (
    <Card style={styles.sectionCard}>
      <SectionHeader
        icon="receipt-long"
        title="Receipts"
        subtitle="Attach proof to keep the transaction record complete."
      />

      <View style={[styles.receiptStatusBox, { borderColor: colors.borderDefault, backgroundColor: colors.backgroundSurface }]}>
        <MaterialIcons
          name={receiptsEnabled ? 'cloud-upload' : 'lock-outline'}
          size={22}
          color={receiptsEnabled ? colors.actionPrimary : colors.textMuted}
        />

        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ fontWeight: '800' }}>
            {receipts.length ? `${receipts.length} receipt${receipts.length === 1 ? '' : 's'} attached` : 'No receipts attached'}
          </Text>
          <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
            {receiptsEnabled
              ? receiptBackendReady
                ? `Attach up to ${MAX_RECEIPTS_PER_TRANSACTION} receipt or payment images.`
                : 'Receipt uploads are unavailable until the secured backend is configured.'
              : 'Receipt uploads require a signed-in account.'}
          </Text>
        </View>
      </View>

      {receipts.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.receiptScroller}>
          {receipts.map((receipt) => (
            <View key={receipt.id} style={[styles.receiptPreview, { borderColor: colors.borderDefault, backgroundColor: colors.backgroundSurface }]}>
              {receipt.localUri ? (
                <Image source={{ uri: receipt.localUri }} style={styles.receiptImage} />
              ) : (
                <MaterialIcons name="receipt" size={30} color={colors.actionPrimary} />
              )}

              <Text variant="caption" numberOfLines={1}>
                {receipt.fileName}
              </Text>

              <Text variant="caption" color="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
                {receipt.status}
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Remove ${receipt.fileName}`}
                onPress={() => onRemoveReceipt(receipt.id)}
                style={[
                  styles.receiptRemove,
                  {
                    backgroundColor:
                      colors.statusCritical,
                  },
                ]}
              >
                <MaterialIcons name="close" size={16} color={colors.textInverse} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <Button
        label={
          !receiptsEnabled
            ? 'Login to Add Receipts'
            : receiptBackendReady
              ? 'Add Receipt Images'
              : 'Receipt Upload Unavailable'
        }
        variant="secondary"
        onPress={onPickReceipts}
        disabled={
          !receiptsEnabled ||
          !receiptBackendReady ||
          receipts.length >=
            MAX_RECEIPTS_PER_TRANSACTION
        }
        style={{ marginTop: Spacing.md }}
      />
    </Card>
  );
};

const SavePanel = ({
  mode,
  existingUpdateCount,
  editLocked,
  formValid,
  error,
  isSubmitting,
  bottomInset,
  onSubmit,
}: {
  mode: TransactionFormMode;
  existingUpdateCount: number;
  editLocked: boolean;
  formValid: boolean;
  error: string | null;
  isSubmitting: boolean;
  bottomInset: number;
  onSubmit: () => void;
}) => {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isNarrow = width < 600;
  const remainingEdits = Math.max(0, 2 - existingUpdateCount);

  return (
    <View
      style={[
        styles.savePanel,
        {
          backgroundColor: colors.backgroundElevated,
          borderTopColor: colors.borderDefault,
          paddingBottom: Math.max(bottomInset, Spacing.md),
        },
      ]}
    >
      <View
        style={[
          styles.savePanelContent,
          isNarrow && {
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: Spacing.sm,
          },
        ]}
      >
        <View style={styles.savePanelCopy}>
          <Text variant="bodySmall" style={styles.savePanelTitle}>
            {editLocked
              ? 'Editing unavailable'
              : mode === 'edit'
                ? 'Save changes'
                : 'Add transaction'}
          </Text>

          <Text
            variant="caption"
            color={editLocked ? 'danger' : 'secondary'}
            numberOfLines={2}
            style={{ marginTop: 2 }}
          >
            {editLocked
              ? 'This transaction has reached its edit limit.'
              : error
                ? error
                : mode === 'edit'
                  ? `${remainingEdits} ${remainingEdits === 1 ? 'edit' : 'edits'} remaining after this save`
                  : 'Amount, merchant or source, date, and category are required.'}
          </Text>
        </View>

        <Button
          label={mode === 'edit' ? 'Save Changes' : 'Add Transaction'}
          onPress={onSubmit}
          disabled={!formValid}
          loading={isSubmitting}
          size="lg"
          style={
            isNarrow
              ? {
                  ...styles.saveButton,
                  width: '100%',
                  minWidth: 0,
                }
              : styles.saveButton
          }
        />
      </View>
    </View>
  );
};

const TransactionFormContent = ({ data, mode }: { data: AppData; mode: TransactionFormMode }) => {
  const colors = useColors()
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, { transactionId?: string }>, string>>();
  const insets = useSafeAreaInsets();
  const { addTransaction, updateTransaction, canUseFeature, isGuest } = useFinance();

  const existing = data.transactions.find((item) => item.id === route.params?.transactionId);
  const transactionIdRef = useRef(
    existing?.id ||
    createClientEntityId('tx')
  );
  const transactionPersistedRef = useRef(
    mode === 'edit' && !!existing
  );

  const initialType = existing?.type || 'expense';
  const initialCategories = getVisibleCategories(data.categories, initialType, existing?.categoryId, !!existing);
  const initialPlace = toPlaceSelection(existing?.location);

  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId || initialCategories[0]?.id || ''
  );
  const [merchant, setMerchant] = useState(existing?.merchant || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(existing?.date || todayIso());
  const [notes, setNotes] = useState(existing?.notes || '');
  const [placeQuery, setPlaceQuery] = useState(
    initialPlace?.name ||
    initialPlace?.formattedAddress ||
    initialPlace?.address ||
    ''
  );
  const [selectedPlace, setSelectedPlace] = useState<PlaceSelection | null>(initialPlace);
  const [showPlaceDisclosure, setShowPlaceDisclosure] = useState(
    initialPlaceDisclosureOpen(
      mode,
      existing?.location
    )
  );
  const [isChangingPlace, setIsChangingPlace] = useState(false);
  const [hasEditedPlaceQuery, setHasEditedPlaceQuery] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(existing?.paymentMethod || 'Debit card');
  const [isRecurring, setRecurring] = useState(existing?.isRecurring || false);
  const [error, setError] = useState<string | null>(null);
  const [remoteLocations, setRemoteLocations] = useState<PlaceSelection[]>([]);
  const [receipts, setReceipts] = useState<ReceiptAttachment[]>(existing?.receipts || []);
  const [showOptionalDetails, setShowOptionalDetails] = useState(
    mode === 'edit' &&
      Boolean(
        existing?.isRecurring ||
        existing?.notes ||
        existing?.receipts.length
      )
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const receiptsEnabled = canUseFeature('receiptUploads') && !isGuest;
  const receiptBackendReady = receiptUploadConfigured();
  const categories = getVisibleCategories(data.categories, type, categoryId, mode === 'edit');
  const selected = data.categories.find((category) => category.id === categoryId) || categories[0];
  const editLocked = mode === 'edit' && !!existing && existing.updateCount >= 2;
  const amountError = amount && !/^\d+(\.\d{0,2})?$/.test(amount) ? 'Use numbers with up to 2 decimals' : undefined;
  const formValid =
    !!amount &&
    !amountError &&
    !!selected &&
    !!merchant.trim() &&
    isValidDateInput(date) &&
    !editLocked &&
    !isSubmitting;

  const isDirty = existing
    ? type !== existing.type ||
      amount !== String(existing.amount) ||
      categoryId !== existing.categoryId ||
      merchant !== existing.merchant ||
      date !== existing.date ||
      notes !== existing.notes ||
      paymentMethod !== existing.paymentMethod ||
      isRecurring !== existing.isRecurring ||
      receipts.length !== existing.receipts.length ||
      hasPlaceChanged(
        existing.location,
        selectedPlace
      )
    : Boolean(
      amount ||
      merchant.trim() ||
      notes.trim() ||
      selectedPlace ||
      receipts.length ||
      isRecurring ||
      type !== 'expense' ||
      paymentMethod !== 'Debit card' ||
      date !== todayIso()
    );

  const optionalSummary = [
    isRecurring ? 'Recurring' : null,
     receipts.length
      ? `${receipts.length} ${receipts.length === 1 ? 'receipt' : 'receipts'}`
      : null,
    notes.trim() ? 'Notes added' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleExit = () => {
    if (!isDirty) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      'Discard changes?',
      'Your unsaved transaction changes will be lost.',
      [
        {
          text: 'Keep editing',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const addressSuggestions = useMemo(
    () => limitPlaceSuggestions(remoteLocations),
    [remoteLocations]
  );

  const useDeviceLocation = async () => {
    try {
      const location = await getCurrentLocation();
      const current: PlaceSelection = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        formattedAddress: location.formattedAddress,
        name: location.name || 'Current location',
        neighborhood: location.address.split(',')[0] || 'Current location',
        source: 'current_location',
      };

      setSelectedPlace(current);
      setPlaceQuery(current.name);
      setRemoteLocations([]);
      setIsChangingPlace(false);
      setHasEditedPlaceQuery(false);
    } catch (err: any) {
      setError(
        err.message ||
        'Could not access your location. Search manually or save without a place.'
      );
    }
  };

  useEffect(() => {
    const query = placeQuery.trim();

    if (
      !shouldSearchPlaceSuggestions({
        isDisclosureOpen: showPlaceDisclosure,
        hasActiveSelection:
          Boolean(selectedPlace) &&
          !isChangingPlace,
        hasEditedQuery: hasEditedPlaceQuery,
        query,
      })
    ) {
      setRemoteLocations([]);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      const suggestions = await getLocationSuggestions(query);

      if (active) {
        setRemoteLocations(
          suggestions.map((location) => ({
            ...location,
            name: location.name || location.address.split(',')[0] || location.address,
            formattedAddress: location.formattedAddress || location.address,
            neighborhood: location.address.split(',')[0] || location.address,
          }))
        );
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    hasEditedPlaceQuery,
    isChangingPlace,
    placeQuery,
    selectedPlace,
    showPlaceDisclosure,
  ]);

  const applyLocation = (location: PlaceSelection) => {
    setSelectedPlace(location);
    setPlaceQuery(location.name || location.formattedAddress || location.address);
    setRemoteLocations([]);
    setIsChangingPlace(false);
    setHasEditedPlaceQuery(false);
  };

  const updatePlaceSearch = (value: string) => {
    setPlaceQuery(value);
    setRemoteLocations([]);
    setHasEditedPlaceQuery(true);
  };

  const changePlace = () => {
    if (!selectedPlace) {
      return;
    }

    setPlaceQuery(
      selectedPlace.name ||
      selectedPlace.formattedAddress ||
      selectedPlace.address
    );
    setRemoteLocations([]);
    setIsChangingPlace(true);
    setHasEditedPlaceQuery(false);
  };

  const cancelPlaceChange = () => {
    setPlaceQuery(
      selectedPlace?.name ||
      selectedPlace?.formattedAddress ||
      selectedPlace?.address ||
      ''
    );
    setRemoteLocations([]);
    setIsChangingPlace(false);
    setHasEditedPlaceQuery(false);
  };

  const clearPlace = () => {
    setSelectedPlace(null);
    setPlaceQuery('');
    setRemoteLocations([]);
    setIsChangingPlace(false);
    setHasEditedPlaceQuery(false);
  };

  const togglePlaceDisclosure = () => {
    const next = !showPlaceDisclosure;

    if (!next) {
      setPlaceQuery(
        selectedPlace?.name ||
        selectedPlace?.formattedAddress ||
        selectedPlace?.address ||
        ''
      );
      setRemoteLocations([]);
      setIsChangingPlace(false);
      setHasEditedPlaceQuery(false);
    }

    setShowPlaceDisclosure(next);
  };

  const updateAmount = (value: string) => {
    setAmount(sanitizeMoneyInput(value));
  };

  const pickReceipts = async () => {
    if (!receiptsEnabled) {
      setError('Create or sign in to an account to upload receipt images.');
      return;
    }

    if (!receiptBackendReady) {
      setError(
        'Receipt uploads are unavailable until the secured backend is configured.'
      );
      return;
    }

    if (receipts.length >= MAX_RECEIPTS_PER_TRANSACTION) {
      setError(`Attach up to ${MAX_RECEIPTS_PER_TRANSACTION} receipt images per transaction.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.82,
      selectionLimit: MAX_RECEIPTS_PER_TRANSACTION - receipts.length,
    });

    if (result.canceled) {
      return;
    }

    const nextReceipts = result.assets.map(createLocalReceiptAttachment);
    const invalid = nextReceipts.find(
      (receipt) => !SUPPORTED_RECEIPT_MIME_TYPES.includes(receipt.mimeType) || receipt.sizeBytes > MAX_RECEIPT_BYTES
    );

    if (invalid) {
      setError('Receipts must be JPG, PNG, HEIC, or HEIF images and 5 MB or smaller.');
      return;
    }

    setReceipts((current) => [...current, ...nextReceipts].slice(0, MAX_RECEIPTS_PER_TRANSACTION));

  };

  const removeReceipt = (receiptId: string) => {
    setReceipts((current) => current.filter((receipt) => receipt.id !== receiptId));
  };

  const submit = async () => {
    if (!formValid || isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const parsedAmount = parseMoney(amount);

      const locationPayload =
        toLocationPayload(selectedPlace);

      const transactionId =
        transactionIdRef.current;
      const remoteReceipts =
        persistedReceiptAttachments(
          receipts
        );
      const payload = {
        type,
        amount: parsedAmount,
        categoryId: selected?.id || categoryId,
        categoryName: selected?.name || '',
        merchant: merchant.trim(),
        date,
        notes: notes.trim(),
        location: locationPayload,
        paymentMethod,
        isRecurring,
        receipts: remoteReceipts,
      };

      if (transactionPersistedRef.current) {
        await updateTransaction(transactionId, payload);
      } else {
        await addTransaction({
          ...payload,
          id: transactionId,
        });
        transactionPersistedRef.current = true;
      }

      const pendingReceipts = receipts.filter(
        (receipt) =>
          receipt.status === 'local' &&
          receipt.localUri
      );

      if (
        pendingReceipts.length &&
        receiptsEnabled &&
        receiptBackendReady
      ) {
        const uploaded = await Promise.all(
          pendingReceipts.map(
            (receipt) =>
              uploadReceiptToWorker(
                transactionId,
                receipt
              )
          )
        );
        const uploadedRemote =
          persistedReceiptAttachments(
            [
              ...remoteReceipts,
              ...uploaded,
            ]
          );

        await updateTransaction(
          transactionId,
          {
            receipts: uploadedRemote,
          }
        );

        const failedUploads =
          uploaded.filter(
            (receipt) =>
              receipt.status === 'error'
          );

        if (failedUploads.length) {
          setReceipts([
            ...uploadedRemote,
            ...failedUploads,
          ]);
          throw new Error(
            failedUploads[0].error ||
            'A receipt upload failed'
          );
        }
      }

      const removedRemoteReceipts =
        (existing?.receipts || [])
          .filter(
            (receipt) =>
              receipt.status === 'uploaded' &&
              !receipts.some(
                (candidate) =>
                  candidate.id === receipt.id
              )
          );
      const cleanupResults =
        await Promise.allSettled(
          removedRemoteReceipts.map(
            (receipt) =>
              deleteReceiptFromWorker(
                transactionId,
                receipt
              )
          )
        );

      if (
        cleanupResults.some(
          (result) =>
            result.status === 'rejected'
        )
      ) {
        throw new Error(
          'The transaction was saved, but one removed receipt still needs storage cleanup'
        );
      }

      if (mode === 'edit' && existing) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs', {
          screen: 'Transactions',
        });
      }
    } catch (err: any) {
      setError(
        err.message ||
        'Could not save transaction'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.screen}>
        <AppScroll>
          <View style={styles.leadingHeader}>
            <IconButton
              icon="arrow-back"
              label={
                mode === 'edit'
                  ? 'Return to transaction details'
                  : 'Return to Activity'
              }
              onPress={handleExit}
            />

            <Text variant="bodySmall" color="secondary">
              {mode === 'edit'
                ? 'Transaction details'
                : 'Activity'}
            </Text>
          </View>

          <ScreenHeader
            title={
              mode === 'edit'
                ? 'Edit transaction'
                : 'Add transaction'
            }
            subtitle={
              mode === 'edit'
                ? 'Update the financial record while preserving its history.'
                : 'Record the money movement first. Add supporting details only when useful.'
            }
          />

          {mode === 'edit' && existing ? (
            <View
              style={[
                styles.editContext,
                {
                  backgroundColor: colors.backgroundSurface,
                  borderColor: colors.borderDefault,
                },
              ]}
            >
              <MaterialIcons
                name="history"
                size={18}
                color={colors.textSecondary}
              />

              <View style={styles.sectionHeaderCopy}>
                <Text variant="bodySmall" style={styles.savePanelTitle}>
                  Financial history protected
                </Text>

                <Text
                  variant="caption"
                  color="secondary"
                  style={{ marginTop: 2 }}
                >
                  {existing.updateCount}/2 edits used
                </Text>
              </View>
            </View>
          ) : null}

          <Card style={styles.amountSectionCard}>
            <Text
              variant="caption"
              color="secondary"
              style={styles.eyebrow}
            >
              AMOUNT
            </Text>

            <Field
              label={`Amount (${data.user.currency})`}
              value={amount}
              onChangeText={updateAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={amountError}
            />

            <Text
              variant="bodySmall"
              style={styles.fieldGroupLabel}
            >
              Transaction type
            </Text>

            <Segmented
              options={['expense', 'income']}
              value={type}
              onChange={(value) => {
                const nextType =
                  value as 'income' | 'expense';
                const nextCategories =
                  getVisibleCategories(
                    data.categories,
                    nextType
                  );

                setType(nextType);
                setCategoryId(
                  nextCategories[0]?.id || ''
                );
              }}
            />
          </Card>

          <Card style={styles.sectionCard}>
            <SectionHeader
              icon="subject"
              title="Transaction details"
              subtitle="Identify the money movement and when it happened."
            />

            <Field
              label={
                type === 'income'
                  ? 'Income source'
                  : 'Merchant or payee'
              }
              value={merchant}
              onChangeText={setMerchant}
              placeholder={
                type === 'income'
                  ? 'Employer, client, account, or source'
                  : 'Business, person, vendor, or payee'
              }
            />

            <DateField
              date={date}
              setDate={setDate}
              showDatePicker={showDatePicker}
              setShowDatePicker={setShowDatePicker}
            />
          </Card>

          <Card style={styles.sectionCard}>
            <SectionHeader
              icon="category"
              title="Classification"
              subtitle="Organize the transaction for later review and reporting."
            />

            <CategorySelector
              categories={categories}
              selectedCategoryId={categoryId}
              onSelect={setCategoryId}
              onCreateCategory={() =>
                navigation.navigate('Categories')
              }
            />

            <SelectField
              label="Payment method"
              value={paymentMethod}
              options={PAYMENT_METHOD_OPTIONS}
              onChange={setPaymentMethod}
            />
          </Card>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              showPlaceDisclosure
                ? 'Hide Place details'
                : selectedPlace
                  ? 'Show selected Place details'
                  : 'Add a place'
            }
            accessibilityHint="Place is optional and supports Map review and neighborhood context."
            accessibilityState={{
              expanded: showPlaceDisclosure,
            }}
            aria-expanded={showPlaceDisclosure}
            activeOpacity={0.76}
            onPress={togglePlaceDisclosure}
            style={[
              styles.optionalDisclosure,
              {
                backgroundColor: colors.backgroundElevated,
                borderColor: colors.borderDefault,
              },
            ]}
          >
            <View style={styles.optionalDisclosureIcon}>
              <MaterialIcons
                name={
                  selectedPlace
                    ? 'where-to-vote'
                    : 'add-location-alt'
                }
                size={20}
                color={colors.textSecondary}
              />
            </View>

            <View style={styles.optionalDisclosureCopy}>
              <Text variant="h4">
                {selectedPlace
                  ? 'Place added'
                  : 'Add a place'}
              </Text>

              <Text
                variant="bodySmall"
                color="secondary"
                numberOfLines={2}
                style={{ marginTop: Spacing.xs }}
              >
                {selectedPlace
                  ? selectedPlace.name ||
                    selectedPlace.formattedAddress ||
                    selectedPlace.address
                  : 'Optional. Supports Map review and neighborhood context.'}
              </Text>
            </View>

            <MaterialIcons
              name={
                showPlaceDisclosure
                  ? 'expand-less'
                  : 'expand-more'
              }
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showPlaceDisclosure ? (
            <LocationSection
              data={data}
              selectedPlace={selectedPlace}
              isChangingPlace={isChangingPlace}
              selectedCategory={selected}
              type={type}
              amount={amount}
              merchant={merchant}
              date={date}
              placeQuery={placeQuery}
              setPlaceQuery={updatePlaceSearch}
              selectedSuggestions={
                addressSuggestions
              }
              onSelectPlace={applyLocation}
              onUseCurrentLocation={
                useDeviceLocation
              }
              onChangeLocation={changePlace}
              onCancelChange={cancelPlaceChange}
              onClearLocation={clearPlace}
            />
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              showOptionalDetails
                ? 'Hide optional transaction details'
                : 'Show optional transaction details'
            }
            accessibilityState={{
              expanded: showOptionalDetails,
            }}
            activeOpacity={0.76}
            onPress={() =>
              setShowOptionalDetails(
                (current) => !current
              )
            }
            style={[
              styles.optionalDisclosure,
              {
                backgroundColor: colors.backgroundElevated,
                borderColor: colors.borderDefault,
              },
            ]}
          >
            <View style={styles.optionalDisclosureIcon}>
              <MaterialIcons
                name="tune"
                size={20}
                color={colors.textSecondary}
              />
            </View>

            <View style={styles.optionalDisclosureCopy}>
              <Text variant="h4">Optional details</Text>

              <Text
                variant="bodySmall"
                color="secondary"
                numberOfLines={2}
                style={{ marginTop: Spacing.xs }}
              >
                {optionalSummary ||
                  'Recurring status, receipts, and notes'}
              </Text>
            </View>

            <MaterialIcons
              name={
                showOptionalDetails
                  ? 'expand-less'
                  : 'expand-more'
              }
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showOptionalDetails ? (
            <View style={styles.optionalSection}>
              <Card style={styles.sectionCard}>
                <SectionHeader
                  icon="repeat"
                  title="Recurring"
                  subtitle="Use this only when the transaction follows a predictable schedule."
                />

                <View
                  style={[
                    styles.recurringBox,
                    {
                      borderColor: colors.borderDefault,
                      backgroundColor:
                        colors.backgroundSurface,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="body"
                      style={styles.savePanelTitle}
                    >
                      Repeats regularly
                    </Text>

                    <Text
                      variant="bodySmall"
                      color="secondary"
                      style={{
                        marginTop: Spacing.xs,
                      }}
                    >
                      This marks the activity as recurring.
                    </Text>
                  </View>

                  <Switch
                    value={isRecurring}
                    onValueChange={setRecurring}
                  />
                </View>
              </Card>

              <ReceiptsSection
                receipts={receipts}
                receiptsEnabled={receiptsEnabled}
                receiptBackendReady={
                  receiptBackendReady
                }
                onPickReceipts={pickReceipts}
                onRemoveReceipt={removeReceipt}
              />

              <Card style={styles.sectionCard}>
                <SectionHeader
                  icon="notes"
                  title="Notes"
                  subtitle="Add context that will help during a future review."
                />

                <Field
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional context"
                />
              </Card>
            </View>
          ) : null}

          {editLocked ? (
            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: colors.backgroundSurface,
                  borderColor: colors.statusCritical,
                },
              ]}
            >
              <MaterialIcons
                name="lock-outline"
                size={20}
                color={colors.statusCritical}
              />

              <View style={styles.sectionHeaderCopy}>
                <Text
                  variant="bodySmall"
                  color="danger"
                  style={styles.savePanelTitle}
                >
                  Edit limit reached
                </Text>

                <Text
                  variant="caption"
                  color="danger"
                  style={{ marginTop: 2 }}
                >
                  This record can still be reviewed, but it can no longer be changed.
                </Text>
              </View>
            </View>
          ) : null}
        </AppScroll>

        <SavePanel
          mode={mode}
          existingUpdateCount={
            existing?.updateCount || 0
          }
          editLocked={editLocked}
          formValid={formValid}
          error={error}
          isSubmitting={isSubmitting}
          bottomInset={insets.bottom}
          onSubmit={submit}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const TransactionForm = ({ mode }: { mode: TransactionFormMode }) => (
  <RequireData>
    {(data) => <TransactionFormContent data={data} mode={mode} />}
  </RequireData>
);

export const AddTransactionScreen = () => <TransactionForm mode="add" />;
export const EditTransactionScreen = () => <TransactionForm mode="edit" />;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  leadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  editContext: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  amountSectionCard: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  eyebrow: {
    fontWeight: Typography.label.fontWeight,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  fieldGroupLabel: {
    fontWeight: Typography.label.fontWeight,
    marginBottom: Spacing.sm,
  },
  optionalDisclosure: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  optionalDisclosureIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalDisclosureCopy: {
    flex: 1,
    minWidth: 0,
  },
  optionalSection: {
    marginBottom: Spacing.md,
  },
  warningBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryTapTarget: {
    alignSelf: 'flex-start',
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  recurringBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  suggestionList: {
    gap: Spacing.sm,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  suggestionRow: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPlaceBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  selectedPlaceCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  mapFrame: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    minHeight: 156,
  },
  mapPreview: {
    height: 156,
    minHeight: 156,
  },
  receiptStatusBox: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  receiptScroller: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  receiptPreview: {
    width: 104,
    minHeight: 126,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  receiptImage: {
    width: 84,
    height: 84,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  receiptRemove: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePanel: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  savePanelContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  savePanelCopy: {
    flex: 1,
    minWidth: 0,
  },
  savePanelTitle: {
    fontWeight: Typography.label.fontWeight,
  },
  saveButton: {
    minWidth: 152,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
});

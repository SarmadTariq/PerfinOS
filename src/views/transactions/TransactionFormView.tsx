/**
 * TransactionFormView - shared add/edit form for transactions.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  CategoryBadge,
  ErrorState,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { Field } from '../../components/form/Field';
import { SelectField } from '../../components/form/SelectField';
import { Segmented } from '../../components/form/Segmented';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { MapCanvas } from '../../components/map/MapCanvas';
import { useFinance } from '../../context/FinanceContext';
import { useThemeScheme } from '../../context/ThemeContext';
import { AppData, Category, ReceiptAttachment, Transaction } from '../../models/finance';
import { Colors, getThemeColor, Radius, Spacing } from '../../theme';
import { todayIso } from '../../utils/format';
import {
  MAX_RECEIPTS_PER_TRANSACTION,
  MAX_RECEIPT_BYTES,
  parseMoney,
  sanitizeMoneyInput,
  SUPPORTED_RECEIPT_MIME_TYPES,
} from '../../utils/validation';
import { getCurrentLocation, getLocationSuggestions } from '../../services/locationService';
import {
  createLocalReceiptAttachment,
  receiptUploadConfigured,
  uploadReceiptToWorker,
} from '../../services/receiptService';


type TransactionFormMode = 'add' | 'edit';

type LocationOption = {
  latitude: number;
  longitude: number;
  address: string;
  neighborhood?: string;
};

type PlaceOption = LocationOption & {
  name: string;
  formattedAddress: string;
  placeId?: string;
  placeType?: string;
};

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

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

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
  selectedCategoryId?: string
) => {
  const pool = allCategories.filter((category) => category.type === type);
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
  selectedPlace: PlaceOption;
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
    source: selectedPlace.placeId ? 'google_place' : 'current_location',
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
      <View style={[styles.sectionIcon, { backgroundColor: colors.primarySoft }]}>
        <MaterialIcons name={icon} size={18} color={colors.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="h4">{title}</Text>
        <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
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
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bgSecondary,
              color: colors.text,
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
            style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
          >
            <Text variant="body" style={{ color: colors.text }}>
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
          style={[styles.addCategoryChip, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
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
  onClearLocation,
}: {
  data: AppData;
  selectedPlace: PlaceOption | null;
  selectedCategory?: Category;
  type: 'income' | 'expense';
  amount: string;
  merchant: string;
  date: string;
  placeQuery: string;
  setPlaceQuery: (value: string) => void;
  selectedSuggestions: PlaceOption[];
  onSelectPlace: (place: PlaceOption) => void;
  onUseCurrentLocation: () => void;
  onClearLocation: () => void;
}) => {
  const colors = useColors();
  const parsedAmount = Number.parseFloat(amount);
  const previewTransaction = selectedPlace
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
    <Card shadow="sm" style={styles.sectionCard}>
      <SectionHeader
        icon="place"
        title="Location"
        subtitle="Search first, then use the map to confirm the selected place."
      />

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
              onPress={() => onSelectPlace(location)}
              style={[styles.suggestionRow, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
            >
              <View style={[styles.suggestionIcon, { backgroundColor: colors.primarySoft }]}>
                <MaterialIcons name="place" size={17} color={colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '800' }} numberOfLines={1}>
                  {location.name}
                </Text>
                <Text variant="caption" color="secondary" numberOfLines={1} style={{ marginTop: Spacing.xs }}>
                  {location.formattedAddress || location.address}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {selectedPlace ? (
        <View style={[styles.selectedPlaceBox, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
          <View style={[styles.suggestionIcon, { backgroundColor: colors.primarySoft }]}>
            <MaterialIcons name="check-circle" size={18} color={colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontWeight: '800' }} numberOfLines={1}>
              {selectedPlace.name}
            </Text>
            <Text variant="bodySmall" color="secondary" numberOfLines={2} style={{ marginTop: Spacing.xs }}>
              {selectedPlace.formattedAddress || selectedPlace.address}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <Button label="Use Current Location" variant="secondary" onPress={onUseCurrentLocation} style={{ flex: 1 }} />
        <Button label="Clear" variant="secondary" onPress={onClearLocation} style={{ flex: 0, paddingHorizontal: Spacing.lg }} />
      </View>

      <View style={[styles.mapFrame, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
        {previewTransaction ? (
          <MapCanvas
            transactions={[previewTransaction]}
            categories={data.categories}
            selectedId={previewTransaction.id}
            onSelect={() => undefined}
            mode="pins"
            currency={data.user.currency}
            style={styles.mapPreview}
          />
        ) : (
          <View style={styles.mapEmptyState}>
            <MaterialIcons name="location-searching" size={28} color={colors.textTertiary} />
            <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>
              Search for a place or use current location to preview it on the map.
            </Text>
          </View>
        )}
      </View>
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
    <Card shadow="sm" style={styles.sectionCard}>
      <SectionHeader
        icon="receipt-long"
        title="Receipts"
        subtitle="Attach proof to keep the transaction record complete."
      />

      <View style={[styles.receiptStatusBox, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
        <MaterialIcons
          name={receiptsEnabled ? 'cloud-upload' : 'lock-outline'}
          size={22}
          color={receiptsEnabled ? colors.primary : colors.textTertiary}
        />

        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ fontWeight: '800' }}>
            {receipts.length ? `${receipts.length} receipt${receipts.length === 1 ? '' : 's'} attached` : 'No receipts attached'}
          </Text>
          <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
            {receiptsEnabled
              ? receiptBackendReady
                ? `Attach up to ${MAX_RECEIPTS_PER_TRANSACTION} receipt or payment images.`
                : 'Receipt backend is not configured yet. Images stay as pending placeholders.'
              : 'Receipt uploads require a signed-in account.'}
          </Text>
        </View>
      </View>

      {receipts.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.receiptScroller}>
          {receipts.map((receipt) => (
            <View key={receipt.id} style={[styles.receiptPreview, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
              {receipt.uri ? (
                <Image source={{ uri: receipt.uri }} style={styles.receiptImage} />
              ) : (
                <MaterialIcons name="receipt" size={30} color={colors.primary} />
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
                style={styles.receiptRemove}
              >
                <MaterialIcons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <Button
        label={receiptsEnabled ? 'Add Receipt Images' : 'Login to Add Receipts'}
        variant="secondary"
        onPress={onPickReceipts}
        disabled={!receiptsEnabled || receipts.length >= MAX_RECEIPTS_PER_TRANSACTION}
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
  onSubmit,
}: {
  mode: TransactionFormMode;
  existingUpdateCount: number;
  editLocked: boolean;
  formValid: boolean;
  error: string | null;
  onSubmit: () => void;
}) => {
  const colors = useColors();

  return (
    <Card shadow="sm" style={styles.savePanel}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text variant="h4">{mode === 'edit' ? 'Save changes' : 'Add transaction'}</Text>
          <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
            Edits used: {existingUpdateCount}/2
          </Text>
        </View>

        <View style={[styles.editCountPill, { backgroundColor: colors.primarySoft }]}>
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '800' }}>
            {existingUpdateCount}/2
          </Text>
        </View>
      </View>

      {editLocked ? (
        <ErrorState
          title="Edit limit reached"
          message="PerFin OS allows each expense to be edited at most 2 times to preserve financial history."
        />
      ) : null}

      {error ? (
        <Text color="danger" style={{ marginTop: Spacing.md }}>
          {error}
        </Text>
      ) : null}

      <Button
        label={mode === 'edit' ? 'Save Changes' : 'Add Transaction'}
        onPress={onSubmit}
        disabled={!formValid}
        size="lg"
        style={{ marginTop: Spacing.lg }}
      />
    </Card>
  );
};

const TransactionFormContent = ({ data, mode }: { data: AppData; mode: TransactionFormMode }) => {
  const colors = useColors()
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, { transactionId?: string }>, string>>();
  const { addTransaction, updateTransaction, canUseFeature, isGuest } = useFinance();

  const existing = data.transactions.find((item) => item.id === route.params?.transactionId);

  const initialType = existing?.type || 'expense';
  const initialCategories = getVisibleCategories(data.categories, initialType, existing?.categoryId);

  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [categoryId, setCategoryId] = useState(
    existing?.categoryId || initialCategories[0]?.id || ''
  );
  const [merchant, setMerchant] = useState(existing?.merchant || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(existing?.date || todayIso());
  const [notes, setNotes] = useState(existing?.notes || '');
  const [placeQuery, setPlaceQuery] = useState(existing?.location.name || existing?.location.address || '');
  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(
    existing
      ? {
        latitude: existing.location.latitude,
        longitude: existing.location.longitude,
        address: existing.location.address,
        formattedAddress: existing.location.formattedAddress || existing.location.address,
        name: existing.location.name || existing.merchant,
        neighborhood: existing.location.neighborhood,
        placeId: existing.location.placeId,
        placeType: existing.location.placeType,
      }
      : null
  );
  const [paymentMethod, setPaymentMethod] = useState(existing?.paymentMethod || 'Debit card');
  const [isRecurring, setRecurring] = useState(existing?.isRecurring || false);
  const [error, setError] = useState<string | null>(null);
  const [remoteLocations, setRemoteLocations] = useState<PlaceOption[]>([]);
  const [receipts, setReceipts] = useState<ReceiptAttachment[]>(existing?.receipts || []);

  const receiptsEnabled = canUseFeature('receiptUploads') && !isGuest;
  const receiptBackendReady = receiptUploadConfigured();
  const categories = getVisibleCategories(data.categories, type, categoryId);
  const selected = data.categories.find((category) => category.id === categoryId) || categories[0];
  const editLocked = mode === 'edit' && !!existing && existing.updateCount >= 2;
  const amountError = amount && !/^\d+(\.\d{0,2})?$/.test(amount) ? 'Use numbers with up to 2 decimals' : undefined;
  const formValid = !!amount && !amountError && !!selected && !!merchant.trim() && isValidDateInput(date) && !!selectedPlace && !editLocked;

  const addressSuggestions = useMemo(() => remoteLocations.slice(0, 5), [remoteLocations]);

  const useDeviceLocation = async () => {
    try {
      const location = await getCurrentLocation();
      const current: PlaceOption = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        formattedAddress: location.formattedAddress,
        name: location.name || 'Current location',
        neighborhood: location.address.split(',')[0] || 'Current location',
      };

      setSelectedPlace(current);
      setPlaceQuery(current.name);
    } catch (err: any) {
      setError(err.message || 'Location permission is required or search for a place before saving');
    }
  };

  useEffect(() => {
    if (!existing && !selectedPlace) {
      useDeviceLocation();
    }
  }, []);

  useEffect(() => {
    const query = placeQuery.trim();

    if (query.length < 3) {
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
  }, [placeQuery]);

  const applyLocation = (location: PlaceOption) => {
    setSelectedPlace(location);
    setPlaceQuery(location.name || location.formattedAddress || location.address);
    setRemoteLocations([]);
  };

  const updatePlaceSearch = (value: string) => {
    setPlaceQuery(value);
    setSelectedPlace(null);
  };

  const updateAmount = (value: string) => {
    setAmount(sanitizeMoneyInput(value));
  };

  const pickReceipts = async () => {
    if (!receiptsEnabled) {
      setError('Create or sign in to an account to upload receipt images.');
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

    if (!receiptBackendReady) {
      setError('Receipt upload backend is not configured yet. Images are saved as pending placeholders.');
    }
  };

  const removeReceipt = (receiptId: string) => {
    setReceipts((current) => current.filter((receipt) => receipt.id !== receiptId));
  };

  const submit = async () => {
    try {
      const parsedAmount = parseMoney(amount);

      if (!selectedPlace) {
        throw new Error('Select a location before saving');
      }

      const payload = {
        type,
        amount: parsedAmount,
        categoryId: selected?.id || categoryId,
        categoryName: selected?.name || '',
        merchant: merchant.trim(),
        date,
        notes,
        location: {
          placeId: selectedPlace.placeId,
          name: selectedPlace.name,
          formattedAddress: selectedPlace.formattedAddress || selectedPlace.address,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
          address: selectedPlace.formattedAddress || selectedPlace.address,
          neighborhood: selectedPlace.neighborhood || selectedPlace.name,
          source: selectedPlace.placeId ? 'google_place' as const : 'current_location' as const,
          placeType: selectedPlace.placeType,
        },
        paymentMethod,
        isRecurring,
        receipts,
      };

      if (mode === 'edit' && existing) {
        await updateTransaction(existing.id, payload);
      } else {
        await addTransaction(payload);
      }

      const pendingReceipts = receipts.filter((receipt) => receipt.status === 'local' && receipt.uri);

      if (pendingReceipts.length && receiptsEnabled && receiptBackendReady) {
        Promise.all(pendingReceipts.map(uploadReceiptToWorker)).then((uploaded) => {
          const patched = receipts.map((receipt) => uploaded.find((item) => item.id === receipt.id) || receipt);

          if (mode === 'edit' && existing) {
            updateTransaction(existing.id, { receipts: patched });
          }
        });
      }

      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    } catch (err: any) {
      setError(err.message || 'Could not save transaction');
    }
  };

  return (
    <AppScroll>
      <ScreenHeader
        title={mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}
        subtitle={mode === 'edit' ? 'Update the transaction record without changing its history.' : 'Capture the amount, category, place, and proof.'}
        action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
      />

      <Card shadow="sm" style={styles.sectionCard}>
        <SectionHeader
          icon="edit-note"
          title="Transaction Basics"
          subtitle="Start with the financial event and when it happened."
        />

        <Segmented
          options={['expense', 'income']}
          value={type}
          onChange={(value) => {
            const nextType = value as 'income' | 'expense';
            const nextCategories = getVisibleCategories(data.categories, nextType);

            setType(nextType);
            setCategoryId(nextCategories[0]?.id || '');
            setMerchant('');
          }}
        />

        <Field
          label="Amount"
          value={amount}
          onChangeText={updateAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={amountError}
        />

        <Field
          label={type === 'income' ? 'Income Source' : 'Merchant / Payee'}
          value={merchant}
          onChangeText={setMerchant}
          placeholder={type === 'income' ? 'Employer, client, account, or source' : 'Business, person, vendor, or payee'}
        />

        <DateField
          date={date}
          setDate={setDate}
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
        />
      </Card>

      <Card shadow="sm" style={styles.sectionCard}>
        <SectionHeader
          icon="category"
          title="Classification"
          subtitle="Use standard finance categories or create your own."
        />

        <CategorySelector
          categories={categories}
          selectedCategoryId={categoryId}
          onSelect={setCategoryId}
          onCreateCategory={() => navigation.navigate('Categories')}
        />

        <SelectField
          label="Payment Method"
          value={paymentMethod}
          options={PAYMENT_METHOD_OPTIONS}
          onChange={setPaymentMethod}
        />

        <View style={[{borderColor: useColors().border}, styles.recurringBox, useColors().bgSecondary]}>
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ fontWeight: '800' }}>
              Recurring transaction
            </Text>
            <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
              Mark this if it repeats on a predictable schedule.
            </Text>
          </View>

          <Switch value={isRecurring} onValueChange={setRecurring} />
        </View>
      </Card>

      <LocationSection
        data={data}
        selectedPlace={selectedPlace}
        selectedCategory={selected}
        type={type}
        amount={amount}
        merchant={merchant}
        date={date}
        placeQuery={placeQuery}
        setPlaceQuery={updatePlaceSearch}
        selectedSuggestions={addressSuggestions}
        onSelectPlace={applyLocation}
        onUseCurrentLocation={useDeviceLocation}
        onClearLocation={() => {
          setSelectedPlace(null);
          setPlaceQuery('');
          setRemoteLocations([]);
        }}
      />

      <ReceiptsSection
        receipts={receipts}
        receiptsEnabled={receiptsEnabled}
        receiptBackendReady={receiptBackendReady}
        onPickReceipts={pickReceipts}
        onRemoveReceipt={removeReceipt}
      />

      <Card shadow="sm" style={styles.sectionCard}>
        <SectionHeader
          icon="notes"
          title="Notes"
          subtitle="Optional context for future review."
        />

        <Field
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional context"
        />
      </Card>

      <SavePanel
        mode={mode}
        existingUpdateCount={existing?.updateCount || 0}
        editLocked={editLocked}
        formValid={formValid}
        error={error}
        onSubmit={submit}
      />
    </AppScroll>
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
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
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
    // borderColor: Colors.light.border,
    // backgroundColor: Colors.light.bgSecondary,
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
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  mapFrame: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    minHeight: 220,
  },
  mapPreview: {
    height: 220,
  },
  mapEmptyState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
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
    backgroundColor: Colors.light.danger,
  },
  savePanel: {
    marginBottom: Spacing.xxxl,
  },
  editCountPill: {
    minWidth: 44,
    height: 34,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
});
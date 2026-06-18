/**
 * TransactionFormView — shared add/edit form for transactions.
 * Exports AddTransactionScreen and EditTransactionScreen.
 * Extracted from PerFinOSScreens.tsx (TransactionForm + AddTransactionScreen + EditTransactionScreen).
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
import { Button, Card, Input, Text } from '../../components/base';
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
import { useFinance } from '../../context/FinanceContext';
import { useThemeScheme } from '../../context/ThemeContext';
import { ReceiptAttachment } from '../../models/finance';
import { Colors, Radius, Spacing } from '../../theme';
import { todayIso } from '../../utils/format';
import {
  MAX_RECEIPTS_PER_TRANSACTION,
  MAX_RECEIPT_BYTES,
  parseMoney,
  sanitizeMoneyInput,
  SUPPORTED_RECEIPT_MIME_TYPES,
} from '../../utils/validation';
import { getCurrentLocation, getLocationSuggestions } from '../../services/locationService';
import { createLocalReceiptAttachment, receiptUploadConfigured, uploadReceiptToWorker } from '../../services/receiptService';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

const TORONTO_LOCATION = {
  latitude: 43.6532,
  longitude: -79.3832,
  address: 'Toronto, ON',
  neighborhood: 'Downtown',
};

const LOCATION_OPTIONS = [
  TORONTO_LOCATION,
  { latitude: 43.6629, longitude: -79.3957, address: 'The Annex, Toronto, ON', neighborhood: 'The Annex' },
  { latitude: 43.6548, longitude: -79.4005, address: 'Kensington Market, Toronto, ON', neighborhood: 'Kensington Market' },
  { latitude: 43.6456, longitude: -79.3807, address: 'Union Station, Toronto, ON', neighborhood: 'Downtown' },
  { latitude: 43.6596, longitude: -79.3977, address: 'University of Toronto, Toronto, ON', neighborhood: 'University District' },
  { latitude: 43.6557, longitude: -79.3802, address: 'CF Toronto Eaton Centre, Toronto, ON', neighborhood: 'Downtown' },
  { latitude: 43.6478, longitude: -79.3958, address: 'King West, Toronto, ON', neighborhood: 'King West' },
  { latitude: 43.6677, longitude: -79.3948, address: 'Bloor Street, Toronto, ON', neighborhood: 'Bloor-Yorkville' },
  { latitude: 43.6486, longitude: -79.3716, address: 'St. Lawrence Market, Toronto, ON', neighborhood: 'St. Lawrence' },
  { latitude: 43.6532, longitude: -79.3832, address: 'Online subscription', neighborhood: 'Online' },
];

const PAYMENT_METHOD_OPTIONS = ['Debit card', 'Credit card', 'Cash', 'Bank transfer', 'Direct deposit', 'Apple Pay', 'Google Pay'];
const CURRENCY_OPTIONS = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'INR', 'JPY'];
type LocationOption = { latitude: number; longitude: number; address: string; neighborhood?: string };
type PlaceOption = LocationOption & { name: string; formattedAddress: string; placeId?: string; placeType?: string };

const MAP_BOUNDS = {
  minLat: 43.62,
  maxLat: 43.69,
  minLng: -79.43,
  maxLng: -79.35,
};

const getMapPosition = (latitude: number, longitude: number) => ({
  left: `${Math.min(Math.max(((longitude - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100, 4), 92)}%` as `${number}%`,
  top: `${Math.min(Math.max((1 - (latitude - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100, 8), 86)}%` as `${number}%`,
});

const isValidDateInput = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00`).getTime());

const TransactionForm = ({ mode }: { mode: 'add' | 'edit' }) => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const colors = useColors();
      const route = useRoute<RouteProp<Record<string, { transactionId?: string }>, string>>();
      const { addTransaction, updateTransaction, canUseFeature, isGuest } = useFinance();
      const existing = data.transactions.find((item) => item.id === route.params?.transactionId);
      const [type, setType] = useState<'income' | 'expense'>(existing?.type || 'expense');
      const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
      const [categoryId, setCategoryId] = useState(existing?.categoryId || data.categories.find((item) => item.type === 'expense')?.id || '');
      const [merchant, setMerchant] = useState(existing?.merchant || '');
      const [showCustomMerchant, setShowCustomMerchant] = useState(false);
      const [customMerchantInput, setCustomMerchantInput] = useState('');
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
      const categories = data.categories.filter((category) => category.type === type);
      const selected = data.categories.find((category) => category.id === categoryId) || categories[0];
      const merchantOptions = useMemo(
        () =>
          Array.from(
            new Set(
              data.transactions
                .filter((transaction) => transaction.type === type)
                .map((transaction) => transaction.merchant)
                .concat(type === 'income' ? ['Part-time Paycheck', 'Scholarship', 'Freelance Payment'] : ['Fresh Market', 'Campus Cafe', 'Transit Pass', 'Rent', 'Pharmacy'])
            )
          ).sort((a, b) => a.localeCompare(b)),
        [data.transactions, type]
      );
      const addressSuggestions = useMemo(() => remoteLocations.slice(0, 5), [remoteLocations]);
      const editLocked = mode === 'edit' && !!existing && existing.updateCount >= 2;
      const amountError = amount && !/^\d+(\.\d{0,2})?$/.test(amount) ? 'Use numbers with up to 2 decimals' : undefined;
      const formValid = !!amount && !amountError && !!selected && !!merchant.trim() && isValidDateInput(date) && !!selectedPlace && !editLocked;

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
        if (result.canceled) return;
        const nextReceipts = result.assets.map(createLocalReceiptAttachment);
        const invalid = nextReceipts.find(
          (receipt) => !SUPPORTED_RECEIPT_MIME_TYPES.includes(receipt.mimeType) || receipt.sizeBytes > MAX_RECEIPT_BYTES
        );
        if (invalid) {
          setError('Receipts must be JPG, PNG, HEIC, or HEIF images and 5 MB or smaller.');
          return;
        }
        setReceipts((current) => [...current, ...nextReceipts].slice(0, MAX_RECEIPTS_PER_TRANSACTION));
        if (!receiptBackendReady) setError('Receipt upload backend is not configured yet. Images are saved as pending placeholders.');
      };

      const removeReceipt = (receiptId: string) => {
        setReceipts((current) => current.filter((receipt) => receipt.id !== receiptId));
      };

      const submit = async () => {
        try {
          const parsedAmount = parseMoney(amount);
          if (!selectedPlace) throw new Error('Select a location before saving');
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
          if (mode === 'edit' && existing) await updateTransaction(existing.id, payload);
          else await addTransaction(payload);
          // Fire-and-forget receipt upload for pending local images
          const pendingReceipts = receipts.filter((r) => r.status === 'local' && r.uri);
          if (pendingReceipts.length && receiptsEnabled && receiptBackendReady) {
            Promise.all(pendingReceipts.map(uploadReceiptToWorker)).then((uploaded) => {
              const patched = receipts.map((r) => uploaded.find((u) => u.id === r.id) || r);
              if (mode === 'edit' && existing) updateTransaction(existing.id, { receipts: patched });
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
            subtitle="Amount, date, category, merchant, payment, and location are validated before saving."
            action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
          />
          <Card shadow="sm">
            {editLocked ? (
              <ErrorState
                title="Edit limit reached"
                message="PerFin OS allows each expense to be edited at most 2 times to preserve financial history."
              />
            ) : null}
            <Segmented options={['expense', 'income']} value={type} onChange={(value) => {
              const nextType = value as 'income' | 'expense';
              setType(nextType);
              setCategoryId(data.categories.find((item) => item.type === nextType)?.id || '');
            }} />
            <Field label="Amount" value={amount} onChangeText={updateAmount} placeholder="0.00" keyboardType="decimal-pad" error={amountError} />
            <SelectField label={type === 'income' ? 'Income Source' : 'Merchant'} value={merchant} options={merchantOptions} onChange={setMerchant} />
            {!merchantOptions.includes(merchant) && merchant.trim() ? null : (
              showCustomMerchant ? (
                <View style={{ marginTop: -Spacing.sm, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Input
                    value={customMerchantInput}
                    onChangeText={setCustomMerchantInput}
                    placeholder={type === 'income' ? 'Custom income source...' : 'Custom merchant name...'}
                    style={{ flex: 1, marginBottom: 0 }}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (customMerchantInput.trim()) setMerchant(customMerchantInput.trim());
                      setShowCustomMerchant(false);
                      setCustomMerchantInput('');
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (customMerchantInput.trim()) setMerchant(customMerchantInput.trim());
                      setShowCustomMerchant(false);
                      setCustomMerchantInput('');
                    }}
                    accessibilityRole="button"
                    style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: colors.primary }}
                  >
                    <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>Set</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setShowCustomMerchant(false); setCustomMerchantInput(''); }}
                    accessibilityRole="button"
                  >
                    <Text variant="caption" color="secondary">Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowCustomMerchant(true)}
                  accessibilityRole="button"
                  style={{ marginTop: -Spacing.sm, marginBottom: Spacing.md, alignSelf: 'flex-start' }}
                >
                  <Text variant="caption" style={{ color: colors.primary }}>+ Type custom {type === 'income' ? 'income source' : 'merchant'}</Text>
                </TouchableOpacity>
              )
            )}
            <View style={{ marginBottom: Spacing.md }}>
              <Text variant="bodySmall" style={styles.label}>Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={date}
                  onChange={(e: any) => setDate(e.target.value)}
                  onKeyDown={(e: any) => e.preventDefault()}
                  style={{ width: '100%', padding: '13px 16px', fontSize: 16, borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary, color: colors.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer' } as any}
                />
              ) : (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => setShowDatePicker(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSecondary, marginBottom: Spacing.sm }}
                  >
                    <Text variant="body" style={{ color: colors.text }}>{date}</Text>
                    <MaterialIcons name="calendar-today" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={new Date(date)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={(_event: any, selectedDate?: Date) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          const iso = selectedDate.toISOString().split('T')[0];
                          setDate(iso);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>
            <SelectField label="Payment Method" value={paymentMethod} options={PAYMENT_METHOD_OPTIONS} onChange={setPaymentMethod} />
            <Text variant="bodySmall" style={styles.label}>Category</Text>
            <View style={styles.wrapRow}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category.id === categoryId }}
                  accessibilityLabel={`Select ${category.name} category`}
                >
                  <CategoryBadge label={category.name} icon={category.icon} color={category.color} selected={category.id === categoryId} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => navigation.navigate('Categories')}
                accessibilityRole="button"
                accessibilityLabel="Add custom category"
              >
                <View style={[styles.addCategoryChip, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
                  <MaterialIcons name="add" size={14} color={colors.textSecondary} />
                  <Text variant="caption" color="secondary" style={{ marginLeft: 3 }}>New</Text>
                </View>
              </TouchableOpacity>
            </View>
            <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional context" />
            <Text variant="bodySmall" style={styles.label}>Location</Text>
            {/* Landscape map strip */}
            <View style={[styles.miniMapLandscape, { backgroundColor: colors.bgTertiary }]}>
              <View style={styles.mapGridLineVertical} />
              <View style={styles.mapGridLineHorizontal} />
              {selectedPlace ? (
                <View style={[styles.formMapPin, getMapPosition(selectedPlace.latitude, selectedPlace.longitude)]}>
                  <MaterialIcons name="place" size={24} color={selected?.color || colors.primary} />
                </View>
              ) : (
                <View style={styles.locationEmptyState}>
                  <MaterialIcons name="location-searching" size={26} color={colors.textSecondary} />
                  <Text variant="caption" color="secondary" style={{ marginTop: 4 }}>Search or use current location</Text>
                </View>
              )}
              {selectedPlace && (
                <View style={[styles.mapLabelPill, { backgroundColor: colors.card }]}>
                  <Text variant="caption" numberOfLines={1} style={{ fontWeight: '700' }}>{selectedPlace.name}</Text>
                </View>
              )}
            </View>
            {/* Controls below map */}
            <Field label="Place Search" value={placeQuery} onChangeText={updatePlaceSearch} placeholder="Search restaurant, mall, store, or address" />
            {addressSuggestions.length > 0 && (
              <View style={styles.locationChips}>
                {addressSuggestions.map((location) => (
                  <TouchableOpacity
                    key={`${location.placeId || location.address}-${location.latitude}`}
                    accessibilityRole="button"
                    onPress={() => applyLocation(location)}
                    style={[styles.locationChip, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
                  >
                    <Text variant="caption" numberOfLines={1}>{location.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {selectedPlace ? (
              <Text variant="caption" color="secondary" style={{ marginBottom: Spacing.sm }}>
                📍 {selectedPlace.formattedAddress || selectedPlace.address}
              </Text>
            ) : null}
            <View style={[styles.cardActions, { marginBottom: Spacing.md }]}>
              <Button label="Use Current Location" variant="secondary" onPress={useDeviceLocation} style={{ flex: 1 }} />
              <Button label="Clear" variant="secondary" onPress={() => setSelectedPlace(null)} style={{ flex: 0, paddingHorizontal: Spacing.lg }} />
            </View>
            <Text variant="bodySmall" style={styles.label}>Receipts</Text>
            <Card style={{ marginBottom: Spacing.md }}>
              <Text variant="bodySmall" color="secondary">
                {receiptsEnabled
                  ? receiptBackendReady
                    ? `Attach up to ${MAX_RECEIPTS_PER_TRANSACTION} receipt or payment images.`
                    : 'Receipt upload backend placeholder is not configured. Images are kept as pending placeholders.'
                  : 'Receipt uploads require a signed-in account.'}
              </Text>
              {receipts.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.receiptScroller}>
                  {receipts.map((receipt) => (
                    <View key={receipt.id} style={[styles.receiptPreview, { borderColor: colors.border }]}>
                      {receipt.uri ? <Image source={{ uri: receipt.uri }} style={styles.receiptImage} /> : <MaterialIcons name="receipt" size={30} color={colors.primary} />}
                      <Text variant="caption" numberOfLines={1}>{receipt.fileName}</Text>
                      <TouchableOpacity accessibilityRole="button" onPress={() => removeReceipt(receipt.id)} style={styles.receiptRemove}>
                        <MaterialIcons name="close" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
              <Button
                label={receiptsEnabled ? 'Add Receipt Images' : 'Login to Add Receipts'}
                variant="secondary"
                onPress={pickReceipts}
                disabled={!receiptsEnabled || receipts.length >= MAX_RECEIPTS_PER_TRANSACTION}
                style={{ marginTop: Spacing.md }}
              />
            </Card>
            <View style={styles.rowBetween}>
              <Text variant="body">Recurring transaction</Text>
              <Switch value={isRecurring} onValueChange={setRecurring} />
            </View>
            {error ? <Text color="danger" style={{ marginTop: Spacing.md }}>{error}</Text> : null}
            <Text variant="caption" color="secondary" style={{ marginTop: Spacing.md }}>
              Edits used: {existing?.updateCount || 0}/2
            </Text>
            <Button
              label={mode === 'edit' ? 'Save Changes' : 'Add Transaction'}
              onPress={submit}
              disabled={!formValid}
              size="lg"
              style={{ marginTop: Spacing.lg }}
            />
          </Card>
        </AppScroll>
      );
    }}
  </RequireData>
);

export const AddTransactionScreen = () => <TransactionForm mode="add" />;
export const EditTransactionScreen = () => <TransactionForm mode="edit" />;

const styles = StyleSheet.create({
  label: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  miniMapLandscape: {
    width: '100%',
    height: 110,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  mapGridLineVertical: {
    position: 'absolute',
    width: 2,
    height: '100%',
    left: '48%',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  mapGridLineHorizontal: {
    position: 'absolute',
    height: 2,
    width: '100%',
    top: '48%',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  formMapPin: {
    position: 'absolute',
    marginLeft: -10,
    marginTop: -10,
  },
  locationEmptyState: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLabelPill: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    alignItems: 'center',
  },
  locationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  locationChip: {
    minHeight: 30,
    maxWidth: 150,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  receiptScroller: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  receiptPreview: {
    width: 92,
    minHeight: 112,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  receiptImage: {
    width: 78,
    height: 78,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  receiptRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.danger,
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

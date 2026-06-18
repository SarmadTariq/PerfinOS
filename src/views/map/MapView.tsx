/**
 * MapView - expense map with heatmap/pins modes, category filters, and contextual actions.
 * Uses SafeAreaView layout because the map is the primary canvas.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button, Text } from '../../components/base';
import {
  CategoryBadge,
  EmptyState,
  IconButton,
} from '../../components/finance';
import { RequireData } from '../../components/layout/RequireData';
import { MapCanvas } from '../../components/map/MapCanvas';
import { useThemeScheme } from '../../context/ThemeContext';
import { AppData, Transaction } from '../../models/finance';
import { Colors, Radius, Spacing } from '../../theme';
import { formatCurrencyPrecise } from '../../utils/format';

type MapMode = 'pins' | 'heatmap';

type MapContentProps = {
  data: AppData;
};

const modeOptions: { value: MapMode; label: string }[] = [
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'pins', label: 'Pins' },
];

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

const getLocationLabel = (transaction: Transaction) =>
  transaction.location.name ||
  transaction.location.neighborhood ||
  transaction.location.address ||
  transaction.merchant ||
  'Unknown area';

const getLocationContext = (transaction: Transaction) =>
  transaction.location.neighborhood ||
  transaction.location.address ||
  'Mapped expense';

const MapContent = ({ data }: MapContentProps) => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const [mode, setMode] = useState<MapMode>('heatmap');
  const [categoryId, setCategoryId] = useState('all');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [zoom, setZoom] = useState(1);

  const expenseCategories = data.categories.filter((category) => category.type === 'expense');

  const visibleTransactions = data.transactions.filter(
    (transaction) =>
      transaction.type === 'expense' && (categoryId === 'all' || transaction.categoryId === categoryId)
  );

  const activeTransaction =
    selected && visibleTransactions.some((item) => item.id === selected.id)
      ? selected
      : null;

  const activeCategory = activeTransaction
    ? data.categories.find((category) => category.id === activeTransaction.categoryId)
    : null;

  const selectedLocationTransactions = activeTransaction
    ? visibleTransactions.filter((transaction) => getLocationLabel(transaction) === getLocationLabel(activeTransaction))
    : [];

  const selectedTotalSpend = selectedLocationTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );

  const selectedTransactionCount = selectedLocationTransactions.length;
  const selectedTitle = activeTransaction ? getLocationLabel(activeTransaction) : '';
  const selectedContext = activeTransaction
    ? [activeCategory?.name || activeTransaction.categoryName, getLocationContext(activeTransaction)]
      .filter(Boolean)
      .join(' · ')
    : '';

  const handleModeChange = (nextMode: MapMode) => {
    setMode(nextMode);
    setSelected(null);
  };

  const handleCategoryChange = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setSelected(null);
  };

  const handleZoomOut = () => {
    setZoom((value) => Math.max(0.65, Math.round((value - 0.25) * 100) / 100));
  };

  const handleZoomIn = () => {
    setZoom((value) => Math.min(2.4, Math.round((value + 0.25) * 100) / 100));
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.mapShell, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="h2">Expense Map</Text>
          <Text variant="body" color="secondary" style={styles.headerSubtitle}>
            Spending intensity by region
          </Text>
        </View>

        <IconButton
          icon="add-location-alt"
          label="Add located expense"
          onPress={() => navigation.navigate('AddTransaction')}
        />
      </View>

      <View style={[styles.controlsChrome, { borderColor: colors.border }]}>
        <View style={[styles.modeToggle, { backgroundColor: colors.bgTertiary }]}>
          {modeOptions.map((option) => {
            const isActive = option.value === mode;

            return (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Show ${option.label}`}
                onPress={() => handleModeChange(option.value)}
                style={[
                  styles.modeButton,
                  isActive && { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  variant="bodySmall"
                  style={[
                    styles.modeLabel,
                    { color: isActive ? colors.text : colors.textSecondary },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroller}
        >
          <TouchableOpacity onPress={() => handleCategoryChange('all')} accessibilityRole="button">
            <CategoryBadge
              label="All"
              icon="layers"
              color={colors.primary}
              selected={categoryId === 'all'}
              library="mi"
            />
          </TouchableOpacity>

          {expenseCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => handleCategoryChange(category.id)}
              accessibilityRole="button"
            >
              <CategoryBadge
                label={category.name}
                icon={category.icon}
                color={category.color}
                selected={category.id === categoryId}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.mapStage}>
        <MapCanvas
          style={styles.mapDimensions}
          transactions={visibleTransactions}
          categories={data.categories}
          selectedId={activeTransaction?.id}
          onSelect={setSelected}
          mode={mode}
          zoom={zoom}
          currency={data.user.currency}
        />

        <View style={styles.zoomOverlay}>
          <View style={styles.zoomOverlay}>
            <IconButton
              icon="remove"
              label="Zoom out"
              onPress={handleZoomOut}
              style={{
                ...styles.zoomButton,
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
            />
            <IconButton
              icon="add"
              label="Zoom in"
              onPress={handleZoomIn}
              style={{
                ...styles.zoomButton,
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
            />
          </View>
        </View>

        {visibleTransactions.length === 0 ? (
          <View pointerEvents="box-none" style={styles.emptyOverlay}>
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <EmptyState title="No mapped expenses" message="Add an expense with a location to see pins here." />
            </View>
          </View>
        ) : null}

        {activeTransaction ? (
          <View
            style={[
              styles.selectedCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.selectedHeader}>
              <View style={[styles.placeIcon, { backgroundColor: colors.primarySoft }]}>
                <MaterialIcons name="place" size={20} color={colors.primary} />
              </View>

              <View style={styles.selectedCopy}>
                <Text variant="h4" numberOfLines={1}>
                  {selectedTitle}
                </Text>
                <Text variant="bodySmall" color="secondary" style={styles.selectedContext} numberOfLines={1}>
                  {selectedContext}
                </Text>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Clear selected location"
                onPress={() => setSelected(null)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.selectedMetaRow}>
              <Text variant="bodySmall" color="secondary">
                {formatCurrencyPrecise(selectedTotalSpend, data.user.currency)} total spend
              </Text>
              <Text variant="bodySmall" color="tertiary">
                {selectedTransactionCount} {selectedTransactionCount === 1 ? 'transaction' : 'transactions'}
              </Text>
            </View>

            <View style={styles.selectedActions}>
              <Button
                label="View details"
                size="sm"
                onPress={() =>
                  navigation.navigate('TransactionDetail', {
                    transactionId: activeTransaction.id,
                  })
                }
                style={styles.primaryAction}
              />

              <Button
                label="Edit"
                variant="secondary"
                size="sm"
                disabled={activeTransaction.updateCount >= 2}
                onPress={() =>
                  navigation.navigate('EditTransaction', {
                    transactionId: activeTransaction.id,
                  })
                }
                style={styles.secondaryAction}
              />
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export const MapScreen = () => (
  <RequireData>
    {(data) => <MapContent data={data} />}
  </RequireData>
);

const styles = StyleSheet.create({
  mapShell: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerSubtitle: {
    marginTop: Spacing.xs,
  },
  controlsChrome: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeToggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  modeButton: {
    minHeight: 36,
    minWidth: 82,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: {
    fontWeight: '700',
  },
  categoryScroller: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.xl,
  },
  mapStage: {
    flex: 1,
    position: 'relative',
  },
  mapDimensions: {
    flex: 1,
    width: '100%',
  },
  zoomOverlay: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    gap: Spacing.sm,
  },
  zoomButton: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyCard: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  selectedCard: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  placeIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectedContext: {
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  selectedActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryAction: {
    flex: 1.35,
  },
  secondaryAction: {
    flex: 1,
  },
});
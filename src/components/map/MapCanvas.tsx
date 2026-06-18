import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';
import { Category, Transaction } from '../../models/finance';
import { formatCurrencyPrecise } from '../../utils/format';
import { mcIconName } from '../../utils/icons';
import { Text } from '../base';
import { ExpenseNativeMap } from './ExpenseNativeMap';

/**
 * Geographic bounding box for the Toronto region canvas.
 * Used to project lat/lng coordinates into percentage-based CSS positions.
 */
const MAP_BOUNDS = {
  minLat: 43.62,
  maxLat: 43.69,
  minLng: -79.43,
  maxLng: -79.35,
};

/**
 * Converts a latitude/longitude pair to percentage-based position
 * within the MAP_BOUNDS canvas. Clamps to stay within visible bounds.
 *
 * @param latitude - WGS-84 latitude
 * @param longitude - WGS-84 longitude
 * @returns `{ left, top }` as percentage strings for absolute positioning
 */
export const getMapPosition = (latitude: number, longitude: number) => ({
  left: `${Math.min(Math.max(((longitude - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100, 4), 92)}%` as `${number}%`,
  top: `${Math.min(Math.max((1 - (latitude - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100, 8), 86)}%` as `${number}%`,
});

/**
 * Spending map canvas — renders either a heatmap or pin mode.
 *
 * On native (iOS/Android) delegates to `ExpenseNativeMap` (MapKit/Google Maps).
 * On web renders a CSS canvas with coloured heat blobs or expense pins.
 *
 * @param transactions - Full list of transactions to visualise
 * @param categories - Category list for colour/icon lookup
 * @param selectedId - Currently selected transaction ID (pin mode only)
 * @param onSelect - Called when a pin is tapped
 * @param mode - 'heatmap' groups spend by location; 'pins' shows individual expense pins
 * @param zoom - Canvas scale factor (default 1)
 * @param currency - ISO currency code for value labels
 */

type MapCanvasProps = {
  transactions: Transaction[];
  categories: Category[];
  selectedId?: string;
  onSelect: (transaction: Transaction) => void;
  mode: 'pins' | 'heatmap';
  zoom?: number;
  currency?: string;
  style?: StyleProp<ViewStyle>;
};

export const MapCanvas = ({
  transactions,
  categories,
  selectedId,
  onSelect,
  mode,
  zoom = 1,
  currency = 'USD',
  style,
}: MapCanvasProps) => {
  
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const expenseTransactions = transactions.filter((transaction) => transaction.type === 'expense');

  // Aggregate transactions into heatmap groups by location name
  const heatGroups = Object.values(
    expenseTransactions.reduce<
      Record<string, { label: string; amount: number; count: number; latitude: number; longitude: number }>
    >((groups, transaction) => {
      const label =
        transaction.location.name ||
        transaction.location.neighborhood ||
        transaction.location.address ||
        'Unknown area';
      const current = groups[label] || { label, amount: 0, count: 0, latitude: 0, longitude: 0 };
      current.amount += transaction.amount;
      current.count += 1;
      current.latitude += transaction.location.latitude;
      current.longitude += transaction.location.longitude;
      groups[label] = current;
      return groups;
    }, {})
  ).map((group) => ({
    ...group,
    latitude: group.latitude / group.count,
    longitude: group.longitude / group.count,
  }));

  const maxHeat = Math.max(...heatGroups.map((g) => g.amount), 1);
  const topHeat = [...heatGroups].sort((a, b) => b.amount - a.amount)[0];

  // Delegate to native maps on iOS/Android
  if (Platform.OS !== 'web') {
    return (
      <ExpenseNativeMap
        transactions={expenseTransactions}
        categories={categories}
        heatGroups={heatGroups}
        maxHeat={maxHeat}
        mode={mode}
        zoom={zoom}
        onSelect={onSelect}
      />
    );
  }

  // Web canvas rendering
  return (
<View style={[styles.mapCanvas, style, { backgroundColor: colors.bgTertiary }]}>
        <View style={[styles.mapLayer, { transform: [{ scale: zoom }] }]}>
        {/* Road overlays */}
        <View style={[styles.mapRoad, styles.mapRoadOne]} />
        <View style={[styles.mapRoad, styles.mapRoadTwo]} />
        <View style={[styles.mapRoad, styles.mapRoadThree]} />
        {/* Water body at bottom */}
        <View style={styles.mapWater} />
        {/* Current location indicator */}
        <View style={styles.currentLocationDot}>
          <MaterialIcons name="my-location" size={18} color="#FFFFFF" />
        </View>

        {mode === 'heatmap'
          ? heatGroups.map((group) => {
              const intensity = group.amount / maxHeat;
              const size = 74 + intensity * 170;
              const position = getMapPosition(group.latitude, group.longitude);
              // Colour scale: red (hot) → amber → green → blue (cool)
              const heatColor =
                intensity > 0.78
                  ? '220,38,38'
                  : intensity > 0.54
                    ? '245,158,11'
                    : intensity > 0.3
                      ? '34,197,94'
                      : '59,130,246';
              return (
                <View
                  key={group.label}
                  accessibilityLabel={`${group.label} heatmap intensity ${Math.round(intensity * 100)} percent`}
                  style={[
                    styles.heatRegion,
                    position,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      marginLeft: -size / 2,
                      marginTop: -size / 2,
                      backgroundColor: `rgba(${heatColor}, ${0.18 + intensity * 0.28})`,
                      ...(Platform.OS === 'web' ? ({ filter: `blur(${Math.round(size * 0.22)}px)` } as any) : {}),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.heatCore,
                      { backgroundColor: `rgba(${heatColor}, ${0.5 + intensity * 0.5})` },
                    ]}
                  />
                </View>
              );
            })
          : expenseTransactions.map((transaction) => {
              const category = categories.find((item) => item.id === transaction.categoryId);
              const position = getMapPosition(transaction.location.latitude, transaction.location.longitude);
              const isSelected = transaction.id === selectedId;
              return (
                <TouchableOpacity
                  key={transaction.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${transaction.merchant} expense pin`}
                  onPress={() => onSelect(transaction)}
                  style={[
                    styles.mapPin,
                    position,
                    {
                      backgroundColor: category?.color || colors.primary,
                      transform: [{ scale: isSelected ? 1.16 : 1 }],
                    },
                  ]}
                >
                  <MaterialCommunityIcons name={mcIconName(category?.icon, 'food')} size={17} color="#FFFFFF" />
                  <View style={[styles.mapPinLabel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text variant="caption" numberOfLines={1}>
                      {transaction.location.name || transaction.merchant}
                    </Text>
                    <Text variant="caption" color="secondary" numberOfLines={1}>
                      {formatCurrencyPrecise(transaction.amount, currency)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

        {mode === 'heatmap' && topHeat ? (
          <View style={[styles.heatLegend, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text variant="caption" color="secondary">
              Highest spend region
            </Text>
            <Text variant="bodySmall" style={{ fontWeight: '700' }}>
              {topHeat.label}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({

    mapCanvas: {
    height: 320,
    overflow: 'hidden',
  },
  mapLayer: { flex: 1 },
  mapRoad: {
    position: 'absolute',
    height: 22,
    width: '135%',
    left: '-18%',
    backgroundColor: 'rgba(180,180,180,0.55)',
    borderRadius: Radius.round,
  },
  mapRoadOne: { top: '32%', transform: [{ rotate: '-20deg' }] },
  mapRoadTwo: { top: '54%', transform: [{ rotate: '15deg' }] },
  mapRoadThree: { top: '70%', transform: [{ rotate: '-5deg' }] },
  mapWater: {
    position: 'absolute',
    left: '-15%',
    right: '-15%',
    bottom: '-10%',
    height: '24%',
    backgroundColor: '#CFCFCF',
    transform: [{ rotate: '-3deg' }],
  },
  currentLocationDot: {
    position: 'absolute',
    left: '50%',
    top: '48%',
    width: 38,
    height: 38,
    marginLeft: -19,
    marginTop: -19,
    borderRadius: Radius.round,
    backgroundColor: Colors.light.primary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPin: {
    position: 'absolute',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: Radius.round,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinLabel: {
    position: 'absolute',
    top: 34,
    minWidth: 128,
    maxWidth: 168,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  heatRegion: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  heatCore: { width: '34%', height: '34%', borderRadius: Radius.round },
  heatLegend: {
    position: 'absolute',
    left: Spacing.lg,
    bottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});

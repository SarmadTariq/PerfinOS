import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { Category, Transaction } from '../../models/finance';
import { formatCurrency, formatCurrencyPrecise } from '../../utils/format';

interface HeatGroup {
  label: string;
  amount: number;
  latitude: number;
  longitude: number;
}

interface ExpenseNativeMapProps {
  transactions: Transaction[];
  categories: Category[];
  heatGroups: HeatGroup[];
  maxHeat: number;
  mode: 'pins' | 'heatmap';
  zoom: number;
  onSelect: (transaction: Transaction) => void;
  style?: StyleProp<ViewStyle>;
}

const TORONTO_LOCATION = {
  latitude: 43.6532,
  longitude: -79.3832,
};

export const ExpenseNativeMap = ({
  transactions,
  categories,
  heatGroups,
  maxHeat,
  mode,
  zoom,
  onSelect,
  style,
}: ExpenseNativeMapProps) => {
  const topHeat = [...heatGroups].sort((a, b) => b.amount - a.amount)[0];

  const safeZoom = Math.max(0.65, Math.min(2.4, zoom));
  const zoomDelta = 0.08 / safeZoom;

  const initialRegion = useMemo<Region>(
    () => ({
      latitude: topHeat?.latitude || TORONTO_LOCATION.latitude,
      longitude: topHeat?.longitude || TORONTO_LOCATION.longitude,
      latitudeDelta: zoomDelta,
      longitudeDelta: zoomDelta,
    }),
    [topHeat?.latitude, topHeat?.longitude, zoomDelta]
  );

  const [region, setRegion] = useState<Region>(initialRegion);

  useEffect(() => {
    setRegion((current) => ({
      ...current,
      latitudeDelta: zoomDelta,
      longitudeDelta: zoomDelta,
    }));
  }, [zoomDelta]);

  useEffect(() => {
    setRegion((current) => ({
      ...current,
      latitude: initialRegion.latitude,
      longitude: initialRegion.longitude,
    }));
  }, [initialRegion.latitude, initialRegion.longitude]);

  const heatColor = (intensity: number) => {
    if (intensity > 0.78) return 'rgba(220, 38, 38, 0.42)';
    if (intensity > 0.54) return 'rgba(245, 158, 11, 0.38)';
    if (intensity > 0.3) return 'rgba(34, 197, 94, 0.32)';
    return 'rgba(59, 130, 246, 0.28)';
  };

  const heatStroke = (intensity: number) => {
    if (intensity > 0.78) return 'rgba(185, 28, 28, 0.7)';
    if (intensity > 0.54) return 'rgba(217, 119, 6, 0.65)';
    if (intensity > 0.3) return 'rgba(22, 163, 74, 0.58)';
    return 'rgba(37, 99, 235, 0.52)';
  };

  return (
    <MapView
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      style={[styles.map, style]}
      region={region}
      onRegionChangeComplete={setRegion}
      showsUserLocation
      showsMyLocationButton
    >
      {mode === 'heatmap'
        ? heatGroups.map((group) => {
            const intensity = group.amount / maxHeat;
            const match = transactions.find(
              (transaction) =>
                (transaction.location.name ||
                  transaction.location.neighborhood ||
                  transaction.location.address ||
                  'Unknown area') === group.label
            );

            return (
              <React.Fragment key={group.label}>
                <Circle
                  center={{ latitude: group.latitude, longitude: group.longitude }}
                  radius={260 + intensity * 1100}
                  fillColor={heatColor(intensity)}
                  strokeColor={heatStroke(intensity)}
                  strokeWidth={1}
                />

                {match ? (
                  <Marker
                    coordinate={{ latitude: group.latitude, longitude: group.longitude }}
                    title={group.label}
                    description={`${formatCurrency(group.amount)} total spend`}
                    onPress={() => onSelect(match)}
                  >
                    <View style={styles.heatTouchTarget} />
                  </Marker>
                ) : null}
              </React.Fragment>
            );
          })
        : transactions.map((transaction) => {
            const category = categories.find((item) => item.id === transaction.categoryId);

            return (
              <Marker
                key={transaction.id}
                coordinate={{
                  latitude: transaction.location.latitude,
                  longitude: transaction.location.longitude,
                }}
                pinColor={category?.color}
                title={transaction.location.name || transaction.merchant}
                description={`${formatCurrencyPrecise(transaction.amount)} spent · ${transaction.categoryName}`}
                onPress={() => onSelect(transaction)}
              />
            );
          })}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    minHeight: 420,
  },
  heatTouchTarget: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
});
/**
 * MapView — expense map with heatmap/pins modes, category filters, and zoom controls.
 * Uses SafeAreaView layout (not AppScroll).
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Text } from '../../components/base';
import {
  CategoryBadge,
  EmptyState,
  IconButton,
} from '../../components/finance';
import { Segmented } from '../../components/form/Segmented';
import { RequireData } from '../../components/layout/RequireData';
import { MapCanvas } from '../../components/map/MapCanvas';
import { useThemeScheme } from '../../context/ThemeContext';
import { AppData, Transaction } from '../../models/finance';
import { Colors, Spacing } from '../../theme';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

type MapContentProps = {
  data: AppData;
};

const MapContent = ({ data }: MapContentProps) => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const [mode, setMode] = useState<'pins' | 'heatmap'>('heatmap');
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
      : visibleTransactions[0] || null;

  const handleZoomOut = () => {
    setZoom((value) => Math.max(0.65, Math.round((value - 0.25) * 100) / 100));
  };

  const handleZoomIn = () => {
    setZoom((value) => Math.min(2.4, Math.round((value + 0.25) * 100) / 100));
  };

  return (
    <SafeAreaView style={[styles.mapShell, { backgroundColor: colors.bg }]}>
      <View style={[styles.mapHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text variant="h2">Expense Map</Text>
          <Text variant="bodySmall" color="secondary">
            Spending intensity by region with category filters
          </Text>
        </View>

        <IconButton
          icon="add-location-alt"
          label="Add located expense"
          onPress={() => navigation.navigate('AddTransaction')}
        />
      </View>

      <View style={[styles.mapControlsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.controlsRow}>
          <Segmented
            options={['heatmap', 'pins']}
            value={mode}
            onChange={(value) => setMode(value as 'pins' | 'heatmap')}
          />

          <View style={styles.zoomActions}>
            <IconButton icon="remove" label="Zoom out" onPress={handleZoomOut} />
            <IconButton icon="add" label="Zoom in" onPress={handleZoomIn} />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroller}
        >
          <TouchableOpacity onPress={() => setCategoryId('all')} accessibilityRole="button">
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
              onPress={() => setCategoryId(category.id)}
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

      <View>
        {activeTransaction ? (
          <View style={styles.cardActions}>
            <Button
              label="View Detail"
              variant="secondary"
              onPress={() =>
                navigation.navigate('TransactionDetail', {
                  transactionId: activeTransaction.id,
                })
              }
              style={{ flex: 1 }}
            />

            <Button
              label="Edit"
              disabled={activeTransaction.updateCount >= 2}
              onPress={() =>
                navigation.navigate('EditTransaction', {
                  transactionId: activeTransaction.id,
                })
              }
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <EmptyState title="No mapped expenses" message="Add an expense with a location to see pins here." />
        )}
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
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  mapControlsBar: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  zoomActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  categoryScroller: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  mapDimensions: {
    flex: 1,
    width: '100%',
  },
});
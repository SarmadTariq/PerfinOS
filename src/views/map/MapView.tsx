/**
 * MapView — expense map with heatmap/pins modes, category filters, and zoom controls.
 * Uses SafeAreaView layout (not AppScroll).
 * Extracted from PerFinOSScreens.tsx (MapScreen).
 */
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { Transaction } from '../../models/finance';
import { calculateLocationBreakdown } from '../../repositories/AnalyticsRepository';
import { Colors, Spacing } from '../../theme';
import { formatCurrency, formatCurrencyPrecise, getMonthKey } from '../../utils/format';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

export const MapScreen = () => (
  <RequireData>
    {(data) => {
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
      const activeTransaction = selected && visibleTransactions.some((item) => item.id === selected.id)
        ? selected
        : visibleTransactions[0] || null;
      const locationBreakdown = calculateLocationBreakdown(visibleTransactions, getMonthKey());
      const activeCategory = data.categories.find((item) => item.id === activeTransaction?.categoryId);

      return (
        <SafeAreaView style={[styles.mapShell, { backgroundColor: colors.bg }]}>
          {/* Header — normal flow */}
          <View style={[styles.mapHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text variant="h2">Expense Map</Text>
              <Text variant="bodySmall" color="secondary">Spending intensity by region with category filters</Text>
            </View>
            <IconButton icon="add-location-alt" label="Add located expense" onPress={() => navigation.navigate('AddTransaction')} />
          </View>
          {/* Controls — normal flow, above canvas */}
          <View style={[styles.mapControlsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
              <Segmented options={['heatmap', 'pins']} value={mode} onChange={(value) => setMode(value as 'pins' | 'heatmap')} />
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <IconButton icon="remove" label="Zoom out" onPress={() => setZoom((value) => Math.max(0.9, Math.round((value - 0.15) * 100) / 100))} />
                <IconButton icon="add" label="Zoom in" onPress={() => setZoom((value) => Math.min(1.45, Math.round((value + 0.15) * 100) / 100))} />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroller}>
              <TouchableOpacity onPress={() => setCategoryId('all')} accessibilityRole="button">
                <CategoryBadge label="All" icon="layers" color={colors.primary} selected={categoryId === 'all'} library="mi" />
              </TouchableOpacity>
              {expenseCategories.map((category) => (
                <TouchableOpacity key={category.id} onPress={() => setCategoryId(category.id)} accessibilityRole="button">
                  <CategoryBadge label={category.name} icon={category.icon} color={category.color} selected={category.id === categoryId} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {/* Canvas — fixed height block */}
          <MapCanvas
            transactions={visibleTransactions}
            categories={data.categories}
            selectedId={activeTransaction?.id}
            onSelect={setSelected}
            mode={mode}
            zoom={zoom}
            currency={data.user.currency}
          />
          {/* Info panel — normal flow below canvas */}
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            {activeTransaction ? (
              <>
                <View style={styles.rowBetween}>
                  <CategoryBadge
                    label={activeTransaction.categoryName}
                    icon={activeCategory?.icon}
                    color={activeCategory?.color || colors.primary}
                  />
                  <Text variant="h3" style={{ color: colors.danger }}>
                    {formatCurrencyPrecise(activeTransaction.amount, data.user.currency)}
                  </Text>
                </View>
                <Text variant="h4" style={{ marginTop: Spacing.md }}>{activeTransaction.merchant}</Text>
                <Text variant="body" color="secondary" style={{ marginTop: Spacing.xs }}>
                  {activeTransaction.location.address} · {activeTransaction.date}
                </Text>
                <Text variant="caption" color="secondary" style={{ marginTop: Spacing.xs }}>
                  {locationBreakdown[0]
                    ? `${locationBreakdown[0].label}: ${formatCurrency(locationBreakdown[0].amount, data.user.currency)} this month`
                    : 'Location intelligence appears as expenses are added.'}
                </Text>
                <View style={styles.cardActions}>
                  <Button label="View Detail" variant="secondary" onPress={() => navigation.navigate('TransactionDetail', { transactionId: activeTransaction.id })} style={{ flex: 1 }} />
                  <Button label="Edit" disabled={activeTransaction.updateCount >= 2} onPress={() => navigation.navigate('EditTransaction', { transactionId: activeTransaction.id })} style={{ flex: 1 }} />
                </View>
              </>
            ) : (
              <EmptyState title="No mapped expenses" message="Add an expense with a location to see pins here." />
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }}
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
  categoryScroller: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
});

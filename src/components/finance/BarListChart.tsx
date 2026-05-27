import React, { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';
import { formatCurrency } from '../../utils/format';
import { EmptyState } from './EmptyState';
import { Text } from '../base';

/**
 * Horizontal bar chart rendered as a list.
 * Each bar is tappable to reveal a secondary detail row.
 */
export const BarListChart = ({
  data, currency, emptyMessage = 'No chart data yet.',
}: {
  data: { label: string; value: number; color?: string; secondary?: string }[];
  currency?: string;
  emptyMessage?: string;
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const max = Math.max(...data.map((item) => item.value), 0);

  if (data.length === 0 || max === 0) {
    return <EmptyState title="No chart data" message={emptyMessage} icon="bar-chart" />;
  }

  return (
    <View>
      {data.map((item) => {
        const width = max === 0 ? 0 : (item.value / max) * 100;
        const isSelected = selected === item.label;
        return (
          <Pressable
            key={item.label}
            onPress={() => setSelected(isSelected ? null : item.label)}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}, ${formatCurrency(item.value, currency)}`}
            style={[styles.item, { backgroundColor: isSelected ? colors.bgTertiary : 'transparent', borderColor: isSelected ? colors.border : 'transparent' }]}
          >
            <View style={styles.row}>
              <View style={styles.labelGroup}>
                <View style={[styles.dot, { backgroundColor: item.color || colors.primary }]} />
                <Text variant="bodySmall" style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>{item.label}</Text>
              </View>
              <Text variant="bodySmall" color="secondary" style={{ fontWeight: '700' }}>{formatCurrency(item.value, currency)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.bgTertiary }]}>
              <View style={[styles.bar, { width: `${Math.max(width, 4)}%`, backgroundColor: item.color || colors.primary }]} />
            </View>
            {isSelected && item.secondary ? (
              <Text variant="caption" color="secondary" style={{ marginTop: Spacing.xs }}>{item.secondary}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  item: { marginBottom: Spacing.md, padding: Spacing.sm, borderWidth: 1, borderRadius: Radius.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, marginBottom: Spacing.xs },
  labelGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 9, height: 9, borderRadius: Radius.round },
  track: { height: 13, borderRadius: Radius.round, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: Radius.round },
});

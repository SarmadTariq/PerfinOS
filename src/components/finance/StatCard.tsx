import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';
import { Card, Text } from '../base';

/**
 * A metric card showing an icon, label, value, and tone color.
 * Used in dashboard MetricGrid to summarise financial stats.
 */
export const StatCard = ({
  label, value, icon, tone = 'primary', helper,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  helper?: string;
}) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const toneColor = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'danger' ? colors.danger : colors.primary;

  return (
    <Card style={styles.statCard} shadow="sm">
      <View style={styles.statTopRow}>
        <View style={[styles.iconTile, { backgroundColor: colors.primarySoft }]}>
          <MaterialIcons name={icon} size={22} color={toneColor} />
        </View>
        <View style={[styles.statusDot, { backgroundColor: toneColor }]} />
      </View>
      <Text variant="bodySmall" color="secondary" style={styles.statLabel}>{label}</Text>
      <Text variant="h3" style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text variant="caption" color="tertiary" style={{ marginTop: Spacing.xs }}>{helper || 'Current month'}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  statCard: { flex: 1, minWidth: 150, minHeight: 142 },
  statTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconTile: { width: 42, height: 42, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: Radius.round },
  statLabel: { marginTop: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { marginTop: Spacing.xs },
});

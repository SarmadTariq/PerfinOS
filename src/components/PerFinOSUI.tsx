import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useThemeScheme } from '../context/ThemeContext';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../theme';
import { clamp, formatCurrency } from '../utils/format';
import { materialIconName, mcIconName } from '../utils/icons';
import { Card, Text, Button } from './index';

interface ShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export const ScreenHeader = ({ title, subtitle, action }: Omit<ShellProps, 'children'>) => (
  <View style={styles.header}>
    <View style={{ flex: 1 }}>
      <Text variant="h2">{title}</Text>
      {subtitle ? (
        <Text variant="body" color="secondary" style={{ marginTop: Spacing.xs }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
    {action}
  </View>
);

export const StatCard = ({
  label,
  value,
  icon,
  tone = 'primary',
  helper,
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
      <Text variant="bodySmall" color="secondary" style={styles.statLabel}>
        {label}
      </Text>
      <Text variant="h3" style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="caption" color="tertiary" style={{ marginTop: Spacing.xs }}>
        {helper || 'Current month'}
      </Text>
    </Card>
  );
};

export const ChartCard = ({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
}) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <Card style={styles.chartCard} shadow="sm">
      <View style={styles.chartHeader}>
        <View>
          <Text variant="h4">{title}</Text>
          {summary ? (
            <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
              {summary}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ marginTop: Spacing.lg }}>{children}</View>
    </Card>
  );
};

export const CategoryBadge = ({
  label,
  color,
  icon,
  selected = false,
  library = 'mci',
}: {
  label: string;
  color: string;
  icon?: string;
  selected?: boolean;
  library?: 'mi' | 'mci';
}) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: color,
          backgroundColor: selected ? `${color}1F` : colors.bgSecondary,
        },
      ]}
    >
      {icon ? (
        library === 'mi'
          ? <MaterialIcons name={materialIconName(icon)} size={14} color={color} />
          : <MaterialCommunityIcons name={mcIconName(icon)} size={14} color={color} />
      ) : null}
      <Text variant="caption" style={{ color, marginLeft: icon ? Spacing.xs : 0 }}>
        {label}
      </Text>
    </View>
  );
};

export const ProgressBar = ({
  value,
  color,
  height = 9,
}: {
  value: number;
  color?: string;
  height?: number;
}) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={[styles.progressTrack, { height, backgroundColor: colors.bgTertiary }]}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${clamp(value)}%`,
            backgroundColor: color || colors.primary,
          },
        ]}
      />
    </View>
  );
};

export const EmptyState = ({
  title,
  message,
  icon = 'inbox',
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  actionLabel?: string;
  onAction?: () => void;
}) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={[styles.stateBox, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]} accessibilityRole="summary">
      <View style={[styles.stateIcon, { backgroundColor: colors.primarySoft }]}>
        <MaterialIcons name={icon} size={34} color={colors.primary} />
      </View>
      <Text variant="h4" style={{ marginTop: Spacing.md }}>
        {title}
      </Text>
      <Text variant="body" color="secondary" style={styles.stateMessage}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: Spacing.lg }} />
      ) : null}
    </View>
  );
};

export const LoadingState = ({ label = 'Loading PerFin OS data...' }: { label?: string }) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={styles.stateBox} accessibilityRole="progressbar">
      <ActivityIndicator color={colors.primary} />
      <Text variant="body" color="secondary" style={{ marginTop: Spacing.md }}>
        {label}
      </Text>
    </View>
  );
};

export const ErrorState = ({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) => (
  <View style={styles.stateBox} accessibilityRole="alert">
    <View style={[styles.stateIcon, { backgroundColor: '#FCEDEA' }]}>
      <MaterialIcons name="error-outline" size={34} color={Colors.light.danger} />
    </View>
    <Text variant="h4" style={{ marginTop: Spacing.md }}>
      {title}
    </Text>
    <Text variant="body" color="secondary" style={styles.stateMessage}>
      {message}
    </Text>
    {onRetry ? <Button label="Try Again" onPress={onRetry} variant="secondary" /> : null}
  </View>
);

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalPanel} accessibilityRole="alert">
        <Text variant="h3">{title}</Text>
        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          {message}
        </Text>
        <View style={styles.modalActions}>
          <Button label="Cancel" onPress={onCancel} variant="secondary" style={{ flex: 1 }} />
          <Button label={confirmLabel} onPress={onConfirm} variant="danger" style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  </Modal>
);

export const Toast = ({ message, tone = 'success' }: { message: string | null; tone?: 'success' | 'danger' }) => {
  if (!message) return null;
  return (
    <View style={[styles.toast, { backgroundColor: tone === 'success' ? Colors.light.success : Colors.light.danger }]}>
      <Text variant="bodySmall" style={{ color: '#FFFFFF', fontWeight: '700' }}>
        {message}
      </Text>
    </View>
  );
};

export const BarListChart = ({
  data,
  currency,
  emptyMessage = 'No chart data yet.',
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
            style={[
              styles.chartItem,
              {
                backgroundColor: isSelected ? colors.bgTertiary : 'transparent',
                borderColor: isSelected ? colors.border : 'transparent',
              },
            ]}
          >
            <View style={styles.chartRow}>
              <View style={styles.chartLabelGroup}>
                <View style={[styles.legendDot, { backgroundColor: item.color || colors.primary }]} />
                <Text variant="bodySmall" style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              <Text variant="bodySmall" color="secondary" style={{ fontWeight: '700' }}>
                {formatCurrency(item.value, currency)}
              </Text>
            </View>
            <View style={[styles.chartTrack, { backgroundColor: colors.bgTertiary }]}>
              <View
                style={[
                  styles.chartBar,
                  { width: `${Math.max(width, 4)}%`, backgroundColor: item.color || colors.primary },
                ]}
              />
            </View>
            {isSelected && item.secondary ? (
              <Text variant="caption" color="secondary" style={{ marginTop: Spacing.xs }}>
                {item.secondary}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

export const MetricGrid = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.metricGrid}>{children}</View>
);

export const IconButton = ({
  icon,
  label,
  onPress,
  style,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.iconButton, { backgroundColor: colors.primarySoft }, style]}
    >
      <MaterialIcons name={icon} size={21} color={colors.primary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    minHeight: 142,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.round,
  },
  statLabel: {
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    marginTop: Spacing.xs,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 30,
  },
  progressTrack: {
    width: '100%',
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.round,
  },
  stateBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateMessage: {
    marginTop: Spacing.sm,
    textAlign: 'center',
    maxWidth: 340,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalPanel: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    padding: Spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  toast: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  chartCard: {
    marginBottom: Spacing.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },

  chartItem: {
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  chartLabelGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: Radius.round,
  },
  chartTrack: {
    height: 13,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    borderRadius: Radius.round,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

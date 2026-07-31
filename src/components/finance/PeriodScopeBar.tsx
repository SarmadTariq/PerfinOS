import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { ControlSize, Radius, Spacing, Typography } from '../../theme';
import { Text } from '../base';

export interface PeriodScopeBarProps {
  label: string;
  detail?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

export const PeriodScopeBar = ({
  label,
  detail,
  onPress,
  accessibilityLabel,
}: PeriodScopeBarProps) => {
  const colors = useColors();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Change period: ${label}`}
      accessibilityHint="Opens period options"
      activeOpacity={0.78}
      onPress={onPress}
      style={[
        styles.control,
        {
          backgroundColor: colors.backgroundSurface,
          borderColor: colors.borderDefault,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.actionPrimarySoft }]}>
        <MaterialIcons name="calendar-today" size={18} color={colors.actionPrimary} />
      </View>

      <View style={styles.copy}>
        <Text variant="bodySmall" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>

      <MaterialIcons name="expand-more" size={22} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  control: {
    minHeight: ControlSize.minimumTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  icon: {
    width: Spacing.xxxl,
    height: Spacing.xxxl,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontWeight: Typography.label.fontWeight,
  },
});

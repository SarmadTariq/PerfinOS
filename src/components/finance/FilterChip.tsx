import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { ControlSize, Radius, Spacing, Typography } from '../../theme';
import { Text } from '../base';

export interface FilterChipProps {
  label: string;
  selected?: boolean;
  count?: number;
  onPress: () => void;
  onRemove?: () => void;
}

export const FilterChip = ({
  label,
  selected = false,
  count,
  onPress,
  onRemove,
}: FilterChipProps) => {
  const colors = useColors();
  const effectivePress = onRemove ?? onPress;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${onRemove ? 'Remove' : 'Set'} ${label} filter`}
      activeOpacity={0.76}
      onPress={effectivePress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.actionPrimarySoft : colors.backgroundSurface,
          borderColor: selected ? colors.actionPrimary : colors.borderDefault,
        },
      ]}
    >
      <Text
        variant="caption"
        numberOfLines={1}
        style={[
          styles.label,
          { color: selected ? colors.actionPrimary : colors.textSecondary },
        ]}
      >
        {label}{typeof count === 'number' && count > 0 ? ` ${count}` : ''}
      </Text>
      {onRemove ? <MaterialIcons name="close" size={15} color={colors.actionPrimary} /> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    minHeight: ControlSize.minimumTouchTarget,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.round,
  },
  label: {
    fontWeight: Typography.label.fontWeight,
  },
});

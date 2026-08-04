import type { ComponentProps } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '../base';
import { useColors } from '../../context/ThemeContext';
import { ControlSize, Radius, Shadows, Spacing, Typography } from '../../theme/index';

export interface FloatingActionButtonProps {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export const FloatingActionButton = ({
  icon,
  label,
  onPress,
  accessibilityHint,
  style,
}: FloatingActionButtonProps) => {
  const colors = useColors();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      activeOpacity={0.84}
      onPress={onPress}
      style={[
        styles.root,
        { backgroundColor: colors.actionPrimary },
        style,
      ]}
    >
      <MaterialIcons name={icon} size={20} color={colors.textInverse} />
      <Text
        variant="bodySmall"
        style={[styles.label, { color: colors.textInverse }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  root: {
    minHeight: ControlSize.minimumTouchTarget,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  label: {
    fontWeight: Typography.label.fontWeight,
  },
});

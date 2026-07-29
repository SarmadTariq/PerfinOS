import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type {
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useColors } from '../../context/ThemeContext';
import {
  ControlSize,
  Radius,
  Spacing,
} from '../../theme';

export interface IconButtonProps {
  icon: React.ComponentProps<
    typeof MaterialIcons
  >['name'];
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Icon-only control for secondary toolbar actions.
 */
export const IconButton = ({
  icon,
  label,
  onPress,
  style,
}: IconButtonProps) => {
  const colors = useColors();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor:
            colors.actionPrimarySoft,
        },
        style,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={Spacing.xl}
        color={colors.actionPrimary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: ControlSize.minimumTouchTarget,
    height: ControlSize.minimumTouchTarget,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import type {
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  ControlSize,
  Radius,
  Spacing,
  Typography,
} from '../../theme/index';
import { useColors } from '../../context/ThemeContext';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}) => {
  const colors = useColors();
  const unavailable = disabled || loading;

  const variantColor = {
    primary: colors.actionPrimary,
    secondary: colors.backgroundSurface,
    danger: colors.statusCritical,
    success: colors.statusPositive,
  }[variant];

  const textColor = unavailable
    ? colors.textMuted
    : variant === 'secondary'
      ? colors.textPrimary
      : colors.textInverse;

  const sizeStyles = {
    sm: {
      minHeight: ControlSize.minimumTouchTarget,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    md: {
      minHeight: ControlSize.button,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    lg: {
      minHeight: ControlSize.button + Spacing.sm,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
    },
  };

  const textSizes = {
    sm: Typography.bodySmall,
    md: Typography.body,
    lg: Typography.bodyLarge,
  };

  const handlePress = () => {
    if (!unavailable) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{
        disabled: unavailable,
        busy: loading,
      }}
      onPress={handlePress}
      disabled={unavailable}
      activeOpacity={0.82}
      style={[
        styles.button,
        sizeStyles[size],
        {
          backgroundColor: unavailable
            ? colors.backgroundSubtle
            : variantColor,
          borderColor: unavailable
            ? colors.borderDefault
            : variant === 'secondary'
              ? colors.borderDefault
              : variantColor,
          borderWidth:
            variant === 'secondary' || unavailable
              ? 1
              : 0,
          opacity: unavailable ? 0.72 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={textColor}
          size="small"
        />
      ) : (
        <Text
          style={[
            textSizes[size],
            {
              color: textColor,
              fontWeight: Typography.label.fontWeight,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
});

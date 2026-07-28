import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {
  BrandColors,
  Colors,
  ControlSize,
  Radius,
  Spacing,
  Typography,
} from '../../theme';
import { useThemeScheme } from '../../context/ThemeContext';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
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
  const scheme = useThemeScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const unavailable = disabled || loading;

  const variantColor = {
    primary: colors.primary,
    secondary: colors.bgSecondary,
    danger: colors.danger,
    success: colors.success,
  }[variant];

  const enabledTextColor =
    variant === 'secondary'
      ? colors.text
      : variant === 'primary' && isDark
        ? BrandColors.ink
        : BrandColors.paper;

  const textColor = unavailable
    ? colors.textTertiary
    : enabledTextColor;

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
      accessibilityLabel={accessibilityLabel || label}
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
            ? colors.bgTertiary
            : variantColor,
          borderColor: unavailable
            ? colors.border
            : variant === 'secondary'
              ? colors.border
              : variantColor,
          borderWidth: variant === 'secondary' || unavailable ? 1 : 0,
          opacity: unavailable ? 0.72 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
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
    borderRadius: Radius.sm,
  },
});

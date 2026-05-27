import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { useThemeScheme } from '../context/ThemeContext';

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
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  const variantColor = {
    primary: colors.primary,
    secondary: colors.bgSecondary,
    danger: colors.danger,
    success: colors.success,
  }[variant];

  const isTextVariant = variant === 'secondary';
  const textColor = isTextVariant ? colors.text : '#FFFFFF';

  const sizeStyles = {
    sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    md: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  };

  const textSizes = {
    sm: Typography.bodySmall,
    md: Typography.body,
    lg: Typography.bodyLarge,
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? colors.textTertiary : variantColor,
          borderColor: variant === 'secondary' ? colors.border : variantColor,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderRadius: Radius.md,
          ...sizeStyles[size],
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[textSizes[size], { color: textColor, fontWeight: '600' }]}>
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
    minHeight: 46,
  },
});

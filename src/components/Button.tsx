import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { Colors, ControlSize, getButtonColorTokens, Radius, Spacing, Typography } from '../theme';
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
  const unavailable = disabled || loading;
  const colorTokens = getButtonColorTokens(colors, variant, unavailable);

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
      accessibilityState={{ disabled: unavailable, busy: loading }}
      onPress={handlePress}
      disabled={unavailable}
      style={[
        styles.button,
        {
          backgroundColor: colorTokens.background,
          borderColor: colorTokens.border,
          borderWidth: variant === 'secondary' || unavailable ? 1 : 0,
          ...sizeStyles[size],
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={colorTokens.foreground} size="small" />
      ) : (
        <Text style={[textSizes[size], { color: colorTokens.foreground, fontWeight: '600' }]}>
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
    minHeight: ControlSize.minimumTouchTarget,
    borderRadius: Radius.sm,
  },
});

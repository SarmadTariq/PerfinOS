import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
} from 'react-native';
import type {
  StyleProp,
  TextInputProps,
  TextStyle,
} from 'react-native';
import {
  ControlSize,
  Radius,
  Spacing,
  Typography,
} from '../../theme';
import { useColors } from '../../context/ThemeContext';

export interface InputProps
  extends Omit<TextInputProps, 'style'> {
  placeholder: string;
  style?: StyleProp<TextStyle>;
  error?: boolean;
}

export const Input: React.FC<InputProps> = ({
  placeholder,
  style,
  error = false,
  onBlur,
  onFocus,
  ...props
}) => {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      {...props}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.actionPrimary}
      style={[
        styles.input,
        {
          color: colors.textPrimary,
          borderColor: error
            ? colors.statusCritical
            : focused
              ? colors.focusRing
              : colors.borderDefault,
          backgroundColor: colors.backgroundSurface,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    ...Typography.input,
    minHeight: ControlSize.input,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
});

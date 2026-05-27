import React, { useState } from 'react';
import { TextInput, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { Colors, Radius, Typography } from '../theme';
import { useThemeScheme } from '../context/ThemeContext';

interface InputProps extends TextInputProps {
  placeholder: string;
  style?: ViewStyle;
  error?: boolean;
}

export const Input: React.FC<InputProps> = ({
  placeholder,
  style,
  error = false,
  ...props
}) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      {...props}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      selectionColor={colors.primary}
      style={[
        styles.input,
        {
          color: colors.text,
          borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          backgroundColor: colors.bgSecondary,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    ...Typography.input,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 10,
  },
});

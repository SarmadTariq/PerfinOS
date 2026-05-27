import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing } from '../../theme';
import { Input, Text } from '../base';

/**
 * Labeled text input with optional error message.
 * Wraps the base Input component to add a semantic label and inline error display.
 *
 * @param label - Visible label text above the input
 * @param value - Current input value
 * @param onChangeText - Change handler
 * @param placeholder - Placeholder text
 * @param keyboardType - RN keyboard type (default: 'default')
 * @param error - Optional error message; if provided the input renders in error state
 * @param secureTextEntry - Hides text for password fields
 */
export const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: React.ComponentProps<typeof Input>['keyboardType'];
  error?: string;
  secureTextEntry?: boolean;
}) => (
  <View style={{ marginBottom: Spacing.md }}>
    <Text variant="bodySmall" style={styles.label}>
      {label}
    </Text>
    <Input
      accessibilityLabel={label}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      error={!!error}
    />
    {error ? (
      <Text accessibilityRole="alert" variant="bodySmall" color="danger" style={{ marginTop: -Spacing.sm }}>
        {error}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  label: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
});

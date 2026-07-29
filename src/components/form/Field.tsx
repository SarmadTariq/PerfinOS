import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import {
  Spacing,
  Typography,
} from '../../theme';
import {
  Input,
  Text,
} from '../base';

export interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: React.ComponentProps<
    typeof Input
  >['keyboardType'];
  error?: string;
  secureTextEntry?: boolean;
}

/**
 * Labeled text input with optional inline error text.
 */
export const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  secureTextEntry,
}) => (
  <View style={styles.field}>
    <Text
      variant="bodySmall"
      style={styles.label}
    >
      {label}
    </Text>

    <Input
      accessibilityLabel={label}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      error={Boolean(error)}
      style={styles.input}
    />

    {error ? (
      <Text
        accessibilityRole="alert"
        variant="bodySmall"
        color="danger"
        style={styles.error}
      >
        {error}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  field: {
    marginBottom: Spacing.md,
  },

  label: {
    fontWeight: Typography.label.fontWeight,
    marginBottom: Spacing.xs,
  },

  input: {
    marginBottom: 0,
  },

  error: {
    marginTop: Spacing.xs,
  },
});

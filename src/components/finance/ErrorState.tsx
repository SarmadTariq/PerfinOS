import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '../../theme';
import { Button, Text } from '../base';

/** Error state box with icon, title, message, and optional retry button. */
export const ErrorState = ({
  title = 'Something went wrong', message, onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) => (
  <View style={styles.box} accessibilityRole="alert">
    <View style={[styles.icon, { backgroundColor: '#FCEDEA' }]}>
      <MaterialIcons name="error-outline" size={34} color={Colors.light.danger} />
    </View>
    <Text variant="h4" style={{ marginTop: Spacing.md }}>{title}</Text>
    <Text variant="body" color="secondary" style={styles.message}>{message}</Text>
    {onRetry ? <Button label="Try Again" onPress={onRetry} variant="secondary" /> : null}
  </View>
);

const styles = StyleSheet.create({
  box: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1 },
  icon: { width: 64, height: 64, borderRadius: Radius.round, alignItems: 'center', justifyContent: 'center' },
  message: { marginTop: Spacing.sm, textAlign: 'center', maxWidth: 340 },
});

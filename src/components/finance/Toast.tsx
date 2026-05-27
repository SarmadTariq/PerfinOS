import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '../../theme';
import { Text } from '../base';

/** Floating toast notification. Renders nothing when `message` is null. */
export const Toast = ({ message, tone = 'success' }: { message: string | null; tone?: 'success' | 'danger' }) => {
  if (!message) return null;
  return (
    <View style={[styles.toast, { backgroundColor: tone === 'success' ? Colors.light.success : Colors.light.danger }]}>
      <Text variant="bodySmall" style={{ color: '#FFFFFF', fontWeight: '700' }}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, bottom: Spacing.lg, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
});

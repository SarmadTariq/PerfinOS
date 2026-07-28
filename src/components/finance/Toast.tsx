import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getToastColorTokens, Radius, Spacing } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import { Text } from '../base';

/** Floating toast notification. Renders nothing when `message` is null. */
export const Toast = ({ message, tone = 'success' }: { message: string | null; tone?: 'success' | 'danger' }) => {
  const colors = useColors();
  if (!message) return null;
  const colorTokens = getToastColorTokens(colors, tone);
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: colorTokens.background }]}
    >
      <Text variant="bodySmall" style={{ color: colorTokens.foreground, fontWeight: '700' }}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, bottom: Spacing.lg, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center' },
});

import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';
import { Text } from '../base';

/** Centered spinner with a descriptive loading label. */
export const LoadingState = ({ label = 'Loading PerFin OS data...' }: { label?: string }) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={styles.box} accessibilityRole="progressbar">
      <ActivityIndicator color={colors.primary} />
      <Text variant="body" color="secondary" style={{ marginTop: Spacing.md }}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1 },
});

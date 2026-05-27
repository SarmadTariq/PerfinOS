import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius } from '../../theme';
import { clamp } from '../../utils/format';

/** Horizontal progress bar. `value` is 0–100. Clamps automatically. */
export const ProgressBar = ({ value, color, height = 9 }: { value: number; color?: string; height?: number }) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={[styles.track, { height, backgroundColor: colors.bgTertiary }]}>
      <View style={[styles.fill, { width: `${clamp(value)}%`, backgroundColor: color || colors.primary }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: Radius.round, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.round },
});

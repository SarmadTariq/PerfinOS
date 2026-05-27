import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing } from '../../theme';

/** Flex-wrap grid container for StatCard components. */
export const MetricGrid = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.grid}>{children}</View>
);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
});

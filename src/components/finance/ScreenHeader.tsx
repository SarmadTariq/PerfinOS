import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing } from '../../theme';
import { Text } from '../base';

/** Displays a screen title, optional subtitle, and an optional action element (e.g., back button). */
export const ScreenHeader = ({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <View style={styles.header}>
    <View style={{ flex: 1 }}>
      <Text variant="h2">{title}</Text>
      {subtitle ? (
        <Text variant="body" color="secondary" style={{ marginTop: Spacing.xs }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
    {action}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
});

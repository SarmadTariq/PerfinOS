import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { Spacing } from '../../theme';
import { Text } from '../base';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/**
 * Displays a screen title, optional supporting text,
 * and an optional action.
 */
export const ScreenHeader: React.FC<
  ScreenHeaderProps
> = ({
  title,
  subtitle,
  action,
}) => (
  <View style={styles.header}>
    <View style={styles.content}>
      <Text variant="h2">
        {title}
      </Text>

      {subtitle ? (
        <Text
          variant="body"
          color="secondary"
          style={styles.subtitle}
        >
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

  content: {
    flex: 1,
  },

  subtitle: {
    marginTop: Spacing.xs,
  },
});

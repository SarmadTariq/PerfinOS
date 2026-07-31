import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Spacing } from '../../theme';
import { Text } from '../base';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  leading?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}

/** Compact application header with native leading and trailing action slots. */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  eyebrow,
  leading,
  action,
  compact = false,
}) => (
  <View style={[styles.header, compact && styles.compactHeader]}>
    {leading ? <View style={styles.leading}>{leading}</View> : null}

    <View style={styles.content}>
      {eyebrow ? (
        <Text variant="caption" color="secondary" style={styles.eyebrow}>
          {eyebrow}
        </Text>
      ) : null}

      <Text variant={compact ? 'h3' : 'h2'} numberOfLines={2}>
        {title}
      </Text>

      {subtitle ? (
        <Text
          variant={compact ? 'bodySmall' : 'body'}
          color="secondary"
          style={styles.subtitle}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>

    {action ? <View style={styles.action}>{action}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  compactHeader: {
    marginBottom: Spacing.lg,
  },
  leading: {
    paddingTop: Spacing.xs,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  action: {
    paddingTop: Spacing.xs,
  },
  eyebrow: {
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
});

import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  StyleSheet,
  View,
} from 'react-native';
import { useColors } from '../../context/ThemeContext';
import {
  Radius,
  Spacing,
} from '../../theme/index';
import { Button, Text } from '../base';

export interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ComponentProps<
    typeof MaterialIcons
  >['name'];
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Empty state with context and an optional recovery action.
 */
export const EmptyState = ({
  title,
  message,
  icon = 'inbox',
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  const colors = useColors();

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={title}
      style={[
        styles.box,
        {
          backgroundColor:
            colors.backgroundSurface,
          borderColor:
            colors.borderDefault,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor:
              colors.actionPrimarySoft,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={Spacing.xxxl}
          color={colors.actionPrimary}
        />
      </View>

      <Text
        variant="h4"
        style={styles.title}
      >
        {title}
      </Text>

      <Text
        variant="body"
        color="secondary"
        style={styles.message}
      >
        {message}
      </Text>

      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    minHeight:
      Spacing.section * 3 +
      Spacing.xxl +
      Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },

  icon: {
    width: Spacing.section,
    height: Spacing.section,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    marginTop: Spacing.md,
  },

  message: {
    maxWidth:
      Spacing.section * 5 +
      Spacing.xl,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  action: {
    marginTop: Spacing.lg,
  },
});

import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { Radius, Spacing } from '../../theme';
import { Button, Text } from '../base';

export interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

/** Empty state that defaults to a compact in-flow presentation. */
export const EmptyState = ({
  title,
  message,
  icon = 'inbox',
  actionLabel,
  onAction,
  compact = true,
}: EmptyStateProps) => {
  const colors = useColors();

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={title}
      style={[
        styles.box,
        compact ? styles.compactBox : styles.expandedBox,
        {
          backgroundColor: colors.backgroundSurface,
          borderColor: colors.borderDefault,
        },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.icon,
            compact && styles.compactIcon,
            { backgroundColor: colors.actionPrimarySoft },
          ]}
        >
          <MaterialIcons
            name={icon}
            size={compact ? Spacing.xl : Spacing.xxxl}
            color={colors.actionPrimary}
          />
        </View>

        <View style={styles.copy}>
          <Text variant="h4">{title}</Text>
          <Text variant="bodySmall" color="secondary" style={styles.message}>
            {message}
          </Text>
        </View>
      </View>

      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          size="sm"
          style={styles.action}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  compactBox: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  expandedBox: {
    minHeight: Spacing.section * 3,
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    width: Spacing.section,
    height: Spacing.section,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIcon: {
    width: Spacing.display,
    height: Spacing.display,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  message: {
    marginTop: Spacing.xs,
  },
  action: {
    alignSelf: 'flex-start',
  },
});

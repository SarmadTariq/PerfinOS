import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';
import { Button, Text } from '../base';

/** Full-box empty state with icon, title, message, and optional action button. */
export const EmptyState = ({
  title, message, icon = 'inbox', actionLabel, onAction,
}: {
  title: string;
  message: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  actionLabel?: string;
  onAction?: () => void;
}) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={[styles.box, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]} accessibilityRole="summary">
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <MaterialIcons name={icon} size={34} color={colors.primary} />
      </View>
      <Text variant="h4" style={{ marginTop: Spacing.md }}>{title}</Text>
      <Text variant="body" color="secondary" style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={{ marginTop: Spacing.lg }} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1 },
  icon: { width: 64, height: 64, borderRadius: Radius.round, alignItems: 'center', justifyContent: 'center' },
  message: { marginTop: Spacing.sm, textAlign: 'center', maxWidth: 340 },
});

import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { Radius, Spacing } from '../../theme';
import { Text } from '../base';

export interface ExpandableSectionProps {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const ExpandableSection = ({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: ExpandableSectionProps) => {
  const colors = useColors();

  return (
    <View style={[styles.section, { backgroundColor: colors.backgroundSurface, borderColor: colors.borderDefault }]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
        activeOpacity={0.76}
        onPress={onToggle}
        style={styles.header}
      >
        <View style={styles.copy}>
          <Text variant="h4">{title}</Text>
          {subtitle ? <Text variant="bodySmall" color="secondary">{subtitle}</Text> : null}
        </View>
        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {expanded ? <View style={[styles.content, { borderTopColor: colors.borderSubtle }]}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  header: {
    minHeight: Spacing.section,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  content: {
    borderTopWidth: 1,
    padding: Spacing.lg,
  },
});

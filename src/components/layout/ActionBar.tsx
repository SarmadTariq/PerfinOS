import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../context/ThemeContext';
import { Radius, Shadows, Spacing } from '../../theme';

export interface ActionBarProps {
  children: React.ReactNode;
  align?: 'start' | 'end' | 'stretch';
}

/** Safe bottom action surface for focused flows and contextual actions. */
export const ActionBar = ({ children, align = 'end' }: ActionBarProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <View
        style={[
          styles.bar,
          styles[align],
          {
            paddingBottom: Math.max(insets.bottom, Spacing.sm),
            backgroundColor: colors.backgroundElevated,
            borderColor: colors.borderDefault,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: 0,
  },
  bar: {
    minHeight: Spacing.section,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    ...Shadows.md,
  },
  start: { justifyContent: 'flex-start' },
  end: { justifyContent: 'flex-end' },
  stretch: { justifyContent: 'space-between' },
});

import React from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../context/ThemeContext';
import { Spacing } from '../../theme';

const WIDE_VIEWPORT_WIDTH = 900;

export interface AppScrollProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  bottomInset?: number;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
}

/** Standard safe-area container with a compact tab-aware content inset. */
export const AppScroll: React.FC<AppScrollProps> = ({
  children,
  contentContainerStyle,
  bottomInset,
  scrollProps,
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPadding = width >= WIDE_VIEWPORT_WIDTH ? Spacing.xxxl : Spacing.lg;
  const resolvedBottomInset = bottomInset ?? Math.max(insets.bottom, Spacing.lg) + Spacing.section;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundCanvas }]}>
      <ScrollView
        {...scrollProps}
        style={[styles.scrollView, scrollProps?.style]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: resolvedBottomInset },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps={scrollProps?.keyboardShouldPersistTaps ?? 'handled'}
        showsVerticalScrollIndicator={scrollProps?.showsVerticalScrollIndicator ?? false}
      >
        <View style={styles.pageFrame}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Spacing.lg,
  },
  pageFrame: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
});

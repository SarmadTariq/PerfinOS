import React from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Spacing } from '../../theme';

/**
 * Full-screen scrollable layout wrapper.
 * Automatically adjusts horizontal padding for wide viewports (≥900px).
 * Wrap all standard screen content in this component.
 *
 * @param children - Screen content
 */
export const AppScroll = ({ children }: { children: React.ReactNode }) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const { width } = useWindowDimensions();
  const horizontalPadding = width >= 900 ? Spacing.xxxl : Spacing.lg;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled
        showsVerticalScrollIndicator={false}
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
    paddingVertical: Spacing.xl,
    paddingBottom: 180,
    flexGrow: 1,
  },
  pageFrame: {
    width: '100%',
    // height: "100%",
    maxWidth: 1180,
    alignSelf: 'center',
  },
});

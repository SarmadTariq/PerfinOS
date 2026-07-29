import React from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import type {
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../../context/ThemeContext';
import { Spacing } from '../../theme';

const WIDE_VIEWPORT_WIDTH = 900;

const BOTTOM_CONTENT_INSET =
  Spacing.section * 2 +
  Spacing.xxxl +
  Spacing.xl;

export interface AppScrollProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Full-screen scrollable layout for standard app pages.
 */
export const AppScroll: React.FC<AppScrollProps> = ({
  children,
  contentContainerStyle,
}) => {
  const colors = useColors();
  const { width } = useWindowDimensions();

  const horizontalPadding =
    width >= WIDE_VIEWPORT_WIDTH
      ? Spacing.xxxl
      : Spacing.lg;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colors.backgroundCanvas,
        },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal:
              horizontalPadding,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageFrame}>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingVertical: Spacing.xl,
    paddingBottom: BOTTOM_CONTENT_INSET,
    flexGrow: 1,
  },

  pageFrame: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
});

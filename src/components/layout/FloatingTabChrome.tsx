import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ControlSize, Spacing } from '../../theme/index';

export const FLOATING_TAB_BAR_HEIGHT =
  ControlSize.minimumTouchTarget + Spacing.lg;

// FLOATING_TAB_GEOMETRY_F3
export const FLOATING_TAB_BAR_HORIZONTAL_INSET =
  Spacing.xl;

export const FLOATING_TAB_BAR_MAX_WIDTH =
  400;

export const FLOATING_TAB_BAR_BOTTOM_GAP =
  Spacing.sm;

export const FLOATING_TAB_ACTION_GAP =
  Spacing.xl;

export const getFloatingTabBottomOffset = (
  safeAreaBottom: number,
) =>
  Math.max(
    safeAreaBottom,
    FLOATING_TAB_BAR_BOTTOM_GAP,
  ) + FLOATING_TAB_BAR_HEIGHT;

export const FloatingActionLayer = ({
  children,
}: PropsWithChildren) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.actionLayer,
        {
          bottom:
            getFloatingTabBottomOffset(
              insets.bottom,
            ) + FLOATING_TAB_ACTION_GAP,
        },
      ]}
    >
      {children}
    </View>
  );
};

export const RootTabBottomSpacer = () => {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height:
          getFloatingTabBottomOffset(
            insets.bottom,
          ) + Spacing.xl,
      }}
    />
  );
};

const styles = StyleSheet.create({
  actionLayer: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 30,
    alignItems: 'flex-end',
  },
});

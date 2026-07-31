import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  Brand,
  Spacing,
  Typography,
} from '../../theme/index';
import { useColors } from '../../context/ThemeContext';
import {
  BrandSymbol,
} from './BrandSymbol';
import type {
  BrandSymbolProps,
} from './BrandSymbol';

export interface BrandMarkProps
  extends Omit<BrandSymbolProps, 'style'> {
  showExpandedName?: boolean;
  alignment?: 'horizontal' | 'stacked';
  style?: StyleProp<ViewStyle>;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  size = 48,
  appearance = 'auto',
  decorative = false,
  accessibilityLabel,
  showExpandedName = false,
  alignment = 'horizontal',
  style,
}) => {
  const colors = useColors();
  const stacked = alignment === 'stacked';

  const label = showExpandedName
    ? `${Brand.name}, ${Brand.expandedName}`
    : Brand.name;

  return (
    <View
      accessible={!decorative}
      accessibilityRole={
        decorative ? undefined : 'image'
      }
      accessibilityLabel={
        decorative
          ? undefined
          : accessibilityLabel ?? label
      }
      accessibilityElementsHidden={decorative}
      importantForAccessibility={
        decorative
          ? 'no-hide-descendants'
          : 'auto'
      }
      style={[
        styles.container,
        stacked
          ? styles.stacked
          : styles.horizontal,
        style,
      ]}
    >
      <BrandSymbol
        size={size}
        appearance={appearance}
        decorative
      />

      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.textGroup,
          stacked
            ? styles.stackedText
            : styles.horizontalText,
        ]}
      >
        <Text
          style={[
            Typography.title,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          {Brand.name}
        </Text>

        {showExpandedName ? (
          <Text
            style={[
              Typography.bodySmall,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {Brand.expandedName}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },

  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  stacked: {
    alignItems: 'center',
  },

  textGroup: {
    flexShrink: 1,
  },

  horizontalText: {
    marginLeft: Spacing.md,
  },

  stackedText: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
});

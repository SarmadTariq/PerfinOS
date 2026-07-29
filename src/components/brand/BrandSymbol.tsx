import React from 'react';
import { Image } from 'react-native';
import type {
  ImageStyle,
  StyleProp,
} from 'react-native';
import {
  Brand,
  BrandAssets,
} from '../../theme';
import { useThemeScheme } from '../../context/ThemeContext';

export type BrandSymbolAppearance =
  | 'auto'
  | 'light'
  | 'dark'
  | 'monochromeBlack'
  | 'monochromeWhite';

export interface BrandSymbolProps {
  size?: number;
  appearance?: BrandSymbolAppearance;
  decorative?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
}

export const BrandSymbol: React.FC<BrandSymbolProps> = ({
  size = 48,
  appearance = 'auto',
  decorative = false,
  accessibilityLabel,
  style,
}) => {
  const scheme = useThemeScheme();

  const resolvedAppearance =
    appearance === 'auto'
      ? scheme
      : appearance;

  const source = {
    light: BrandAssets.symbol.light,
    dark: BrandAssets.symbol.dark,
    monochromeBlack:
      BrandAssets.symbol.monochromeBlack,
    monochromeWhite:
      BrandAssets.symbol.monochromeWhite,
  }[resolvedAppearance];

  return (
    <Image
      source={source}
      resizeMode="contain"
      accessible={!decorative}
      accessibilityRole={
        decorative ? undefined : 'image'
      }
      accessibilityLabel={
        decorative
          ? undefined
          : accessibilityLabel ?? Brand.name
      }
      accessibilityElementsHidden={decorative}
      importantForAccessibility={
        decorative
          ? 'no-hide-descendants'
          : 'auto'
      }
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
};

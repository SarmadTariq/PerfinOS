import type { ImageSourcePropType } from 'react-native';

/**
 * Approved PF-235 symbol assets.
 *
 * Do not tint, reconstruct, recolour, or replace these sources from component
 * code. Appearance selection must use one of these approved variants.
 */
const symbol = Object.freeze({
  dark: require('../assets/brand/perfin-symbol-dark.png') as ImageSourcePropType,
  light: require('../assets/brand/perfin-symbol-light.png') as ImageSourcePropType,
  monochromeWhite: require(
    '../assets/brand/perfin-symbol-monochrome-white.png'
  ) as ImageSourcePropType,
  monochromeBlack: require(
    '../assets/brand/perfin-symbol-monochrome-black.png'
  ) as ImageSourcePropType,
});

export const BrandAssets = Object.freeze({
  symbol,
});

export type BrandSymbolAsset = keyof typeof BrandAssets.symbol;

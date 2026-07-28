import React from 'react';
import {
  Image,
  type ImageStyle,
  type StyleProp,
  StyleSheet,
} from 'react-native';
import { useThemeScheme } from '../context/ThemeContext';

const lockupDark = require('../../assets/brand/perfin-lockup-dark.png');
const lockupLight = require('../../assets/brand/perfin-lockup-light.png');
const symbolPrimary = require('../../assets/splash-icon.png');

type BrandAssetProps = {
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
};

export const BrandLockup = ({
  accessibilityLabel = 'PerFin OS',
  style,
}: BrandAssetProps) => {
  const scheme = useThemeScheme();
  const source = scheme === 'dark' ? lockupLight : lockupDark;

  return (
    <Image
      source={source}
      resizeMode="contain"
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
      style={[styles.lockup, style]}
    />
  );
};

export const BrandSymbol = ({
  accessibilityLabel = 'PerFin OS',
  style,
}: BrandAssetProps) => (
  <Image
    source={symbolPrimary}
    resizeMode="contain"
    accessibilityLabel={accessibilityLabel}
    accessibilityIgnoresInvertColors
    style={[styles.symbol, style]}
  />
);

const styles = StyleSheet.create({
  lockup: {
    width: 158,
    height: 50,
  },
  symbol: {
    width: 56,
    height: 56,
  },
});

import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';

/**
 * Native platform font family.
 *
 * iOS resolves to San Francisco through System.
 * Android resolves to Roboto.
 * Web uses the browser and React Native Web defaults.
 */
const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: undefined,
}) as string | undefined;

const tabularNumerals: TextStyle['fontVariant'] = [
  'tabular-nums',
];

/**
 * Typography roles for PerFin OS.
 *
 * Existing keys remain available during migration.
 * New roles describe product function rather than screen-specific styling.
 */
export const Typography = {
  display: {
    fontSize: 40,
    fontWeight: '800' as const,
    lineHeight: 48,
    letterSpacing: -0.8,
    fontFamily,
  },

  titleLarge: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 38,
    letterSpacing: -0.4,
    fontFamily,
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 25,
    fontFamily,
  },

  moneyHero: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 43,
    letterSpacing: -0.5,
    fontVariant: tabularNumerals,
    fontFamily,
  },

  moneyPrimary: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
    fontVariant: tabularNumerals,
    fontFamily,
  },

  moneySecondary: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
    fontVariant: tabularNumerals,
    fontFamily,
  },

  h1: {
    fontSize: 30,
    fontWeight: '700' as const,
    lineHeight: 36,
    fontFamily,
  },

  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
    fontFamily,
  },

  h3: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
    fontFamily,
  },

  h4: {
    fontSize: 17,
    fontWeight: '700' as const,
    lineHeight: 24,
    fontFamily,
  },

  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 23,
    fontFamily,
  },

  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    fontFamily,
  },

  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
    fontFamily,
  },

  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 15,
    fontFamily,
  },

  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
    fontFamily,
  },

  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    fontFamily,
  },

  input: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 21,
    fontFamily,
  },
} as const;

export type TypographyToken = keyof typeof Typography;

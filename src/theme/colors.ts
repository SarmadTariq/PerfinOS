/**
 * Color palette for PerFin OS.
 *
 * Rule:
 * - React components use useColors().
 * - Non-component helpers use getThemeColor().
 * - Views must not index Colors with a loose string.
 * - Views must not put raw color strings directly inside React Native style arrays.
 */

export type ThemeScheme = 'light' | 'dark';

export const BrandColors = {
  ink: '#111827',
  blue: '#6C74E6',
  blueLight: '#AEB4FF',
  paper: '#F8FAFC',
  budgetMint: '#58B87B',
  reportViolet: '#8D63D5',
  insightTeal: '#2AA6A4',
  goalOrange: '#E9823C',
} as const;

export type ThemeColors = {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  primary: string;
  primarySoft: string;
  success: string;
  danger: string;
  warning: string;
  card: string;
  surfaceWarm: string;
  surfaceBlue: string;
};

export type ThemeColorToken = keyof ThemeColors;

export const Colors: Record<ThemeScheme, ThemeColors> = {
  light: {
    bg: BrandColors.paper,
    bgSecondary: '#FFFFFF',
    bgTertiary: '#ECECEC',
    text: BrandColors.ink,
    textSecondary: '#4A4A4A',
    textTertiary: '#777777',
    border: '#D6D6D6',
    borderLight: '#EEEEEE',
    primary: BrandColors.blue,
    primarySoft: '#E8F2FF',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
    card: '#FFFFFF',
    surfaceWarm: '#F2F2F2',
    surfaceBlue: '#E8F2FF',
  },
  dark: {
    bg: BrandColors.ink,
    bgSecondary: '#171717',
    bgTertiary: '#242424',
    text: BrandColors.paper,
    textSecondary: '#C9C9C9',
    textTertiary: '#929292',
    border: '#363636',
    borderLight: '#282828',
    primary: BrandColors.blueLight,
    primarySoft: '#1A2E44',
    success: '#32D74B',
    danger: '#FF453A',
    warning: '#FF9F0A',
    card: '#171717',
    surfaceWarm: '#202020',
    surfaceBlue: '#1A2E44',
  },
};

export const getThemeColor = (scheme: ThemeScheme | null | undefined): ThemeColors =>
  scheme === 'dark' ? Colors.dark : Colors.light;

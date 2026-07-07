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
    bg: '#F7F7F7',
    bgSecondary: '#FFFFFF',
    bgTertiary: '#ECECEC',
    text: '#111111',
    textSecondary: '#4A4A4A',
    textTertiary: '#777777',
    border: '#D6D6D6',
    borderLight: '#EEEEEE',
    primary: '#007AFF',
    primarySoft: '#E8F2FF',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
    card: '#FFFFFF',
    surfaceWarm: '#F2F2F2',
    surfaceBlue: '#E8F2FF',
  },
  dark: {
    bg: '#0F0F0F',
    bgSecondary: '#171717',
    bgTertiary: '#242424',
    text: '#F5F5F5',
    textSecondary: '#C9C9C9',
    textTertiary: '#929292',
    border: '#363636',
    borderLight: '#282828',
    primary: '#0A84FF',
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

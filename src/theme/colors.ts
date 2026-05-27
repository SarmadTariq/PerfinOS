/**
 * Color palette for PerFin OS — light and dark variants.
 * All UI components reference these tokens; never use raw hex values in views.
 */
export const Colors = {
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

/**
 * Returns the color palette for the given color scheme.
 * @param scheme - 'light' | 'dark' | null | undefined
 * @returns Light or dark color tokens
 */
export const getThemeColor = (scheme: 'light' | 'dark' | null | undefined) =>
  scheme === 'dark' ? Colors.dark : Colors.light;

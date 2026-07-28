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
  primaryControl: string;
  onPrimary: string;
  success: string;
  successControl: string;
  onSuccess: string;
  danger: string;
  dangerControl: string;
  onDanger: string;
  warning: string;
  warningControl: string;
  onWarning: string;
  income: string;
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
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
    primaryControl: '#5860D6',
    onPrimary: BrandColors.paper,
    success: '#34C759',
    successControl: '#246B45',
    onSuccess: BrandColors.paper,
    danger: '#FF3B30',
    dangerControl: '#B42318',
    onDanger: BrandColors.paper,
    warning: '#FF9500',
    warningControl: '#A15C00',
    onWarning: BrandColors.paper,
    income: '#1E8E5A',
    incomeSoft: '#DFF4E9',
    expense: '#B42318',
    expenseSoft: '#FDE7E4',
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
    primaryControl: BrandColors.blueLight,
    onPrimary: BrandColors.ink,
    success: '#32D74B',
    successControl: '#58D981',
    onSuccess: BrandColors.ink,
    danger: '#FF453A',
    dangerControl: '#FF8A82',
    onDanger: BrandColors.ink,
    warning: '#FF9F0A',
    warningControl: '#FFC266',
    onWarning: BrandColors.ink,
    income: '#58D981',
    incomeSoft: '#123525',
    expense: '#FF8A82',
    expenseSoft: '#3F1714',
    card: '#171717',
    surfaceWarm: '#202020',
    surfaceBlue: '#1A2E44',
  },
};

export const getThemeColor = (scheme: ThemeScheme | null | undefined): ThemeColors =>
  scheme === 'dark' ? Colors.dark : Colors.light;

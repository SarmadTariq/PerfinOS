import { Brand } from './brand';
import type {
  ThemeColors,
  ThemeColorToken,
  ThemeScheme,
} from './types';

export type {
  ThemeColors,
  ThemeColorToken,
  ThemeScheme,
} from './types';

/**
 * Stable identity and feature palette references.
 *
 * Brand artwork files remain immutable. These constants support interface
 * tokens and feature-specific palette consumers.
 */
export const BrandColors = {
  ink: Brand.ink,
  blue: Brand.terminalBlue,
  blueLight: '#A9B7FF',
  paper: Brand.lightCanvas,
  white: Brand.white,

  budgetMint: '#58B87B',
  reportViolet: '#8D63D5',
  insightTeal: '#2AA6A4',
  goalOrange: '#E9823C',
} as const;

/**
 * Primitive values used to construct semantic light-theme tokens.
 *
 * Raw interface colour values should remain inside approved theme source
 * files rather than being repeated in components or screens.
 */
const lightPrimitives = {
  canvas: Brand.lightCanvas,
  surface: Brand.white,
  subtle: '#F2F4F7',
  elevated: Brand.white,

  textPrimary: Brand.ink,
  textSecondary: '#3F4652',
  textMuted: '#6B7280',
  textInverse: Brand.white,

  borderDefault: '#D1D5DB',
  borderSubtle: '#E5E7EB',
  borderStrong: '#9CA3AF',

  actionPrimary: Brand.terminalBlue,
  actionPrimaryPressed: '#3048C9',
  actionPrimarySoft: '#E8ECFF',

  positive: '#167C4B',
  warning: '#925600',
  critical: '#C6372B',
  informational: '#285E8E',

  income: '#167C4B',
  expense: '#C6372B',
  transfer: '#4B6FB4',

  focusRing: Brand.terminalBlue,
  overlay: 'rgba(11, 12, 14, 0.55)',
} as const;

/**
 * Primitive values used to construct semantic dark-theme tokens.
 */
const darkPrimitives = {
  canvas: Brand.ink,
  surface: '#15171C',
  subtle: '#1D2026',
  elevated: '#23262D',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD1DA',
  textMuted: '#9199A6',
  textInverse: Brand.ink,

  borderDefault: '#343943',
  borderSubtle: '#252A32',
  borderStrong: '#56606F',

  actionPrimary: BrandColors.blueLight,
  actionPrimaryPressed: '#C0C9FF',
  actionPrimarySoft: '#232B52',

  positive: '#53D38B',
  warning: '#F2B84B',
  critical: '#FF756A',
  informational: '#69A9E0',

  income: '#53D38B',
  expense: '#FF756A',
  transfer: '#8EA8F2',

  focusRing: BrandColors.blueLight,
  overlay: 'rgba(0, 0, 0, 0.68)',
} as const;

const lightSemantic = {
  backgroundCanvas: lightPrimitives.canvas,
  backgroundSurface: lightPrimitives.surface,
  backgroundSubtle: lightPrimitives.subtle,
  backgroundElevated: lightPrimitives.elevated,

  textPrimary: lightPrimitives.textPrimary,
  textSecondary: lightPrimitives.textSecondary,
  textMuted: lightPrimitives.textMuted,
  textInverse: lightPrimitives.textInverse,

  borderDefault: lightPrimitives.borderDefault,
  borderSubtle: lightPrimitives.borderSubtle,
  borderStrong: lightPrimitives.borderStrong,

  actionPrimary: lightPrimitives.actionPrimary,
  actionPrimaryPressed: lightPrimitives.actionPrimaryPressed,
  actionPrimarySoft: lightPrimitives.actionPrimarySoft,

  statusPositive: lightPrimitives.positive,
  statusWarning: lightPrimitives.warning,
  statusCritical: lightPrimitives.critical,
  statusInformational: lightPrimitives.informational,

  amountIncome: lightPrimitives.income,
  amountExpense: lightPrimitives.expense,
  amountTransfer: lightPrimitives.transfer,

  focusRing: lightPrimitives.focusRing,
  overlay: lightPrimitives.overlay,
} as const;

const darkSemantic = {
  backgroundCanvas: darkPrimitives.canvas,
  backgroundSurface: darkPrimitives.surface,
  backgroundSubtle: darkPrimitives.subtle,
  backgroundElevated: darkPrimitives.elevated,

  textPrimary: darkPrimitives.textPrimary,
  textSecondary: darkPrimitives.textSecondary,
  textMuted: darkPrimitives.textMuted,
  textInverse: darkPrimitives.textInverse,

  borderDefault: darkPrimitives.borderDefault,
  borderSubtle: darkPrimitives.borderSubtle,
  borderStrong: darkPrimitives.borderStrong,

  actionPrimary: darkPrimitives.actionPrimary,
  actionPrimaryPressed: darkPrimitives.actionPrimaryPressed,
  actionPrimarySoft: darkPrimitives.actionPrimarySoft,

  statusPositive: darkPrimitives.positive,
  statusWarning: darkPrimitives.warning,
  statusCritical: darkPrimitives.critical,
  statusInformational: darkPrimitives.informational,

  amountIncome: darkPrimitives.income,
  amountExpense: darkPrimitives.expense,
  amountTransfer: darkPrimitives.transfer,

  focusRing: darkPrimitives.focusRing,
  overlay: darkPrimitives.overlay,
} as const;

export const Colors: Record<ThemeScheme, ThemeColors> = {
  light: { ...lightSemantic },
  dark: { ...darkSemantic },
};

export const getThemeColor = (
  scheme: ThemeScheme | null | undefined,
): ThemeColors => (
  scheme === 'dark'
    ? Colors.dark
    : Colors.light
);

/**
 * Compile-time helper for consumers that accept a token name rather than a
 * complete colour object.
 */
export const getColorToken = (
  scheme: ThemeScheme | null | undefined,
  token: ThemeColorToken,
): string => getThemeColor(scheme)[token];

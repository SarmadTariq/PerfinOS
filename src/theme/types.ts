/**
 * Public theme contracts for PerFin OS.
 *
 * Semantic keys describe purpose.
 * Compatibility keys keep current consumers working during PF-236 migration.
 */

export type ThemeScheme = 'light' | 'dark';

export type ThemeColors = {
  /*
   * Semantic surface tokens
   */
  backgroundCanvas: string;
  backgroundSurface: string;
  backgroundSubtle: string;
  backgroundElevated: string;

  /*
   * Semantic text tokens
   */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  /*
   * Semantic border tokens
   */
  borderDefault: string;
  borderSubtle: string;
  borderStrong: string;

  /*
   * Semantic interaction tokens
   */
  actionPrimary: string;
  actionPrimaryPressed: string;
  actionPrimarySoft: string;
  focusRing: string;
  overlay: string;

  /*
   * Semantic status tokens
   */
  statusPositive: string;
  statusWarning: string;
  statusCritical: string;
  statusInformational: string;

  /*
   * Financial meaning tokens
   */
  amountIncome: string;
  amountExpense: string;
  amountTransfer: string;

  /*
   * Temporary compatibility aliases
   */
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  text: string;
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

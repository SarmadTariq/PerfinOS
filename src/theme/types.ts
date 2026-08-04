/**
 * Public theme contracts for PerFin OS.
 *
 * Semantic keys describe purpose across light and dark themes.
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

};

export type ThemeColorToken = keyof ThemeColors;

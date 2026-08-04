/**
 * Public design-system entry point for PerFin OS.
 *
 * Import theme contracts and tokens from this directory.
 */

export { BrandColors, Colors, getThemeColor } from './colors';
export { Typography } from './typography';
export {
  Spacing,
  Radius,
  Shadows,
  Container,
  ControlSize,
} from './spacing';

export { Brand } from './brand';
export type { BrandMetadata } from './brand';

export { BrandAssets } from './assets';
export type { BrandSymbolAsset } from './assets';

export {
  Motion,
  MotionDuration,
  ReducedMotionDuration,
} from './motion';
export type { MotionDurationToken } from './motion';

export { ChartColors } from './charts';
export type {
  ChartCategoryToken,
  FinancialChartToken,
} from './charts';

export type {
  ThemeColors,
  ThemeColorToken,
  ThemeScheme,
} from './types';

/**
 * @deprecated Import from `./theme/` instead.
 *
 * This compatibility shim re-exports the complete PF-236 theme surface while
 * existing imports are migrated to the canonical theme directory.
 */

export { BrandColors, Colors, getThemeColor } from './theme/colors';
export { Typography } from './theme/typography';
export {
  Spacing,
  Radius,
  Shadows,
  Container,
  ControlSize,
} from './theme/spacing';

export { Brand } from './theme/brand';
export type { BrandMetadata } from './theme/brand';

export { BrandAssets } from './theme/assets';
export type { BrandSymbolAsset } from './theme/assets';

export {
  Motion,
  MotionDuration,
  ReducedMotionDuration,
} from './theme/motion';
export type { MotionDurationToken } from './theme/motion';

export { ChartColors } from './theme/charts';
export type {
  ChartCategoryToken,
  FinancialChartToken,
} from './theme/charts';

export type {
  ThemeColors,
  ThemeColorToken,
  ThemeScheme,
} from './theme/types';

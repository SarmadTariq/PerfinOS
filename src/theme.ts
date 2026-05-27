/**
 * @deprecated Import from `./theme/` (the directory) instead.
 * This file is a backward-compatibility shim — it re-exports everything
 * from the split theme modules so existing imports keep working during migration.
 */
export { Colors, getThemeColor } from './theme/colors';
export { Typography } from './theme/typography';
export { Spacing, Radius, Shadows, Container } from './theme/spacing';

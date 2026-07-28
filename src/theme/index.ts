/**
 * Theme barrel — re-exports all design tokens for PerFin OS.
 *
 * Import from this file (or from `../theme`) to access any token.
 * The old `src/theme.ts` still exists as a backward-compat shim;
 * new code should import from this directory.
 *
 * @example
 * import { Colors, Spacing, Typography, Radius, Shadows } from '../../theme';
 */
export { BrandColors, Colors, getThemeColor } from './colors';
export { getButtonColorTokens, getToastColorTokens } from './componentTokens';
export { Typography } from './typography';
export { Spacing, Radius, Shadows, Container, ControlSize } from './spacing';

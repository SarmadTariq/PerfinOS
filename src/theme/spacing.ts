import { Brand } from './brand';

/**
 * Four-point spacing scale.
 *
 * Existing names remain stable during PF-236 migration.
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  display: 48,
  section: 64,
} as const;

/**
 * Minimum interactive and form-control dimensions.
 */
export const ControlSize = {
  minimumTouchTarget: 44,
  button: 48,
  input: 48,
  iconButton: 44,
} as const;

/**
 * Shared corner-radius scale.
 */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
} as const;

/**
 * Shared elevation primitives.
 *
 * Shadow colour is declared once and reused by every preset.
 */
export const ElevationPrimitive = {
  shadowColor: Brand.ink,
} as const;

/**
 * Cross-platform shadow presets.
 */
export const Shadows = {
  sm: {
    shadowColor: ElevationPrimitive.shadowColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  md: {
    shadowColor: ElevationPrimitive.shadowColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  lg: {
    shadowColor: ElevationPrimitive.shadowColor,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

/**
 * Default full-screen container foundation.
 */
export const Container = {
  flex: 1,
  paddingHorizontal: Spacing.lg,
  paddingVertical: Spacing.lg,
} as const;

export type SpacingToken = keyof typeof Spacing;
export type RadiusToken = keyof typeof Radius;
export type ShadowToken = keyof typeof Shadows;

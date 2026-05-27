/**
 * Spacing scale — use these tokens for margin/padding/gap throughout the app.
 * Multiples of 4 for visual consistency.
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

/**
 * Border-radius tokens.
 * `round` is suitable for pills/chips; `xl` for large cards.
 */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

/**
 * Elevation / shadow presets.
 * `sm` for subtle lift, `md` for cards, `lg` for modals/overlays.
 */
export const Shadows = {
  sm: {
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 16,
    elevation: 8,
  },
};

/**
 * Default full-screen container style.
 * Apply as a base when building screen root views.
 */
export const Container = {
  flex: 1,
  paddingHorizontal: Spacing.lg,
  paddingVertical: Spacing.lg,
};

/**
 * Shared interaction timing values.
 *
 * Reduced-motion durations resolve to zero so consuming components can disable
 * non-essential transitions without inventing local timing values.
 */
export const MotionDuration = {
  instant: 0,
  fast: 120,
  standard: 200,
  deliberate: 320,
} as const;

export const ReducedMotionDuration = {
  instant: 0,
  fast: 0,
  standard: 0,
  deliberate: 0,
} as const;

export const Motion = {
  duration: MotionDuration,
  reducedDuration: ReducedMotionDuration,
  scale: {
    enter: 0.92,
    pressed: 0.98,
    identity: 1,
  },
} as const;

export type MotionDurationToken = keyof typeof MotionDuration;

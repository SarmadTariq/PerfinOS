/**
 * Approved PerFin OS identity metadata.
 *
 * These constants describe the approved PF-235 identity and must stay aligned
 * with the immutable image assets protected by verify:brand-assets.
 */
export const Brand = Object.freeze({
  name: 'PerFin OS',
  expandedName: 'Personal Finance Operating System',
  symbolSlitCount: 2,
  ink: '#0B0C0E',
  terminalBlue: '#405EF0',
  lightCanvas: '#FDFDFD',
  white: '#FFFFFF',
} as const);

export type BrandMetadata = typeof Brand;

/**
 * Approved PerFin OS identity metadata.
 *
 * These constants describe the approved PerFin OS identity and must stay aligned
 * with the approved image assets under assets/ and src/assets/brand/.
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

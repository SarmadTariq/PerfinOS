import { Platform } from 'react-native';

/**
 * Platform-appropriate font family.
 * iOS uses San Francisco (System), Android uses Roboto, web falls back to browser default.
 */
const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: undefined,
}) as string | undefined;

/**
 * Typography scale for PerFin OS.
 * Use these named styles instead of raw fontSize/fontWeight in views.
 */
export const Typography = {
  h1: { fontSize: 30, fontWeight: '700' as const, lineHeight: 36, fontFamily },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 30, fontFamily },
  h3: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26, fontFamily },
  h4: { fontSize: 17, fontWeight: '700' as const, lineHeight: 24, fontFamily },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 23, fontFamily },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, fontFamily },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18, fontFamily },
  caption: { fontSize: 11, fontWeight: '500' as const, lineHeight: 15, fontFamily },
  title: { fontSize: 20, fontWeight: '700' as const, fontFamily },
  label: { fontSize: 13, fontWeight: '600' as const, fontFamily },
  input: { fontSize: 15, fontWeight: '400' as const, fontFamily },
};

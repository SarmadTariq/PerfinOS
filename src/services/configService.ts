/**
 * Application runtime configuration.
 * Values are injected via Expo public environment variables at build time.
 * Never commit real values — use `.env.local` or Expo secrets.
 */
const env = process.env || {};

/** Base URLs and API keys resolved from environment variables. */
export const appConfig = {
  /** PerFin OS Cloudflare Worker base URL (e.g. https://api.perfin-os.workers.dev) */
  apiBaseUrl: env.EXPO_PUBLIC_PERFIN_API_BASE_URL || '',
  /** Google Maps / Places API key for location search */
  googleMapsApiKey: env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
};

/** Flags indicating which external integrations are configured at runtime. */
export const integrationStatus = {
  hasPerFinApi: !!appConfig.apiBaseUrl,
  hasGoogleMapsKey: !!appConfig.googleMapsApiKey,
};

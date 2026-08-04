import {
  runtimeConfig,
} from './environment';

/** Base URLs and API keys resolved from environment variables. */
export const appConfig = {
  /** Non-secret runtime identity: local, preview, or production. */
  environmentName:
    runtimeConfig
      .environmentName,
  /** PerFin OS Cloudflare Worker base URL (e.g. https://api.perfin-os.workers.dev) */
  apiBaseUrl:
    runtimeConfig
      .apiBaseUrl,
  /** Google Maps / Places API key for location search */
  googleMapsApiKey:
    runtimeConfig
      .googleMapsApiKey,
  /** Public product namespace for store identifiers. This does not grant entitlement. */
  billingProductNamespace:
    runtimeConfig
      .billingProductNamespace,
};

/** Flags indicating which external integrations are configured at runtime. */
export const integrationStatus = {
  hasPerFinApi: !!appConfig.apiBaseUrl,
  hasGoogleMapsKey: !!appConfig.googleMapsApiKey,
};

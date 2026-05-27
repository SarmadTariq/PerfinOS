const env = process.env || {};

export const appConfig = {
  apiBaseUrl: env.EXPO_PUBLIC_PERFIN_API_BASE_URL || '',
  googleMapsApiKey: env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
};

export const integrationStatus = {
  hasPerFinApi: !!appConfig.apiBaseUrl,
  hasGoogleMapsKey: !!appConfig.googleMapsApiKey,
};

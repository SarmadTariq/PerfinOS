import {
  appEnvironment,
} from './environment';

const env = process.env || {};

export const appConfig = {
  environment: appEnvironment,
  apiBaseUrl: env.EXPO_PUBLIC_PERFIN_API_BASE_URL || '',
  googleMapsApiKey: env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
};

export const integrationStatus = {
  appEnvironment,
  hasPerFinApi: !!appConfig.apiBaseUrl,
  hasGoogleMapsKey: !!appConfig.googleMapsApiKey,
};

import type {
  AppEnvironmentName,
} from '../environment';

export type AppCheckPlatform =
  | 'web'
  | 'ios'
  | 'android'
  | 'unknown';

export type NativeAppCheckProvider =
  | 'none'
  | 'debug'
  | 'device_check'
  | 'app_attest'
  | 'play_integrity';

export type PlanAppCheckAvailability =
  | 'available'
  | 'not_configured'
  | 'native_provider_unavailable'
  | 'debug_provider_blocked';

export interface PlanAppCheckPolicyInput {
  environmentName: AppEnvironmentName;
  platform: AppCheckPlatform;
  webSiteKey: string;
  nativeProvider: NativeAppCheckProvider;
  debugTokenEnabled: boolean;
}

export const resolvePlanAppCheckAvailability =
  ({
    environmentName,
    platform,
    webSiteKey,
    nativeProvider,
    debugTokenEnabled,
  }: PlanAppCheckPolicyInput): PlanAppCheckAvailability => {
    if (
      environmentName === 'production' &&
      (
        nativeProvider === 'debug' ||
        debugTokenEnabled
      )
    ) {
      return 'debug_provider_blocked';
    }

    if (platform === 'web') {
      return webSiteKey.trim()
        ? 'available'
        : 'not_configured';
    }

    if (
      platform !== 'ios' &&
      platform !== 'android'
    ) {
      return 'native_provider_unavailable';
    }

    return 'native_provider_unavailable';
  };

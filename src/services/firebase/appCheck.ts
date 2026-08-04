import type {
  AppCheck,
} from 'firebase/app-check';

import {
  Platform,
} from 'react-native';

import {
  app,
} from './client';
import {
  runtimeConfig,
} from '../environment';
import {
  resolvePlanAppCheckAvailability,
  type NativeAppCheckProvider,
  type PlanAppCheckAvailability,
} from './appCheckPolicy';

export class PlanAppCheckUnavailableError
  extends Error {
  constructor(
    readonly reason:
      Exclude<
        PlanAppCheckAvailability,
        'available'
      >
  ) {
    super(reason);
  }
}

const webSiteKey =
  runtimeConfig
    .firebase
    .appCheckSiteKey ||
  null;

const nativeProvider =
  (
    process
      .env
      .EXPO_PUBLIC_FIREBASE_NATIVE_APP_CHECK_PROVIDER
      ?.trim() ||
    'none'
  ) as NativeAppCheckProvider;

const debugTokenEnabled =
  process
    .env
    .EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN_ENABLED ===
  'true';

let webAppCheckPromise:
  Promise<AppCheck> | null =
  null;

export const getPlanAppCheckAvailability =
  (): PlanAppCheckAvailability => {
    const availability =
      resolvePlanAppCheckAvailability({
        environmentName:
          runtimeConfig
            .environmentName,
        platform:
          Platform.OS === 'web' ||
          Platform.OS === 'ios' ||
          Platform.OS === 'android'
            ? Platform.OS
            : 'unknown',
        webSiteKey:
          webSiteKey || '',
        nativeProvider,
        debugTokenEnabled,
      });

    if (availability !== 'available') {
      return availability;
    }

    if (!app) {
      return 'not_configured';
    }

    return availability;
  };

const getWebAppCheck =
  async (): Promise<AppCheck> => {
    const availability =
      getPlanAppCheckAvailability();

    if (
      availability !==
      'available'
    ) {
      throw new PlanAppCheckUnavailableError(
        availability
      );
    }

    if (!webAppCheckPromise) {
      webAppCheckPromise =
        import(
          'firebase/app-check'
        ).then(
          ({
            initializeAppCheck,
            ReCaptchaEnterpriseProvider,
          }) =>
            initializeAppCheck(
              app!,
              {
                provider:
                  new ReCaptchaEnterpriseProvider(
                    webSiteKey!
                  ),

                isTokenAutoRefreshEnabled:
                  true,
              }
            )
        );
    }

    return webAppCheckPromise;
  };

export const getRemoteAppCheckToken =
  async (): Promise<string> => {
    const appCheck =
      await getWebAppCheck();

    const {
      getToken,
    } =
      await import(
        'firebase/app-check'
      );

    const result =
      await getToken(
        appCheck,
        false
      );

    const token =
      result.token.trim();

    if (!token) {
      throw new PlanAppCheckUnavailableError(
        'not_configured'
      );
    }

    return token;
  };

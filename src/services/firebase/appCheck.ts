import type {
  AppCheck as WebAppCheck,
} from 'firebase/app-check';

import {
  Platform,
} from 'react-native';

import {
  app,
} from './client';

export type PlanAppCheckAvailability =
  | 'available'
  | 'not_configured'
  | 'unsupported_platform';

type NativeAppCheckInstance = {
  getToken: (
    forceRefresh?: boolean
  ) => Promise<{
    token: string;
  }>;
};

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

const env =
  process.env || {};

const unsupportedPlatform:
  PlanAppCheckAvailability =
  'unsupported_platform';

const webSiteKey =
  env
    .EXPO_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY
    ?.trim() ||
  null;

let webAppCheckPromise:
  Promise<WebAppCheck> | null =
  null;

let nativeAppCheckPromise:
  Promise<NativeAppCheckInstance> | null =
  null;

const isNativeAppCheckPlatform =
  () =>
    Platform.OS === 'ios' ||
    Platform.OS === 'android';

const isDevelopmentBuild =
  () =>
    typeof __DEV__ !==
      'undefined' &&
    __DEV__;

export const getPlanAppCheckAvailability =
  (): PlanAppCheckAvailability => {
    if (
      Platform.OS === 'web'
    ) {
      if (
        !app ||
        !webSiteKey
      ) {
        return 'not_configured';
      }

      return 'available';
    }

    if (
      isNativeAppCheckPlatform()
    ) {
      return 'available';
    }

    return unsupportedPlatform;
  };

const getWebAppCheck =
  async (): Promise<WebAppCheck> => {
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

const getNativeAppCheck =
  async (): Promise<NativeAppCheckInstance> => {
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

    if (!nativeAppCheckPromise) {
      nativeAppCheckPromise =
        Promise.all([
          import(
            '@react-native-firebase/app'
          ),
          import(
            '@react-native-firebase/app-check'
          ),
        ]).then(
          async ([
            appModule,
            appCheckModule,
          ]) => {
            const provider =
              new appCheckModule.ReactNativeFirebaseAppCheckProvider();

            provider.configure({
              android: {
                provider:
                  isDevelopmentBuild()
                    ? 'debug'
                    : 'playIntegrity',
              },
              apple: {
                provider:
                  isDevelopmentBuild()
                    ? 'debug'
                    : 'appAttestWithDeviceCheckFallback',
              },
            });

            const nativeAppCheck =
              await appCheckModule.initializeAppCheck(
                appModule.getApp(),
                {
                  provider,
                  isTokenAutoRefreshEnabled:
                    true,
                }
              );

            return nativeAppCheck as unknown as NativeAppCheckInstance;
          }
        );
    }

    return nativeAppCheckPromise;
  };

export const getRemoteAppCheckToken =
  async (): Promise<string> => {
    const result =
      Platform.OS === 'web'
        ? await import(
            'firebase/app-check'
          ).then(
            async ({
              getToken,
            }) => {
              const appCheck =
                await getWebAppCheck();

              return getToken(
                appCheck,
                false
              );
            }
          )
        : await getNativeAppCheck().then(
            (appCheck) =>
              appCheck.getToken(false)
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

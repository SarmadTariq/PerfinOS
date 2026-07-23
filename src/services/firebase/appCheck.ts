import type {
  AppCheck,
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

const webSiteKey =
  env
    .EXPO_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY
    ?.trim() ||
  null;

let webAppCheckPromise:
  Promise<AppCheck> | null =
  null;

export const getPlanAppCheckAvailability =
  (): PlanAppCheckAvailability => {
    if (
      Platform.OS !== 'web'
    ) {
      return 'unsupported_platform';
    }

    if (
      !app ||
      !webSiteKey
    ) {
      return 'not_configured';
    }

    return 'available';
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

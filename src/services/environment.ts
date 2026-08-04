export type AppEnvironmentName =
  | 'local'
  | 'preview'
  | 'production';

export interface ExpoEnvironmentConfig {
  appDisplayName: string;
  iosBundleIdentifier: string;
  androidPackage: string;
  workerName: string;
  r2BucketName: string;
  billingProductNamespace: string;
}

export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  appCheckSiteKey: string;
}

export interface PublicRuntimeConfig {
  environmentName: AppEnvironmentName;
  firebase: FirebasePublicConfig;
  firebaseConfigured: boolean;
  apiBaseUrl: string;
  googleMapsApiKey: string;
  billingProductNamespace: string;
}

type RawPublicEnv =
  Record<
    string,
    string | undefined
  >;

const expoEnvironmentConfig: Record<AppEnvironmentName, ExpoEnvironmentConfig> = {
  local: {
    appDisplayName: 'PerFin OS Local',
    iosBundleIdentifier: 'com.yashkanadhia.perfinos.local',
    androidPackage: 'com.yashkanadhia.perfinos.local',
    workerName: 'perfin-os-local',
    r2BucketName: 'perfin-os-local-receipts',
    billingProductNamespace: 'perfin.local',
  },
  preview: {
    appDisplayName: 'PerFin OS Preview',
    iosBundleIdentifier: 'com.yashkanadhia.perfinos.preview',
    androidPackage: 'com.yashkanadhia.perfinos.preview',
    workerName: 'perfin-os-preview',
    r2BucketName: 'perfin-os-preview-receipts',
    billingProductNamespace: 'perfin.preview',
  },
  production: {
    appDisplayName: 'PerFin OS',
    iosBundleIdentifier: 'com.yashkanadhia.perfinos',
    androidPackage: 'com.yashkanadhia.perfinos',
    workerName: 'perfin-os',
    r2BucketName: 'perfin-os-production-receipts',
    billingProductNamespace: 'perfin.production',
  },
};

const trimmed =
  (
    raw:
      | string
      | undefined
  ) =>
    raw?.trim() || '';

export const resolveAppEnvironmentName =
  (
    rawEnv: RawPublicEnv =
      process.env
  ): AppEnvironmentName => {
    const value =
      trimmed(
        rawEnv
          .EXPO_PUBLIC_PERFIN_APP_ENV
      ) || 'local';

    if (
      value === 'local' ||
      value === 'preview' ||
      value === 'production'
    ) {
      return value;
    }

    throw new Error(
      `Unsupported PerFin OS environment "${value}". Use local, preview, or production.`
    );
  };

export const getExpoEnvironmentConfig =
  (
    environmentName: AppEnvironmentName
  ): ExpoEnvironmentConfig =>
    expoEnvironmentConfig[
      environmentName
    ];

const firebaseConfigFrom =
  (
    rawEnv: RawPublicEnv
  ): FirebasePublicConfig => ({
    apiKey:
      trimmed(
        rawEnv
          .EXPO_PUBLIC_FIREBASE_API_KEY
      ),
    authDomain:
      trimmed(
        rawEnv
          .EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
      ),
    projectId:
      trimmed(
        rawEnv
          .EXPO_PUBLIC_FIREBASE_PROJECT_ID
      ),
    storageBucket:
      trimmed(
        rawEnv
          .EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
      ),
    messagingSenderId:
      trimmed(
        rawEnv
          .EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
      ),
    appId:
      trimmed(
        rawEnv
          .EXPO_PUBLIC_FIREBASE_APP_ID
      ),
    appCheckSiteKey:
      trimmed(
        rawEnv
          .EXPO_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY
      ),
  });

const requiredRemoteRuntimeFields = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY',
  'EXPO_PUBLIC_PERFIN_API_BASE_URL',
  'EXPO_PUBLIC_BILLING_PRODUCT_NAMESPACE',
] as const;

export const resolvePublicRuntimeConfig =
  (
    rawEnv: RawPublicEnv =
      process.env
  ): PublicRuntimeConfig => {
    const environmentName =
      resolveAppEnvironmentName(
        rawEnv
      );
    const firebase =
      firebaseConfigFrom(
        rawEnv
      );
    const apiBaseUrl =
      trimmed(
        rawEnv
          .EXPO_PUBLIC_PERFIN_API_BASE_URL
      );
    const googleMapsApiKey =
      trimmed(
        rawEnv
          .EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      );
    const billingProductNamespace =
      trimmed(
        rawEnv
          .EXPO_PUBLIC_BILLING_PRODUCT_NAMESPACE
      ) ||
      getExpoEnvironmentConfig(
        environmentName
      )
        .billingProductNamespace;

    if (
      environmentName !== 'local'
    ) {
      const missing =
        requiredRemoteRuntimeFields
          .filter(
            (key) =>
              !trimmed(
                rawEnv[key]
              )
          );

      if (missing.length) {
        throw new Error(
          `Missing ${environmentName} public configuration: ${missing.join(', ')}`
        );
      }
    }

    return {
      environmentName,
      firebase,
      firebaseConfigured:
        [
          firebase.apiKey,
          firebase.authDomain,
          firebase.projectId,
          firebase.storageBucket,
          firebase.messagingSenderId,
          firebase.appId,
        ].every(Boolean),
      apiBaseUrl,
      googleMapsApiKey,
      billingProductNamespace,
    };
  };

export const runtimeConfig =
  resolvePublicRuntimeConfig();

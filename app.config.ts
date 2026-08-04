import type {
  ConfigContext,
  ExpoConfig,
} from 'expo/config';

type AppEnvironmentName =
  | 'local'
  | 'preview'
  | 'production';

const environmentNames = [
  'local',
  'preview',
  'production',
] as const;

const environmentConfig: Record<AppEnvironmentName, {
  appDisplayName: string;
  iosBundleIdentifier: string;
  androidPackage: string;
  workerName: string;
  billingProductNamespace: string;
}> = {
  local: {
    appDisplayName: 'PerFin OS Local',
    iosBundleIdentifier: 'com.yashkanadhia.perfinos.local',
    androidPackage: 'com.yashkanadhia.perfinos.local',
    workerName: 'perfin-os-local',
    billingProductNamespace: 'perfin.local',
  },
  preview: {
    appDisplayName: 'PerFin OS Preview',
    iosBundleIdentifier: 'com.yashkanadhia.perfinos.preview',
    androidPackage: 'com.yashkanadhia.perfinos.preview',
    workerName: 'perfin-os-preview',
    billingProductNamespace: 'perfin.preview',
  },
  production: {
    appDisplayName: 'PerFin OS',
    iosBundleIdentifier: 'com.yashkanadhia.perfinos',
    androidPackage: 'com.yashkanadhia.perfinos',
    workerName: 'perfin-os',
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

const resolveEnvironmentName =
  (): AppEnvironmentName => {
    const value =
      trimmed(
        process.env
          .EXPO_PUBLIC_PERFIN_APP_ENV
      ) || 'local';

    if (
      environmentNames.includes(
        value as AppEnvironmentName
      )
    ) {
      return value as AppEnvironmentName;
    }

    throw new Error(
      `Unsupported PerFin OS environment "${value}". Use local, preview, or production.`
    );
  };

const requiredRemoteRuntimeFields = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY',
  'EXPO_PUBLIC_PERFIN_API_BASE_URL',
] as const;

const assertRemoteEnvironmentConfigured =
  (
    environmentName: AppEnvironmentName
  ) => {
    if (
      environmentName === 'local'
    ) {
      return;
    }

    const missing =
      requiredRemoteRuntimeFields
        .filter(
          (key) =>
            !trimmed(
              process.env[key]
            )
        );

    if (missing.length) {
      throw new Error(
        `Missing ${environmentName} public configuration: ${missing.join(', ')}`
      );
    }
  };

export default ({
  config,
}: ConfigContext): ExpoConfig => {
  const environmentName =
    resolveEnvironmentName();
  assertRemoteEnvironmentConfigured(
    environmentName
  );

  const environment =
    environmentConfig[
      environmentName
    ];
  const billingProductNamespace =
    trimmed(
      process.env
        .EXPO_PUBLIC_BILLING_PRODUCT_NAMESPACE
    ) ||
    environment
      .billingProductNamespace;

  return {
    ...config,
    name:
      environment.appDisplayName,
    slug:
      config.slug ||
      'perfin-os',
    ios: {
      ...config.ios,
      bundleIdentifier:
        environment
          .iosBundleIdentifier,
    },
    android: {
      ...config.android,
      package:
        environment
          .androidPackage,
    },
    extra: {
      ...config.extra,
      perfinEnvironment:
        environmentName,
      perfinWorkerName:
        environment.workerName,
      perfinBillingProductNamespace:
        billingProductNamespace,
    },
  };
};

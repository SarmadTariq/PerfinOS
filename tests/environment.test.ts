import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getExpoEnvironmentConfig,
  resolvePublicRuntimeConfig,
} from '../src/services/environment';

const completeProductionEnv = {
  EXPO_PUBLIC_PERFIN_APP_ENV: 'production',
  EXPO_PUBLIC_FIREBASE_API_KEY: 'prod-api-key',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'prod.firebaseapp.com',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'perfin-os-prod',
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'perfin-os-prod.appspot.com',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:prod',
  EXPO_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: 'prod-app-check',
  EXPO_PUBLIC_PERFIN_API_BASE_URL: 'https://api.perfin-os.com',
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: 'maps-prod',
  EXPO_PUBLIC_BILLING_PRODUCT_NAMESPACE: 'perfin.production',
};

test('production runtime rejects missing required public values', () => {
  assert.throws(
    () =>
      resolvePublicRuntimeConfig({
        EXPO_PUBLIC_PERFIN_APP_ENV: 'production',
      }),
    /Missing production public configuration/
  );
});

test('preview and production use distinct public identities', () => {
  const preview = getExpoEnvironmentConfig('preview');
  const production = getExpoEnvironmentConfig('production');

  assert.notEqual(preview.iosBundleIdentifier, production.iosBundleIdentifier);
  assert.notEqual(preview.androidPackage, production.androidPackage);
  assert.notEqual(preview.workerName, production.workerName);
  assert.notEqual(preview.r2BucketName, production.r2BucketName);
  assert.notEqual(preview.billingProductNamespace, production.billingProductNamespace);
});

test('production runtime resolves complete explicit configuration', () => {
  const config = resolvePublicRuntimeConfig(completeProductionEnv);

  assert.equal(config.environmentName, 'production');
  assert.equal(config.firebase.projectId, 'perfin-os-prod');
  assert.equal(config.apiBaseUrl, 'https://api.perfin-os.com');
  assert.equal(config.billingProductNamespace, 'perfin.production');
});

test('local Firebase app config does not require an App Check site key', () => {
  const config = resolvePublicRuntimeConfig({
    EXPO_PUBLIC_PERFIN_APP_ENV: 'local',
    EXPO_PUBLIC_FIREBASE_API_KEY: 'local-api-key',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'local.firebaseapp.com',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'perfin-os-local',
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'perfin-os-local.appspot.com',
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '987654321',
    EXPO_PUBLIC_FIREBASE_APP_ID: '1:987654321:web:local',
  });

  assert.equal(config.firebaseConfigured, true);
  assert.equal(config.firebase.appCheckSiteKey, '');
});

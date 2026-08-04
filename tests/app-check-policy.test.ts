import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolvePlanAppCheckAvailability,
} from '../src/services/firebase/appCheckPolicy';

test('native App Check unavailable in production blocks protected calls', () => {
  assert.equal(
    resolvePlanAppCheckAvailability({
      environmentName: 'production',
      platform: 'ios',
      webSiteKey: '',
      nativeProvider: 'none',
      debugTokenEnabled: false,
    }),
    'native_provider_unavailable'
  );
});

test('debug App Check configuration cannot activate in production', () => {
  assert.equal(
    resolvePlanAppCheckAvailability({
      environmentName: 'production',
      platform: 'android',
      webSiteKey: '',
      nativeProvider: 'debug',
      debugTokenEnabled: true,
    }),
    'debug_provider_blocked'
  );
});

test('web App Check remains available when site key exists', () => {
  assert.equal(
    resolvePlanAppCheckAvailability({
      environmentName: 'production',
      platform: 'web',
      webSiteKey: 'site-key',
      nativeProvider: 'none',
      debugTokenEnabled: false,
    }),
    'available'
  );
});

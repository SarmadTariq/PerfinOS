import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appConfig = JSON.parse(
  await readFile(
    new URL('../../app.json', import.meta.url),
    'utf8'
  )
).expo;

test('native release config keeps automatic appearance', () => {
  assert.equal(
    appConfig.userInterfaceStyle,
    'automatic'
  );
});

test('Android declares only the expected location permissions', () => {
  assert.deepEqual(
    appConfig.android.permissions,
    [
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ]
  );
  assert.equal(
    appConfig.android.permissions.includes(
      'android.permission.RECORD_AUDIO'
    ),
    false
  );
});

test('image picker does not request microphone permission', () => {
  const imagePickerPlugin =
    appConfig.plugins.find(
      (plugin) =>
        Array.isArray(plugin) &&
        plugin[0] === 'expo-image-picker'
    );

  assert.ok(
    imagePickerPlugin,
    'expo-image-picker plugin must be configured'
  );
  assert.equal(
    imagePickerPlugin[1].microphonePermission,
    false
  );
});

test('Android backup remains disabled for financial workspace data', () => {
  assert.equal(
    appConfig.android.allowBackup,
    false
  );
});

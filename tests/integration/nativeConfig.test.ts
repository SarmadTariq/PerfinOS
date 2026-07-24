import { describe, expect, it } from 'vitest';
import appConfig from '../../app.json';

describe('native release configuration', () => {
  it('allows system appearance and keeps explicit Android permissions minimal', () => {
    const permissions = appConfig.expo.android.permissions;

    expect(appConfig.expo.userInterfaceStyle).toBe('automatic');
    expect(new Set(permissions).size).toBe(permissions.length);
    expect(permissions).toEqual([
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ]);
    expect(permissions).not.toContain('android.permission.RECORD_AUDIO');
  });

  it('blocks image-picker microphone permission', () => {
    const imagePicker = appConfig.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-image-picker'
    );

    expect(imagePicker).toBeDefined();
    expect(imagePicker?.[1]).toMatchObject({
      microphonePermission: false,
    });
  });
});

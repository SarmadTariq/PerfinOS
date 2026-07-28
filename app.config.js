const fs = require('node:fs');
const appJson = require('./app.json');

const normalizeEnvironment = (value) => {
  if (value === 'production') return 'production';
  if (value === 'preview' || value === 'staging') return 'preview';
  return 'development';
};

const nonEmpty = (value) => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const existingFile = (value) => {
  const candidate = nonEmpty(value);
  return candidate && fs.existsSync(candidate) ? candidate : undefined;
};

const positiveInteger = (value, fallback) => {
  const candidate = Number(value);
  return Number.isInteger(candidate) && candidate > 0 ? candidate : fallback;
};

module.exports = ({ config } = {}) => {
  const baseConfig = config || appJson.expo;
  const environment = normalizeEnvironment(
    process.env.APP_ENV || process.env.EAS_BUILD_PROFILE || 'development'
  );
  const iosGoogleServicesFile = existingFile(
    process.env.GOOGLE_SERVICES_PLIST
  );
  const androidGoogleServicesFile = existingFile(
    process.env.GOOGLE_SERVICES_JSON
  );

  return {
    ...baseConfig,
    ios: {
      ...baseConfig.ios,
      bundleIdentifier:
        nonEmpty(process.env.EXPO_IOS_BUNDLE_IDENTIFIER) ||
        baseConfig.ios.bundleIdentifier,
      buildNumber:
        nonEmpty(process.env.EXPO_IOS_BUILD_NUMBER) ||
        baseConfig.ios.buildNumber,
      ...(iosGoogleServicesFile
        ? { googleServicesFile: iosGoogleServicesFile }
        : {}),
    },
    android: {
      ...baseConfig.android,
      package:
        nonEmpty(process.env.EXPO_ANDROID_PACKAGE) ||
        baseConfig.android.package,
      versionCode: positiveInteger(
        process.env.EXPO_ANDROID_VERSION_CODE,
        baseConfig.android.versionCode
      ),
      ...(androidGoogleServicesFile
        ? { googleServicesFile: androidGoogleServicesFile }
        : {}),
    },
    extra: {
      ...baseConfig.extra,
      appEnvironment: environment,
    },
  };
};

module.exports.normalizeEnvironment = normalizeEnvironment;

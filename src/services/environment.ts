export type AppEnvironment =
  | 'development'
  | 'preview'
  | 'production';

export const normalizeAppEnvironment = (
  value:
    | string
    | undefined
    | null
): AppEnvironment => {
  const normalized =
    value?.trim().toLowerCase();

  if (
    !normalized ||
    normalized === 'local' ||
    normalized === 'dev' ||
    normalized === 'development'
  ) {
    return 'development';
  }

  if (
    normalized === 'preview' ||
    normalized === 'staging'
  ) {
    return 'preview';
  }

  if (
    normalized === 'production'
  ) {
    return 'production';
  }

  throw new Error(
    `Unsupported PerFin OS app environment: ${value}`
  );
};

export const appEnvironment =
  normalizeAppEnvironment(
    (process.env || {})
      .EXPO_PUBLIC_APP_ENV
  );

export const isProductionEnvironment =
  appEnvironment === 'production';

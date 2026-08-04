export type SupportedAuthProvider =
  'password';

export const supportedAuthProviders:
  readonly SupportedAuthProvider[] =
    ['password'];

export type ReauthenticationErrorCode =
  | 'missing_user'
  | 'invalid_password'
  | 'cancelled'
  | 'provider_error';

export interface ReauthenticationResult {
  provider: SupportedAuthProvider;
  reauthenticatedAt: string;
}

export class RemoteReauthenticationError
  extends Error {
  constructor(
    readonly code:
      ReauthenticationErrorCode
  ) {
    super(code);
  }
}

const firebaseErrorCode =
  (
    error: unknown
  ): string | null => {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (
        error as {
          readonly code?: unknown;
        }
      ).code === 'string'
    ) {
      return (
        error as {
          readonly code: string;
        }
      ).code;
    }

    return null;
  };

export const classifyReauthenticationError =
  (
    error: unknown
  ): ReauthenticationErrorCode => {
    const code =
      firebaseErrorCode(
        error
      );

    if (!code) {
      return 'missing_user';
    }

    if (
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials'
    ) {
      return 'invalid_password';
    }

    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      return 'cancelled';
    }

    return 'provider_error';
  };

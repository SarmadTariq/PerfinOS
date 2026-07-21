import {
  createRemoteJWKSet,
  jwtVerify,
} from 'jose';

import type {
  JWTVerifyGetKey,
} from 'jose';

import type {
  Env,
} from '../env';

const FIREBASE_AUTH_JWKS =
  createRemoteJWKSet(
    new URL(
      'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
    )
  );

const FIREBASE_APP_CHECK_JWKS =
  createRemoteJWKSet(
    new URL(
      'https://firebaseappcheck.googleapis.com/v1/jwks'
    )
  );

export interface VerifiedFirebaseUser {
  readonly uid: string;
}

export interface VerifiedFirebaseApp {
  readonly appId: string;
}

export class FirebaseVerificationConfigurationError
  extends Error {}

export class FirebaseTokenVerificationError
  extends Error {}

export interface FirebaseVerifierOptions {
  readonly authKeySet:
    JWTVerifyGetKey;
  readonly appCheckKeySet:
    JWTVerifyGetKey;
  readonly now?: () => number;
}

const requireEnvironmentValue = (
  value: string | undefined,
  name: string
): string => {
  const normalized =
    value?.trim();

  if (!normalized) {
    throw new FirebaseVerificationConfigurationError(
      `${name} is not configured`
    );
  }

  return normalized;
};

const assertPastTimestamp = (
  value: unknown,
  nowSeconds: number
) => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value > nowSeconds + 5
  ) {
    throw new FirebaseTokenVerificationError(
      'Invalid token timestamp'
    );
  }
};

export const createFirebaseTokenVerifiers = (
  options: FirebaseVerifierOptions
) => {
  const now =
    options.now ??
    (() =>
      Math.floor(
        Date.now() / 1000
      ));

  const verifyIdToken = async (
    token: string,
    env: Env
  ): Promise<VerifiedFirebaseUser> => {
    const projectId =
      requireEnvironmentValue(
        env.FIREBASE_PROJECT_ID,
        'FIREBASE_PROJECT_ID'
      );

    try {
      const {
        payload,
        protectedHeader,
      } = await jwtVerify(
        token,
        options.authKeySet,
        {
          algorithms: ['RS256'],
          audience: projectId,
          issuer:
            `https://securetoken.google.com/${projectId}`,
          clockTolerance: 5,
        }
      );

      if (
        protectedHeader.alg !==
        'RS256'
      ) {
        throw new FirebaseTokenVerificationError(
          'Invalid token algorithm'
        );
      }

      if (
        typeof payload.sub !==
          'string' ||
        payload.sub.trim().length ===
          0
      ) {
        throw new FirebaseTokenVerificationError(
          'Invalid token subject'
        );
      }

      const nowSeconds =
        now();

      assertPastTimestamp(
        payload.iat,
        nowSeconds
      );

      assertPastTimestamp(
        payload.auth_time,
        nowSeconds
      );

      return {
        uid: payload.sub,
      };
    } catch (error) {
      if (
        error instanceof
        FirebaseVerificationConfigurationError
      ) {
        throw error;
      }

      if (
        error instanceof
        FirebaseTokenVerificationError
      ) {
        throw error;
      }

      throw new FirebaseTokenVerificationError(
        'Firebase ID token verification failed'
      );
    }
  };

  const verifyAppCheckToken =
    async (
      token: string,
      env: Env
    ): Promise<VerifiedFirebaseApp> => {
      const projectNumber =
        requireEnvironmentValue(
          env.FIREBASE_PROJECT_NUMBER,
          'FIREBASE_PROJECT_NUMBER'
        );

      try {
        const {
          payload,
          protectedHeader,
        } = await jwtVerify(
          token,
          options.appCheckKeySet,
          {
            algorithms: ['RS256'],
            audience:
              `projects/${projectNumber}`,
            issuer:
              `https://firebaseappcheck.googleapis.com/${projectNumber}`,
            clockTolerance: 5,
          }
        );

        if (
          protectedHeader.alg !==
            'RS256' ||
          protectedHeader.typ !==
            'JWT'
        ) {
          throw new FirebaseTokenVerificationError(
            'Invalid App Check header'
          );
        }

        if (
          typeof payload.sub !==
            'string' ||
          payload.sub.trim().length ===
            0
        ) {
          throw new FirebaseTokenVerificationError(
            'Invalid App Check subject'
          );
        }

        return {
          appId: payload.sub,
        };
      } catch (error) {
        if (
          error instanceof
          FirebaseVerificationConfigurationError
        ) {
          throw error;
        }

        if (
          error instanceof
          FirebaseTokenVerificationError
        ) {
          throw error;
        }

        throw new FirebaseTokenVerificationError(
          'Firebase App Check verification failed'
        );
      }
    };

  return {
    verifyIdToken,
    verifyAppCheckToken,
  };
};

const productionVerifiers =
  createFirebaseTokenVerifiers({
    authKeySet:
      FIREBASE_AUTH_JWKS,
    appCheckKeySet:
      FIREBASE_APP_CHECK_JWKS,
  });

export const verifyFirebaseIdToken =
  productionVerifiers.verifyIdToken;

export const verifyFirebaseAppCheckToken =
  productionVerifiers
    .verifyAppCheckToken;

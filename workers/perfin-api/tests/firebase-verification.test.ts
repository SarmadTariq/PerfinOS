import {
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from 'jose';

import type {
  Env,
} from '../src/env';

import {
  createFirebaseTokenVerifiers,
  FirebaseTokenVerificationError,
} from '../src/plan/firebaseVerification';

const projectId =
  'perfin-test-project';

const projectNumber =
  '123456789012';

const appId =
  '1:123456789012:web:test';

const uid =
  'user-123';

const env = {
  FIREBASE_PROJECT_ID:
    projectId,
  FIREBASE_PROJECT_NUMBER:
    projectNumber,
} as Env;

describe(
  'Firebase token verification',
  () => {
    let authPrivateKey:
      CryptoKey;

    let appPrivateKey:
      CryptoKey;

    let verifiers:
      ReturnType<
        typeof createFirebaseTokenVerifiers
      >;

    beforeAll(
      async () => {
        const authKeys =
          await generateKeyPair(
            'RS256',
            {
              extractable: true,
            }
          );

        const appKeys =
          await generateKeyPair(
            'RS256',
            {
              extractable: true,
            }
          );

        authPrivateKey =
          authKeys.privateKey;

        appPrivateKey =
          appKeys.privateKey;

        const authJwk =
          await exportJWK(
            authKeys.publicKey
          );

        const appJwk =
          await exportJWK(
            appKeys.publicKey
          );

        authJwk.kid =
          'auth-key';

        authJwk.alg =
          'RS256';

        authJwk.use =
          'sig';

        appJwk.kid =
          'app-key';

        appJwk.alg =
          'RS256';

        appJwk.use =
          'sig';

        verifiers =
          createFirebaseTokenVerifiers({
            authKeySet:
              createLocalJWKSet({
                keys: [
                  authJwk,
                ],
              }),
            appCheckKeySet:
              createLocalJWKSet({
                keys: [
                  appJwk,
                ],
              }),
          });
      }
    );

    const createIdToken =
      async (
        audience:
          string = projectId
      ) => {
        const now =
          Math.floor(
            Date.now() /
              1000
          );

        return new SignJWT({
          sub: uid,
          auth_time:
            now - 10,
        })
          .setProtectedHeader({
            alg: 'RS256',
            kid: 'auth-key',
            typ: 'JWT',
          })
          .setIssuer(
            `https://securetoken.google.com/${projectId}`
          )
          .setAudience(
            audience
          )
          .setIssuedAt(
            now - 10
          )
          .setExpirationTime(
            now + 300
          )
          .sign(
            authPrivateKey
          );
      };

    const createAppCheckToken =
      async (
        includeType = true
      ) => {
        const now =
          Math.floor(
            Date.now() /
              1000
          );

        return new SignJWT({
          sub: appId,
        })
          .setProtectedHeader({
            alg: 'RS256',
            kid: 'app-key',
            ...(includeType
              ? {
                  typ: 'JWT',
                }
              : {}),
          })
          .setIssuer(
            `https://firebaseappcheck.googleapis.com/${projectNumber}`
          )
          .setAudience(
            `projects/${projectNumber}`
          )
          .setIssuedAt(
            now - 10
          )
          .setExpirationTime(
            now + 300
          )
          .sign(
            appPrivateKey
          );
      };

    it(
      'accepts valid ID and App Check tokens',
      async () => {
        const verifiedUser =
          await verifiers
            .verifyIdToken(
              await createIdToken(),
              env
            );

        const verifiedApp =
          await verifiers
            .verifyAppCheckToken(
              await createAppCheckToken(),
              env
            );

        expect(
          verifiedUser
        ).toEqual({
          uid,
        });

        expect(
          verifiedApp
        ).toEqual({
          appId,
        });
      }
    );

    it(
      'rejects an ID token for another audience',
      async () => {
        await expect(
          verifiers
            .verifyIdToken(
              await createIdToken(
                'another-project'
              ),
              env
            )
        ).rejects.toBeInstanceOf(
          FirebaseTokenVerificationError
        );
      }
    );

    it(
      'rejects an App Check token without JWT type',
      async () => {
        await expect(
          verifiers
            .verifyAppCheckToken(
              await createAppCheckToken(
                false
              ),
              env
            )
        ).rejects.toBeInstanceOf(
          FirebaseTokenVerificationError
        );
      }
    );
  }
);

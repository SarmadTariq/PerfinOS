import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  Env,
} from '../env';
import {
  createDeletionGateway,
} from './gateway';

const envWithAllowedOrigin =
  (
    overrides: Partial<Env> = {}
  ): Env =>
    ({
      ALLOWED_ORIGINS:
        'https://app.example',
      RECEIPTS: {
        list:
          vi.fn(),
        delete:
          vi.fn(),
      },
      FIREBASE_PROJECT_ID:
        'perfin-os-test',
      ...overrides,
    }) as unknown as Env;

const requestForDeletion =
  (
    headers: Record<string, string> = {}
  ) =>
    new Request(
      'https://worker.example/account/deletion-jobs',
      {
        method: 'POST',
        headers: {
          Origin:
            'https://app.example',
          ...headers,
        },
      }
    );

describe(
  'createDeletionGateway',
  () => {
    it(
      'ignores unrelated routes',
      async () => {
        const gateway =
          createDeletionGateway({
            verifyIdToken:
              vi.fn(),
            verifyAppCheckToken:
              vi.fn(),
          });

        await expect(
          gateway(
            new Request(
              'https://worker.example/health'
            ),
            envWithAllowedOrigin()
          )
        ).resolves.toBeNull();
      }
    );

    it(
      'requires an allowlisted origin',
      async () => {
        const gateway =
          createDeletionGateway({
            verifyIdToken:
              vi.fn(),
            verifyAppCheckToken:
              vi.fn(),
          });

        const response =
          await gateway(
            new Request(
              'https://worker.example/account/deletion-jobs',
              {
                method: 'POST',
                headers: {
                  Origin:
                    'https://evil.example',
                },
              }
            ),
            envWithAllowedOrigin()
          );
        const payload =
          await response?.json() as {
            error: {
              code: string;
            };
          };

        expect(response?.status)
          .toBe(403);
        expect(payload.error.code)
          .toBe('ORIGIN_NOT_ALLOWED');
      }
    );

    it(
      'requires idempotency before token verification',
      async () => {
        const verifyIdToken =
          vi.fn();
        const verifyAppCheckToken =
          vi.fn();
        const gateway =
          createDeletionGateway({
            verifyIdToken,
            verifyAppCheckToken,
          });

        const response =
          await gateway(
            requestForDeletion({
              Authorization:
                'Bearer firebase-id-token',
              'X-Firebase-AppCheck':
                'app-check-token',
            }),
            envWithAllowedOrigin()
          );
        const payload =
          await response?.json() as {
            error: {
              code: string;
            };
          };

        expect(response?.status)
          .toBe(400);
        expect(payload.error.code)
          .toBe('IDEMPOTENCY_KEY_REQUIRED');
        expect(verifyIdToken)
          .not.toHaveBeenCalled();
        expect(verifyAppCheckToken)
          .not.toHaveBeenCalled();
      }
    );

    it(
      'requires Firebase authentication and App Check',
      async () => {
        const verifyIdToken =
          vi.fn();
        const verifyAppCheckToken =
          vi.fn();
        const gateway =
          createDeletionGateway({
            verifyIdToken,
            verifyAppCheckToken,
          });

        const response =
          await gateway(
            requestForDeletion({
              'Idempotency-Key':
                'request-1',
            }),
            envWithAllowedOrigin()
          );
        const payload =
          await response?.json() as {
            error: {
              code: string;
            };
          };

        expect(response?.status)
          .toBe(401);
        expect(payload.error.code)
          .toBe('AUTHENTICATION_REQUIRED');
        expect(verifyIdToken)
          .not.toHaveBeenCalled();
        expect(verifyAppCheckToken)
          .not.toHaveBeenCalled();
      }
    );

    it(
      'fails closed before storage deletion when service authority is absent',
      async () => {
        const receiptList =
          vi.fn();
        const receiptDelete =
          vi.fn();
        const gateway =
          createDeletionGateway({
            verifyIdToken:
              vi.fn(
                async () => ({
                  uid:
                    'user-1',
                })
              ),
            verifyAppCheckToken:
              vi.fn(
                async () => ({
                  appId:
                    'app-1',
                })
              ),
          });

        const response =
          await gateway(
            requestForDeletion({
              Authorization:
                'Bearer firebase-id-token',
              'X-Firebase-AppCheck':
                'app-check-token',
              'Idempotency-Key':
                'request-1',
            }),
            envWithAllowedOrigin({
              FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL:
                undefined,
              FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY:
                undefined,
              RECEIPTS: {
                list:
                  receiptList,
                delete:
                  receiptDelete,
              } as unknown as R2Bucket,
            })
          );
        const payload =
          await response?.json() as {
            error: {
              code: string;
            };
            job: {
              status: string;
              unresolvedResourceClasses: string[];
            };
          };

        expect(response?.status)
          .toBe(503);
        expect(payload.error.code)
          .toBe('DELETION_AUTHORITY_NOT_CONFIGURED');
        expect(payload.job.status)
          .toBe('partial_failure');
        expect(payload.job.unresolvedResourceClasses)
          .toEqual([
            'firestore',
            'receipts',
            'identity',
          ]);
        expect(receiptList)
          .not.toHaveBeenCalled();
        expect(receiptDelete)
          .not.toHaveBeenCalled();
      }
    );

    it(
      'deletes owned receipt objects and the Firestore user document tree',
      async () => {
        const now =
          new Date(
            '2026-08-04T20:00:00.000Z'
          );
        const receiptList =
          vi.fn(
            async () => ({
              objects: [
                {
                  key:
                    'receipts/user-1/tx-1/receipt-1.jpg',
                },
              ],
              truncated: false,
            })
          );
        const receiptDelete =
          vi.fn(
            async () => undefined
          );
        const fetcher =
          vi.fn(
            async (
              input:
                Parameters<typeof fetch>[0],
              init?:
                Parameters<typeof fetch>[1]
            ) => {
              const url =
                typeof input === 'string'
                  ? input
                  : input instanceof URL
                    ? input.toString()
                    : input.url;
              const method =
                init?.method ?? 'GET';

              if (
                url.endsWith(
                  '/users/user-1:listCollectionIds'
                )
              ) {
                return Response.json({
                  collectionIds: [
                    'transactions',
                  ],
                });
              }

              if (
                url.endsWith(
                  '/users/user-1/transactions/tx-1:listCollectionIds'
                )
              ) {
                return Response.json({
                  collectionIds: [],
                });
              }

              if (
                url.includes(
                  '/users/user-1/transactions?pageSize=100'
                )
              ) {
                return Response.json({
                  documents: [
                    {
                      name:
                        'projects/perfin-os-test/databases/(default)/documents/users/user-1/transactions/tx-1',
                    },
                  ],
                });
              }

              if (method === 'DELETE') {
                return Response.json({});
              }

              return Response.json(
                {
                  error:
                    'unexpected request',
                },
                {
                  status: 500,
                }
              );
            }
          );
        const gateway =
          createDeletionGateway({
            verifyIdToken:
              vi.fn(
                async () => ({
                  uid:
                    'user-1',
                })
              ),
            verifyAppCheckToken:
              vi.fn(
                async () => ({
                  appId:
                    'app-1',
                })
              ),
            accessTokenForDeletion:
              vi.fn(
                async () =>
                  'access-token'
              ),
            fetch:
              fetcher,
            now:
              () => now,
          });

        const response =
          await gateway(
            requestForDeletion({
              Authorization:
                'Bearer firebase-id-token',
              'X-Firebase-AppCheck':
                'app-check-token',
              'Idempotency-Key':
                'request-1',
            }),
            envWithAllowedOrigin({
              RECEIPTS: {
                list:
                  receiptList,
                delete:
                  receiptDelete,
              } as unknown as R2Bucket,
              FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL:
                'service@example.iam.gserviceaccount.com',
              FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY:
                'not-used-by-test',
            })
          );
        const payload =
          await response?.json() as {
            status: string;
            unresolvedResourceClasses:
              string[];
            counts: {
              firestoreDocuments: number;
              receiptObjects: number;
            };
          };

        expect(response?.status)
          .toBe(202);
        expect(payload.status)
          .toBe('remote_complete');
        expect(payload.unresolvedResourceClasses)
          .toEqual([]);
        expect(payload.counts)
          .toEqual({
            firestoreDocuments: 2,
            receiptObjects: 1,
          });
        expect(receiptList)
          .toHaveBeenCalledWith({
            prefix:
              'receipts/user-1/',
            cursor: undefined,
          });
        expect(receiptDelete)
          .toHaveBeenCalledWith([
            'receipts/user-1/tx-1/receipt-1.jpg',
          ]);
      }
    );
  }
);

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
  FirebaseVerificationConfigurationError,
} from '../plan/firebaseVerification';
import {
  createPlacesGateway,
} from './gateway';

const limiter = (
  success = true
) => ({
  limit:
    vi.fn(
      async () => ({
        success,
      })
    ),
});

const envForPlaces =
  (
    overrides: Partial<Env> = {}
  ): Env =>
    ({
      ALLOWED_ORIGINS:
        'https://app.example',
      GOOGLE_PLACES_API_KEY:
        'google-places-key',
      PLACES_SEARCH_RATE_LIMITER:
        limiter() as unknown as RateLimit,
      ...overrides,
    }) as Env;

const placesRequest =
  (
    headers: Record<string, string> = {}
  ) =>
    new Request(
      'https://worker.example/places/search?query=Toronto',
      {
        method: 'GET',
        headers: {
          Origin:
            'https://app.example',
          ...headers,
        },
      }
    );

describe(
  'createPlacesGateway',
  () => {
    it(
      'requires authentication before provider fetch',
      async () => {
        const providerFetch =
          vi.fn();
        const gateway =
          createPlacesGateway({
            verifyIdToken:
              vi.fn(),
            verifyAppCheckToken:
              vi.fn(),
            fetch:
              providerFetch,
          });

        const response =
          await gateway(
            placesRequest({
              'X-Firebase-AppCheck':
                'app-check',
            }),
            envForPlaces()
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
        expect(providerFetch)
          .not.toHaveBeenCalled();
      }
    );

    it(
      'requires App Check before provider fetch',
      async () => {
        const providerFetch =
          vi.fn();
        const gateway =
          createPlacesGateway({
            verifyIdToken:
              vi.fn(
                async () => ({
                  uid:
                    'user-1',
                })
              ),
            verifyAppCheckToken:
              vi.fn(),
            fetch:
              providerFetch,
          });

        const response =
          await gateway(
            placesRequest({
              Authorization:
                'Bearer id-token',
            }),
            envForPlaces()
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
          .toBe('APP_CHECK_REQUIRED');
        expect(providerFetch)
          .not.toHaveBeenCalled();
      }
    );

    it(
      'rejects unapproved origins',
      async () => {
        const gateway =
          createPlacesGateway({
            verifyIdToken:
              vi.fn(),
            verifyAppCheckToken:
              vi.fn(),
          });

        const response =
          await gateway(
            new Request(
              'https://worker.example/places/search?query=Toronto',
              {
                method: 'GET',
                headers: {
                  Origin:
                    'https://evil.example',
                },
              }
            ),
            envForPlaces()
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
        expect(
          response?.headers.get(
            'Access-Control-Allow-Origin'
          )
        ).not.toBe('*');
      }
    );

    it(
      'returns allowlisted CORS preflight without wildcard origin',
      async () => {
        const gateway =
          createPlacesGateway({
            verifyIdToken:
              vi.fn(),
            verifyAppCheckToken:
              vi.fn(),
          });

        const response =
          await gateway(
            new Request(
              'https://worker.example/places/search?query=Toronto',
              {
                method: 'OPTIONS',
                headers: {
                  Origin:
                    'https://app.example',
                },
              }
            ),
            envForPlaces()
          );

        expect(response?.status)
          .toBe(204);
        expect(
          response?.headers.get(
            'Access-Control-Allow-Origin'
          )
        ).toBe('https://app.example');
      }
    );

    it(
      'rate limits before provider fetch',
      async () => {
        const providerFetch =
          vi.fn();
        const gateway =
          createPlacesGateway({
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
            fetch:
              providerFetch,
          });

        const response =
          await gateway(
            placesRequest({
              Authorization:
                'Bearer id-token',
              'X-Firebase-AppCheck':
                'app-check',
            }),
            envForPlaces({
              PLACES_SEARCH_RATE_LIMITER:
                limiter(false) as unknown as RateLimit,
            })
          );
        const payload =
          await response?.json() as {
            error: {
              code: string;
            };
          };

        expect(response?.status)
          .toBe(429);
        expect(payload.error.code)
          .toBe('RATE_LIMITED');
        expect(providerFetch)
          .not.toHaveBeenCalled();
      }
    );

    it(
      'returns service unavailable for verifier configuration errors',
      async () => {
        const gateway =
          createPlacesGateway({
            verifyIdToken:
              vi.fn(
                async () => {
                  throw new FirebaseVerificationConfigurationError(
                    'missing project'
                  );
                }
              ),
            verifyAppCheckToken:
              vi.fn(),
          });

        const response =
          await gateway(
            placesRequest({
              Authorization:
                'Bearer id-token',
              'X-Firebase-AppCheck':
                'app-check',
            }),
            envForPlaces()
          );
        const payload =
          await response?.json() as {
            error: {
              code: string;
            };
          };

        expect(response?.status)
          .toBe(503);
        expect(payload.error.code)
          .toBe('SERVICE_UNAVAILABLE');
      }
    );

    it(
      'fetches mapped place results after auth app check and rate limit',
      async () => {
        const providerFetch =
          vi.fn(
            async () =>
              Response.json({
                places: [
                  {
                    id: 'place-1',
                    displayName: {
                      text: 'Toronto',
                    },
                    formattedAddress:
                      'Toronto, ON, Canada',
                    location: {
                      latitude: 43.65,
                      longitude: -79.38,
                    },
                    primaryType:
                      'locality',
                  },
                ],
              })
          );
        const gateway =
          createPlacesGateway({
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
            fetch:
              providerFetch,
          });

        const response =
          await gateway(
            placesRequest({
              Authorization:
                'Bearer id-token',
              'X-Firebase-AppCheck':
                'app-check',
            }),
            envForPlaces()
          );

        expect(response?.status)
          .toBe(200);
        await expect(
          response?.json()
        ).resolves.toEqual([
          {
            placeId:
              'place-1',
            name:
              'Toronto',
            address:
              'Toronto, ON, Canada',
            formattedAddress:
              'Toronto, ON, Canada',
            latitude: 43.65,
            longitude: -79.38,
            placeType:
              'locality',
          },
        ]);
      }
    );
  }
);

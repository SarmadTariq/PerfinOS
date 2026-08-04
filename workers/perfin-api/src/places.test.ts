import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  Env,
} from './env';

import {
  FirebaseTokenVerificationError,
} from './plan/firebaseVerification';

import {
  createPlacesGateway,
  PlacesHttpError,
} from './index';

const env = (
  overrides: Partial<Env> = {}
): Env =>
  ({
    GOOGLE_PLACES_API_KEY:
      'places-key',
    FIREBASE_PROJECT_ID:
      'perfin-os-a9f2d',
    FIREBASE_PROJECT_NUMBER:
      '123456789',
    ALLOWED_ORIGINS:
      'https://app.perfin.test',
    PLAN_TURN_RATE_LIMITER: {
      limit: vi.fn().mockResolvedValue({
        success: true,
      }),
    },
    ...overrides,
  }) as Env;

const gateway = (
  overrides: Partial<
    Parameters<typeof createPlacesGateway>[0]
  > = {}
) => {
  const dependencies = {
    verifyIdToken:
      vi.fn().mockResolvedValue({
        uid: 'user-123',
      }),
    verifyAppCheckToken:
      vi.fn().mockResolvedValue({
        appId: 'app-123',
      }),
    consumeRateLimit:
      vi.fn().mockResolvedValue(undefined),
    fetch:
      vi.fn().mockResolvedValue(
        Response.json({
          places: [
            {
              id: 'place-1',
              displayName: {
                text: 'Cafe PerFin',
              },
              formattedAddress:
                '1 Finance St',
              location: {
                latitude: 43.65,
                longitude: -79.38,
              },
              primaryType:
                'cafe',
            },
          ],
        })
      ),
    ...overrides,
  };

  return {
    dependencies,
    handle:
      createPlacesGateway(
        dependencies
      ),
  };
};

const request = (
  headers: HeadersInit = {}
) =>
  new Request(
    'https://worker.test/places/search?query=cafe',
    {
      headers: {
        Origin:
          'https://app.perfin.test',
        Authorization:
          'Bearer id-token',
        'X-Firebase-AppCheck':
          'app-check-token',
        ...headers,
      },
    }
  );

describe('places gateway', () => {
  it('rejects missing Firebase ID token before verification', async () => {
    const {
      dependencies,
      handle,
    } = gateway();

    const response =
      await handle(
        request({
          Authorization: '',
        }),
        env()
      );

    expect(response.status).toBe(401);
    expect(
      dependencies.verifyIdToken
    ).not.toHaveBeenCalled();
    expect(
      dependencies.fetch
    ).not.toHaveBeenCalled();
  });

  it('rejects missing App Check token before remote search', async () => {
    const {
      dependencies,
      handle,
    } = gateway();

    const response =
      await handle(
        request({
          'X-Firebase-AppCheck': '',
        }),
        env()
      );

    expect(response.status).toBe(401);
    expect(
      dependencies.verifyIdToken
    ).toHaveBeenCalledWith(
      'id-token',
      expect.any(Object)
    );
    expect(
      dependencies.verifyAppCheckToken
    ).not.toHaveBeenCalled();
    expect(
      dependencies.fetch
    ).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid Firebase token verification', async () => {
    const {
      dependencies,
      handle,
    } = gateway({
      verifyIdToken:
        vi.fn().mockRejectedValue(
          new FirebaseTokenVerificationError(
            'invalid'
          )
        ),
    });

    const response =
      await handle(
        request(),
        env()
      );

    expect(response.status).toBe(401);
    expect(
      dependencies.verifyAppCheckToken
    ).not.toHaveBeenCalled();
    expect(
      dependencies.fetch
    ).not.toHaveBeenCalled();
  });

  it('rejects non-allowlisted origins without wildcard CORS', async () => {
    const {
      handle,
    } = gateway();

    const response =
      await handle(
        request({
          Origin:
            'https://other.example',
        }),
        env()
      );

    expect(response.status).toBe(403);
    expect(
      response.headers.get(
        'Access-Control-Allow-Origin'
      )
    ).toBeNull();
  });

  it('rate-limits after Firebase and App Check verification', async () => {
    const {
      dependencies,
      handle,
    } = gateway({
      consumeRateLimit:
        vi.fn().mockRejectedValue(
          new PlacesHttpError(
            429,
            'RATE_LIMITED',
            'Too many requests.',
            {
              'Retry-After': '60',
            }
          )
        ),
    });

    const response =
      await handle(
        request(),
        env()
      );

    expect(response.status).toBe(429);
    expect(
      response.headers.get(
        'Retry-After'
      )
    ).toBe('60');
    expect(
      dependencies.verifyIdToken
    ).toHaveBeenCalled();
    expect(
      dependencies.verifyAppCheckToken
    ).toHaveBeenCalled();
    expect(
      dependencies.fetch
    ).not.toHaveBeenCalled();
  });

  it('searches Google Places only after auth, App Check, and rate-limit pass', async () => {
    const {
      dependencies,
      handle,
    } = gateway();

    const response =
      await handle(
        request(),
        env()
      );
    const body =
      await response.json();

    expect(response.status).toBe(200);
    expect(
      response.headers.get(
        'Access-Control-Allow-Origin'
      )
    ).toBe(
      'https://app.perfin.test'
    );
    expect(
      dependencies.fetch
    ).toHaveBeenCalledWith(
      'https://places.googleapis.com/v1/places:searchText',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(body).toEqual([
      {
        placeId: 'place-1',
        name: 'Cafe PerFin',
        address: '1 Finance St',
        formattedAddress:
          '1 Finance St',
        latitude: 43.65,
        longitude: -79.38,
        placeType: 'cafe',
      },
    ]);
  });
});

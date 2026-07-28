import type {
  Env,
} from '../env';

import {
  FirebaseVerificationConfigurationError,
  type VerifiedFirebaseApp,
  type VerifiedFirebaseUser,
} from '../plan/firebaseVerification';

const REQUEST_ID_HEADER =
  'X-Request-Id';
const PLACES_APP_CHECK_HEADER =
  'X-Firebase-AppCheck';
const PLACES_AUTHORIZATION_HEADER =
  'Authorization';
const PLACES_RATE_LIMIT_WINDOW_SECONDS =
  60;
const PLACES_REQUESTS_PER_WINDOW =
  30;
const MAX_QUERY_LENGTH =
  120;

const CORS_ALLOWED_HEADERS = [
  PLACES_AUTHORIZATION_HEADER,
  PLACES_APP_CHECK_HEADER,
  REQUEST_ID_HEADER,
].join(', ');

interface PlacesSearchResult {
  readonly placeId: string;
  readonly name: string;
  readonly address: string;
  readonly formattedAddress: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly placeType: string | null;
}

interface PlacesRateLimitInput {
  readonly uid: string;
  readonly requestsPerWindow: number;
  readonly windowSeconds: number;
}

interface PlacesRateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

export interface PlacesRateLimiter {
  readonly consume: (
    input: PlacesRateLimitInput,
    env: Env
  ) => Promise<PlacesRateLimitDecision>;
}

export interface PlacesGatewayDependencies {
  readonly verifyIdToken: (
    token: string,
    env: Env
  ) => Promise<VerifiedFirebaseUser>;
  readonly verifyAppCheckToken: (
    token: string,
    env: Env
  ) => Promise<VerifiedFirebaseApp>;
  readonly rateLimiter: PlacesRateLimiter;
  readonly fetchPlaces?: typeof fetch;
}

class PlacesHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly responseHeaders:
      Readonly<Record<string, string>> = {}
  ) {
    super(message);
  }
}

const approvedOrigins = (
  env: Env
): Set<string> =>
  new Set(
    (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

const allowedOriginFor = (
  request: Request,
  env: Env
): string | null => {
  const origin =
    request.headers.get('Origin');

  if (!origin) return null;

  if (!approvedOrigins(env).has(origin)) {
    throw new PlacesHttpError(
      403,
      'ORIGIN_NOT_ALLOWED',
      'Request origin is not allowed.'
    );
  }

  return origin;
};

const requestIdFor = (
  request: Request
): string => {
  const candidate =
    request.headers.get(
      REQUEST_ID_HEADER
    );

  if (
    candidate &&
    /^[A-Za-z0-9._:-]{1,80}$/.test(
      candidate
    )
  ) {
    return candidate;
  }

  return crypto.randomUUID();
};

const responseHeaders = (
  allowedOrigin: string | null,
  requestId: string
): Headers => {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type':
      'application/json; charset=utf-8',
    Vary: 'Origin',
    'X-Content-Type-Options': 'nosniff',
    [REQUEST_ID_HEADER]: requestId,
  });

  if (allowedOrigin) {
    headers.set(
      'Access-Control-Allow-Origin',
      allowedOrigin
    );
  }

  return headers;
};

const jsonResponse = (
  body: unknown,
  status: number,
  allowedOrigin: string | null,
  requestId: string
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(
      allowedOrigin,
      requestId
    ),
  });

const errorResponse = (
  error: PlacesHttpError,
  allowedOrigin: string | null,
  requestId: string
) => {
  const response =
    jsonResponse(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      error.status,
      allowedOrigin,
      requestId
    );

  Object.entries(
    error.responseHeaders
  ).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
};

const preflightResponse = (
  allowedOrigin: string,
  requestId: string
) => {
  const headers = responseHeaders(
    allowedOrigin,
    requestId
  );
  headers.delete('Content-Type');
  headers.set(
    'Access-Control-Allow-Headers',
    CORS_ALLOWED_HEADERS
  );
  headers.set(
    'Access-Control-Allow-Methods',
    'GET, OPTIONS'
  );
  headers.set(
    'Access-Control-Max-Age',
    '600'
  );

  return new Response(null, {
    status: 204,
    headers,
  });
};

const bearerTokenFor = (
  request: Request
): string => {
  const value =
    request.headers.get(
      PLACES_AUTHORIZATION_HEADER
    );

  if (!value?.startsWith('Bearer ')) {
    throw new PlacesHttpError(
      401,
      'AUTH_REQUIRED',
      'Authentication failed.'
    );
  }

  const token = value.slice(7).trim();

  if (!token) {
    throw new PlacesHttpError(
      401,
      'AUTH_REQUIRED',
      'Authentication failed.'
    );
  }

  return token;
};

const appCheckTokenFor = (
  request: Request
): string => {
  const token =
    request.headers
      .get(PLACES_APP_CHECK_HEADER)
      ?.trim();

  if (!token) {
    throw new PlacesHttpError(
      401,
      'APP_CHECK_REQUIRED',
      'App verification failed.'
    );
  }

  return token;
};

const queryFor = (
  request: Request
): string => {
  const query =
    new URL(request.url)
      .searchParams
      .get('query')
      ?.trim() ?? '';

  if (
    query.length < 2 ||
    query.length > MAX_QUERY_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(query)
  ) {
    throw new PlacesHttpError(
      400,
      'INVALID_QUERY',
      'Place search query must be 2-120 visible characters.'
    );
  }

  return query;
};

const requirePlacesKey = (
  env: Env
): string => {
  const key =
    env.GOOGLE_PLACES_API_KEY?.trim();

  if (!key) {
    throw new PlacesHttpError(
      503,
      'PLACES_NOT_CONFIGURED',
      'Google Places is not configured.'
    );
  }

  return key;
};

const bytesToHex = (
  bytes: ArrayBuffer
) =>
  Array.from(new Uint8Array(bytes))
    .map((value) =>
      value.toString(16).padStart(2, '0')
    )
    .join('');

export const placesRateLimitKeyFor =
  async (uid: string) => {
    const normalizedUid =
      uid.trim();

    if (
      normalizedUid.length === 0 ||
      normalizedUid.length > 128
    ) {
      throw new Error(
        'Rate-limit UID has an invalid format'
      );
    }

    const digest =
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(
          normalizedUid
        )
      );

    return `places-v1:search:${bytesToHex(
      digest
    )}`;
  };

export const createCloudflarePlacesRateLimiter =
  (): PlacesRateLimiter => ({
    consume: async (
      input,
      env
    ) => {
      if (
        input.requestsPerWindow !==
          PLACES_REQUESTS_PER_WINDOW ||
        input.windowSeconds !==
          PLACES_RATE_LIMIT_WINDOW_SECONDS
      ) {
        throw new Error(
          'Places rate-limit policy does not match the route contract'
        );
      }

      if (!env.PLACES_SEARCH_RATE_LIMITER) {
        throw new Error(
          'Places rate-limit binding is unavailable'
        );
      }

      const result =
        await env
          .PLACES_SEARCH_RATE_LIMITER
          .limit({
            key:
              await placesRateLimitKeyFor(
                input.uid
              ),
          });

      return {
        allowed: result.success,
        retryAfterSeconds:
          PLACES_RATE_LIMIT_WINDOW_SECONDS,
      };
    },
  });

const normalizePlace = (
  place: any
): PlacesSearchResult | null => {
  if (
    typeof place?.id !== 'string' ||
    place.id.trim().length === 0
  ) {
    return null;
  }

  const address =
    typeof place.formattedAddress ===
    'string'
      ? place.formattedAddress
      : '';
  const name =
    typeof place.displayName?.text ===
      'string' &&
    place.displayName.text.trim()
      ? place.displayName.text
      : address;

  if (!name.trim()) return null;

  return {
    placeId: place.id,
    name,
    address,
    formattedAddress: address,
    latitude:
      typeof place.location?.latitude ===
      'number'
        ? place.location.latitude
        : null,
    longitude:
      typeof place.location?.longitude ===
      'number'
        ? place.location.longitude
        : null,
    placeType:
      typeof place.primaryType ===
      'string'
        ? place.primaryType
        : null,
  };
};

export const createPlacesGateway = (
  dependencies:
    PlacesGatewayDependencies
) =>
  async (
    request: Request,
    env: Env
  ): Promise<Response | null> => {
    const url = new URL(request.url);

    if (url.pathname !== '/places/search') {
      return null;
    }

    const requestId =
      requestIdFor(request);
    let allowedOrigin:
      string | null = null;

    try {
      allowedOrigin =
        allowedOriginFor(
          request,
          env
        );

      if (request.method === 'OPTIONS') {
        if (!allowedOrigin) {
          throw new PlacesHttpError(
            403,
            'ORIGIN_REQUIRED',
            'Request origin is not allowed.'
          );
        }

        return preflightResponse(
          allowedOrigin,
          requestId
        );
      }

      if (request.method !== 'GET') {
        throw new PlacesHttpError(
          405,
          'METHOD_NOT_ALLOWED',
          'Method is not allowed.'
        );
      }

      const query =
        queryFor(request);
      const idToken =
        bearerTokenFor(request);

      let verifiedUser:
        VerifiedFirebaseUser;

      try {
        verifiedUser =
          await dependencies
            .verifyIdToken(
              idToken,
              env
            );
      } catch (error) {
        if (
          error instanceof
          FirebaseVerificationConfigurationError
        ) {
          throw error;
        }

        throw new PlacesHttpError(
          401,
          'AUTH_INVALID',
          'Authentication failed.'
        );
      }

      try {
        await dependencies
          .verifyAppCheckToken(
            appCheckTokenFor(request),
            env
          );
      } catch (error) {
        if (
          error instanceof
          FirebaseVerificationConfigurationError
        ) {
          throw error;
        }

        throw new PlacesHttpError(
          401,
          'APP_CHECK_INVALID',
          'App verification failed.'
        );
      }

      let rateLimitDecision:
        PlacesRateLimitDecision;

      try {
        rateLimitDecision =
          await dependencies
            .rateLimiter
            .consume(
              {
                uid:
                  verifiedUser.uid,
                requestsPerWindow:
                  PLACES_REQUESTS_PER_WINDOW,
                windowSeconds:
                  PLACES_RATE_LIMIT_WINDOW_SECONDS,
              },
              env
            );
      } catch {
        throw new PlacesHttpError(
          503,
          'RATE_LIMIT_UNAVAILABLE',
          'Place search is unavailable.'
        );
      }

      if (!rateLimitDecision.allowed) {
        throw new PlacesHttpError(
          429,
          'RATE_LIMITED',
          'Too many place searches.',
          {
            'Retry-After':
              String(
                rateLimitDecision
                  .retryAfterSeconds
              ),
          }
        );
      }

      const response =
        await (
          dependencies.fetchPlaces ??
          fetch
        )(
          'https://places.googleapis.com/v1/places:searchText',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              'X-Goog-Api-Key':
                requirePlacesKey(env),
              'X-Goog-FieldMask':
                'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType',
            },
            body:
              JSON.stringify({
                textQuery: query,
                maxResultCount: 5,
              }),
          }
        );

      if (!response.ok) {
        throw new PlacesHttpError(
          502,
          'PLACE_SEARCH_FAILED',
          'Place search failed.'
        );
      }

      const payload =
        await response
          .json()
          .catch(() => null) as
            | {
                places?: any[];
              }
            | null;

      if (
        !payload ||
        (
          payload.places !== undefined &&
          !Array.isArray(payload.places)
        )
      ) {
        throw new PlacesHttpError(
          502,
          'PLACE_SEARCH_FAILED',
          'Place search failed.'
        );
      }

      return jsonResponse(
        (payload.places ?? [])
          .slice(0, 5)
          .map(normalizePlace)
          .filter(
            (
              place
            ): place is PlacesSearchResult =>
              place !== null
          ),
        200,
        allowedOrigin,
        requestId
      );
    } catch (error) {
      if (
        error instanceof
        FirebaseVerificationConfigurationError
      ) {
        return errorResponse(
          new PlacesHttpError(
            503,
            'FIREBASE_VERIFICATION_NOT_CONFIGURED',
            'Firebase verification is not configured.'
          ),
          allowedOrigin,
          requestId
        );
      }

      if (error instanceof PlacesHttpError) {
        return errorResponse(
          error,
          allowedOrigin,
          requestId
        );
      }

      return errorResponse(
        new PlacesHttpError(
          500,
          'UNEXPECTED_WORKER_ERROR',
          'Unexpected worker error.'
        ),
        allowedOrigin,
        requestId
      );
    }
  };

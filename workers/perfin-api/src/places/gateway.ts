import type {
  Env,
} from '../env';
import {
  FirebaseVerificationConfigurationError,
  type VerifiedFirebaseApp,
  type VerifiedFirebaseUser,
} from '../plan/firebaseVerification';

type Fetcher = typeof fetch;

export interface PlacesGatewayDependencies {
  readonly verifyIdToken: (
    token: string,
    env: Env
  ) => Promise<VerifiedFirebaseUser>;
  readonly verifyAppCheckToken: (
    token: string,
    env: Env
  ) => Promise<VerifiedFirebaseApp>;
  readonly fetch?: Fetcher;
}

class PlacesHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly responseHeaders:
      Record<string, string> = {}
  ) {
    super(message);
  }
}

const REQUEST_ID_HEADER =
  'X-Request-Id';
const MAX_QUERY_LENGTH =
  120;

const routeMatches = (
  request: Request
): boolean =>
  new URL(request.url).pathname ===
  '/places/search';

const requestIdFor = (
  request: Request
) => {
  const candidate =
    request.headers
      .get(REQUEST_ID_HEADER)
      ?.trim();

  return candidate &&
    /^[A-Za-z0-9._:-]{1,80}$/.test(
      candidate
    )
    ? candidate
    : crypto.randomUUID();
};

const allowedOrigin = (
  request: Request,
  env: Env
): string | null => {
  const origin =
    request.headers.get('Origin');

  if (!origin) return null;

  const approved = new Set(
    (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (!approved.has(origin)) {
    throw new PlacesHttpError(
      403,
      'ORIGIN_NOT_ALLOWED',
      'Request origin is not allowed.'
    );
  }

  return origin;
};

const responseHeaders = (
  origin: string | null,
  requestId: string
): Headers => {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type':
      'application/json; charset=utf-8',
    'Vary': 'Origin',
    'X-Content-Type-Options':
      'nosniff',
    [REQUEST_ID_HEADER]:
      requestId,
  });

  if (origin) {
    headers.set(
      'Access-Control-Allow-Origin',
      origin
    );
  }

  return headers;
};

const json = (
  body: unknown,
  status: number,
  origin: string | null,
  requestId: string
) =>
  new Response(
    JSON.stringify(body),
    {
      status,
      headers:
        responseHeaders(
          origin,
          requestId
        ),
    }
  );

const errorResponse = (
  error: PlacesHttpError,
  origin: string | null,
  requestId: string
) => {
  const response =
    json(
      {
        error: {
          code: error.code,
          message:
            error.message,
        },
      },
      error.status,
      origin,
      requestId
    );

  Object.entries(
    error.responseHeaders
  ).forEach(([key, value]) => {
    response.headers.set(
      key,
      value
    );
  });

  return response;
};

const bearerToken = (
  request: Request
): string => {
  const authorization =
    request.headers.get(
      'Authorization'
    );

  if (
    !authorization?.startsWith(
      'Bearer '
    ) ||
    !authorization.slice(7).trim()
  ) {
    throw new PlacesHttpError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication required.'
    );
  }

  return authorization
    .slice(7)
    .trim();
};

const appCheckToken = (
  request: Request
): string => {
  const token =
    request.headers
      .get('X-Firebase-AppCheck')
      ?.trim();

  if (!token) {
    throw new PlacesHttpError(
      401,
      'APP_CHECK_REQUIRED',
      'Firebase App Check is required.'
    );
  }

  return token;
};

const searchQuery = (
  request: Request
): string => {
  const query =
    new URL(request.url)
      .searchParams
      .get('query')
      ?.trim() ?? '';

  if (!query) {
    throw new PlacesHttpError(
      400,
      'QUERY_REQUIRED',
      'Place search query is required.'
    );
  }

  if (
    query.length >
    MAX_QUERY_LENGTH
  ) {
    throw new PlacesHttpError(
      400,
      'QUERY_TOO_LONG',
      'Place search query is too long.'
    );
  }

  return query;
};

const bytesToHex = (
  bytes: ArrayBuffer
) =>
  Array.from(
    new Uint8Array(bytes)
  )
    .map((value) =>
      value.toString(16).padStart(2, '0')
    )
    .join('');

const rateLimitKeyFor =
  async (uid: string) => {
    const digest =
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(
          uid
        )
      );

    return `places-v1:${bytesToHex(digest)}`;
  };

const enforceRateLimit = async (
  uid: string,
  env: Env
) => {
  const limiter =
    env.PLACES_SEARCH_RATE_LIMITER;

  if (!limiter) {
    throw new PlacesHttpError(
      503,
      'RATE_LIMIT_UNAVAILABLE',
      'Place search is unavailable.'
    );
  }

  const result =
    await limiter.limit({
      key:
        await rateLimitKeyFor(uid),
    });

  if (!result.success) {
    throw new PlacesHttpError(
      429,
      'RATE_LIMITED',
      'Too many requests.',
      {
        'Retry-After': '60',
      }
    );
  }
};

const requirePlacesApiKey = (
  env: Env
) => {
  const key =
    env.GOOGLE_PLACES_API_KEY
      ?.trim();

  if (!key) {
    throw new PlacesHttpError(
      503,
      'PLACES_NOT_CONFIGURED',
      'Place search is unavailable.'
    );
  }

  return key;
};

export const createPlacesGateway = (
  dependencies: PlacesGatewayDependencies
) =>
  async (
    request: Request,
    env: Env
  ): Promise<Response | null> => {
    if (!routeMatches(request)) {
      return null;
    }

    const requestId =
      requestIdFor(request);
    let origin: string | null = null;

    try {
      origin = allowedOrigin(
        request,
        env
      );

      if (request.method === 'OPTIONS') {
        if (!origin) {
          throw new PlacesHttpError(
            403,
            'ORIGIN_REQUIRED',
            'Request origin is not allowed.'
          );
        }

        const headers =
          responseHeaders(
            origin,
            requestId
          );
        headers.delete(
          'Content-Type'
        );
        headers.set(
          'Access-Control-Allow-Headers',
          'Authorization, Content-Type, X-Firebase-AppCheck, X-Request-Id'
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
      }

      if (request.method !== 'GET') {
        throw new PlacesHttpError(
          405,
          'METHOD_NOT_ALLOWED',
          'Method not allowed.'
        );
      }

      const verifiedUser =
        await dependencies.verifyIdToken(
          bearerToken(request),
          env
        );
      await dependencies.verifyAppCheckToken(
        appCheckToken(request),
        env
      );
      await enforceRateLimit(
        verifiedUser.uid,
        env
      );

      const query =
        searchQuery(request);
      const apiKey =
        requirePlacesApiKey(env);
      const fetcher =
        dependencies.fetch ?? fetch;
      const response =
        await fetcher(
          'https://places.googleapis.com/v1/places:searchText',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              'X-Goog-Api-Key':
                apiKey,
              'X-Goog-FieldMask':
                'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType',
            },
            body:
              JSON.stringify({
                textQuery:
                  query,
                maxResultCount: 5,
              }),
          }
        );

      if (!response.ok) {
        throw new PlacesHttpError(
          502,
          'PLACES_PROVIDER_FAILED',
          'Place search failed.'
        );
      }

      const payload =
        await response.json() as {
          places?: Array<{
            id?: string;
            displayName?: {
              text?: string;
            };
            formattedAddress?: string;
            location?: {
              latitude?: number;
              longitude?: number;
            };
            primaryType?: string;
          }>;
        };

      return json(
        (payload.places ?? []).map(
          (place) => ({
            placeId:
              place.id,
            name:
              place.displayName?.text ||
              place.formattedAddress,
            address:
              place.formattedAddress,
            formattedAddress:
              place.formattedAddress,
            latitude:
              place.location?.latitude,
            longitude:
              place.location?.longitude,
            placeType:
              place.primaryType,
          })
        ),
        200,
        origin,
        requestId
      );
    } catch (error) {
      if (
        error instanceof
        PlacesHttpError
      ) {
        return errorResponse(
          error,
          origin,
          requestId
        );
      }

      if (
        error instanceof
        FirebaseVerificationConfigurationError
      ) {
        return errorResponse(
          new PlacesHttpError(
            503,
            'SERVICE_UNAVAILABLE',
            'Place search is unavailable.'
          ),
          origin,
          requestId
        );
      }

      return errorResponse(
        new PlacesHttpError(
          401,
          'PLACES_AUTHORIZATION_FAILED',
          'Place search authorization failed.'
        ),
        origin,
        requestId
      );
    }
  };

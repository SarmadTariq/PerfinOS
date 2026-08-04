import type {
  Env,
} from './env';

import {
  PLAN_APP_CHECK_HEADER,
  PLAN_AUTHORIZATION_HEADER,
  PLAN_RATE_LIMIT_WINDOW_SECONDS,
} from './plan/contracts';

import {
  FirebaseTokenVerificationError,
  FirebaseVerificationConfigurationError,
  verifyFirebaseAppCheckToken,
  verifyFirebaseIdToken,
} from './plan/firebaseVerification';

import {
  createPlanGateway,
} from './plan/gateway';

import {
  serializePlanOperationalEvent,
} from './plan/operational';

import {
  createCloudflarePlanRateLimiter,
} from './plan/rateLimit';

import {
  createPlanActionHandler,
} from './plan/actionHandler';

import {
  createReceiptGateway,
} from './receipt/gateway';

import {
  createPlanProvider,
  createInMemoryPlanCircuitBreaker,
} from './plan/provider';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  }
);

// ── Google Places proxy ────────────────────────────────────────────────────

export class PlacesHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly headers?: HeadersInit
  ) {
    super(message);
  }
}

const corsOriginFor = (
  request: Request,
  env: Env
): string | null => {
  const origin = request.headers
    .get('Origin')
    ?.trim();

  if (!origin) return null;

  const allowed = new Set(
    (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (!allowed.has(origin)) {
    throw new PlacesHttpError(
      403,
      'ORIGIN_NOT_ALLOWED',
      'Request origin is not allowed.'
    );
  }

  return origin;
};

const placesHeaders = (
  origin: string | null,
  extra?: HeadersInit
) => {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
    ...extra,
  });

  if (origin) {
    headers.set(
      'Access-Control-Allow-Origin',
      origin
    );
  }

  return headers;
};

const placesJson = (
  body: unknown,
  status: number,
  origin: string | null,
  extra?: HeadersInit
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: placesHeaders(
      origin,
      extra
    ),
  });

const placesBearerToken = (
  request: Request
): string => {
  const value = request.headers
    .get(PLAN_AUTHORIZATION_HEADER);

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

const placesAppCheckToken = (
  request: Request
): string => {
  const token = request.headers
    .get(PLAN_APP_CHECK_HEADER)
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

const placesRateLimitKey = async (
  uid: string
) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(uid)
  );

  return [
    'places-v1',
    Array.from(new Uint8Array(digest))
      .map((value) =>
        value.toString(16).padStart(2, '0')
      )
      .join(''),
  ].join(':');
};

const consumePlacesRateLimit = async (
  uid: string,
  env: Env
) => {
  if (!env.PLAN_TURN_RATE_LIMITER) {
    throw new PlacesHttpError(
      503,
      'RATE_LIMIT_UNAVAILABLE',
      'Place search is unavailable.'
    );
  }

  const result =
    await env.PLAN_TURN_RATE_LIMITER.limit({
      key: await placesRateLimitKey(uid),
    });

  if (!result.success) {
    throw new PlacesHttpError(
      429,
      'RATE_LIMITED',
      'Too many requests.',
      {
        'Retry-After':
          String(PLAN_RATE_LIMIT_WINDOW_SECONDS),
      }
    );
  }
};

export interface PlacesGatewayDependencies {
  readonly verifyIdToken: typeof verifyFirebaseIdToken;
  readonly verifyAppCheckToken: typeof verifyFirebaseAppCheckToken;
  readonly fetch: typeof fetch;
  readonly consumeRateLimit: (
    uid: string,
    env: Env
  ) => Promise<void>;
}

export const createPlacesGateway =
  (
    dependencies: PlacesGatewayDependencies
  ) =>
  async (
    request: Request,
    env: Env
  ): Promise<Response> => {
  let origin: string | null = null;

  try {
    origin = corsOriginFor(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: placesHeaders(origin, {
          'Access-Control-Allow-Headers':
            `${PLAN_AUTHORIZATION_HEADER}, ${PLAN_APP_CHECK_HEADER}`,
          'Access-Control-Allow-Methods':
            'GET, OPTIONS',
        }),
      });
    }

    if (request.method !== 'GET') {
      throw new PlacesHttpError(
        405,
        'METHOD_NOT_ALLOWED',
        'Method is not allowed.'
      );
    }

    if (!env.GOOGLE_PLACES_API_KEY) {
      return placesJson(
        {
          error: 'Google Places is not configured',
          placeholder: true,
        },
        503,
        origin
      );
    }

    const verifiedUser =
      await dependencies.verifyIdToken(
        placesBearerToken(request),
        env
      );

    await dependencies.verifyAppCheckToken(
      placesAppCheckToken(request),
      env
    );

    await dependencies.consumeRateLimit(
      verifiedUser.uid,
      env
    );

    const url = new URL(request.url);
    const query = url.searchParams.get('query')?.trim();
    if (!query) return placesJson([], 200, origin);

    const response =
      await dependencies.fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key':
              env.GOOGLE_PLACES_API_KEY,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType',
          },
          body: JSON.stringify({
            textQuery: query,
            maxResultCount: 5,
          }),
        }
      );

    if (!response.ok) {
      return placesJson(
        { error: 'Place search failed' },
        response.status,
        origin
      );
    }

    const payload = (await response.json()) as any;
    return placesJson(
      (payload.places || []).map((place: any) => ({
        placeId: place.id,
        name:
          place.displayName?.text ||
          place.formattedAddress,
        address: place.formattedAddress,
        formattedAddress:
          place.formattedAddress,
        latitude:
          place.location?.latitude,
        longitude:
          place.location?.longitude,
        placeType: place.primaryType,
      })),
      200,
      origin
    );
  } catch (error) {
    if (error instanceof PlacesHttpError) {
      return placesJson(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        error.status,
        origin,
        error.headers
      );
    }

    if (
      error instanceof
      FirebaseTokenVerificationError
    ) {
      return placesJson(
        {
          error: {
            code: 'AUTH_INVALID',
            message:
              'Authentication failed.',
          },
        },
        401,
        origin
      );
    }

    if (
      error instanceof
      FirebaseVerificationConfigurationError
    ) {
      return placesJson(
        {
          error: {
            code:
              'VERIFICATION_UNAVAILABLE',
            message:
              'Place search is unavailable.',
          },
        },
        503,
        origin
      );
    }

    return placesJson(
      {
        error: 'Place search failed',
      },
      500,
      origin
    );
  }
};

export const handlePlaces =
  createPlacesGateway({
    verifyIdToken:
      verifyFirebaseIdToken,
    verifyAppCheckToken:
      verifyFirebaseAppCheckToken,
    fetch:
      globalThis.fetch.bind(
        globalThis
      ),
    consumeRateLimit:
      consumePlacesRateLimit,
  });

const planRateLimiter =
  createCloudflarePlanRateLimiter();

const planProviderCircuitBreaker =
  createInMemoryPlanCircuitBreaker();

const planProvider =
  createPlanProvider({
    circuitBreaker:
      planProviderCircuitBreaker,
  });

const planActionHandler =
  createPlanActionHandler({
    provider:
      planProvider,
  });

const planGateway =
  createPlanGateway({
    rateLimiter:
      planRateLimiter,
    verifyIdToken:
      verifyFirebaseIdToken,
    verifyAppCheckToken:
      verifyFirebaseAppCheckToken,
    recordOperationalEvent:
      (event) => {
        console.log(
          serializePlanOperationalEvent(
            event
          )
        );
      },

    invokeAction:
      (
        context,
        env
      ) =>
        planActionHandler(
          context,
          env
        ),
  });

const receiptGateway =
  createReceiptGateway({
    verifyIdToken:
      verifyFirebaseIdToken,
    verifyAppCheckToken:
      verifyFirebaseAppCheckToken,
  });

// ── Main router ────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url =
      new URL(request.url);

    try {
      const planResponse =
        await planGateway(
          request,
          env
        );

      if (planResponse) {
        return planResponse;
      }

      const receiptResponse =
        await receiptGateway(
          request,
          env
        );

      if (receiptResponse) {
        return receiptResponse;
      }

      if (url.pathname === '/places/search') {
        return handlePlaces(request, env);
      }
      if (
        request.method ===
        'OPTIONS'
      ) {
        return json({});
      }
      if (
        (
          url.pathname ===
            '/ai/report' ||
          url.pathname ===
            '/ai/chat'
        ) &&
        request.method ===
          'POST'
      ) {
        return json(
          {
            error:
              'Legacy AI route is disabled',
          },
          410
        );
      }
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      if (error instanceof Response) return error;
      return json({ error: 'Unexpected worker error' }, 500);
    }
  },
};

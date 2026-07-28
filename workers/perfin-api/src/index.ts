import type {
  Env,
} from './env';

import {
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Firebase-AppCheck',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    },
  }
);

const notConfigured = (feature: string) =>{
  return json({ error: `${feature} is not configured`, placeholder: true }, 503);
};

// ── Google Places proxy ────────────────────────────────────────────────────

const handlePlaces = async (request: Request, env: Env): Promise<Response> => {
  if (!env.GOOGLE_PLACES_API_KEY) return notConfigured('Google Places');
  const url = new URL(request.url);
  const query = url.searchParams.get('query')?.trim();
  if (!query) return json([]);

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
  });

  if (!response.ok) return json({ error: 'Place search failed' }, response.status);
  const payload = (await response.json()) as any;
  return json(
    (payload.places || []).map((place: any) => ({
      placeId: place.id,
      name: place.displayName?.text || place.formattedAddress,
      address: place.formattedAddress,
      formattedAddress: place.formattedAddress,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      placeType: place.primaryType,
    }))
  );
};

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

      if (
        request.method ===
        'OPTIONS'
      ) {
        return json({});
      }
      if (url.pathname === '/places/search' && request.method === 'GET') {
        return handlePlaces(request, env);
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

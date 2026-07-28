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
  createCloudflarePlacesRateLimiter,
  createPlacesGateway,
} from './places/gateway';

import {
  createGeminiPlanProvider,
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

const planRateLimiter =
  createCloudflarePlanRateLimiter();

const placesRateLimiter =
  createCloudflarePlacesRateLimiter();

const planProviderCircuitBreaker =
  createInMemoryPlanCircuitBreaker();

const planProvider =
  createGeminiPlanProvider({
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

const placesGateway =
  createPlacesGateway({
    verifyIdToken:
      verifyFirebaseIdToken,
    verifyAppCheckToken:
      verifyFirebaseAppCheckToken,
    rateLimiter:
      placesRateLimiter,
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

      const placesResponse =
        await placesGateway(
          request,
          env
        );

      if (placesResponse) {
        return placesResponse;
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

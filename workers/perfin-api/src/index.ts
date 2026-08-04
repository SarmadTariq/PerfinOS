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
  createDeletionGateway,
} from './deletion/gateway';

import {
  createPlacesGateway,
} from './places/gateway';

import {
  createPlanProvider,
  createInMemoryPlanCircuitBreaker,
} from './plan/provider';

const json = (
  body: unknown,
  status = 200
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type':
        'application/json; charset=utf-8',
      'Cache-Control':
        'no-store',
      'X-Content-Type-Options':
        'nosniff',
      Vary: 'Origin',
    },
  }
);

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

const deletionGateway =
  createDeletionGateway({
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

      const deletionResponse =
        await deletionGateway(
          request,
          env
        );

      if (deletionResponse) {
        return deletionResponse;
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

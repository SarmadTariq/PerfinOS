import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  Env,
} from '../src/env';

import {
  createPlanGateway,
  type PlanGatewayDependencies,
} from '../src/plan/gateway';

import {
  baselineRevision,
  sessionId,
  validPlanEvidence,
} from './plan-fixtures';

const env = {
  ALLOWED_ORIGINS:
    'https://app.perfin.test',
} as Env;

const requestFor = (
  body:
    string = JSON.stringify({
      schemaVersion: 1,
      sessionId,
      baselineRevision,
      evidence:
        validPlanEvidence,
    })
) =>
  new Request(
    'https://worker.test/v1/plan/generate',
    {
      method: 'POST',
      headers: {
        Origin:
          'https://app.perfin.test',
        Authorization:
          'Bearer id-token',
        'X-Firebase-AppCheck':
          'app-check-token',
        'Content-Type':
          'application/json',
      },
      body,
    }
  );

const dependenciesFor = (
  allowed: boolean
): PlanGatewayDependencies => ({
  verifyIdToken:
    vi.fn(
      async () => ({
        uid: 'user-123',
      })
    ),

  verifyAppCheckToken:
    vi.fn(
      async () => ({
        appId: 'app-123',
      })
    ),

  rateLimiter: {
    consume:
      vi.fn(
        async () => ({
          allowed,
          retryAfterSeconds:
            37,
        })
      ),
  },

  invokeAction:
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
          }),
          {
            status: 200,
          }
        )
    ),
});

describe(
  'PF-208 gateway rate limiting',
  () => {
    it(
      'returns 429 before action invocation',
      async () => {
        const dependencies =
          dependenciesFor(false);

        const response =
          await createPlanGateway(
            dependencies
          )(
            requestFor(),
            env
          );

        expect(
          response?.status
        ).toBe(429);

        expect(
          response?.headers.get(
            'Retry-After'
          )
        ).toBe('37');

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();

        expect(
          await response?.json()
        ).toMatchObject({
          error: {
            code:
              'RATE_LIMITED',
          },
        });
      }
    );

    it(
      'rate limits before parsing the body',
      async () => {
        const dependencies =
          dependenciesFor(false);

        const response =
          await createPlanGateway(
            dependencies
          )(
            requestFor(
              '{invalid-json'
            ),
            env
          );

        expect(
          response?.status
        ).toBe(429);

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      'fails closed when the limiter fails',
      async () => {
        const dependencies =
          dependenciesFor(true);

        vi.mocked(
          dependencies
            .rateLimiter
            .consume
        ).mockRejectedValue(
          new Error(
            'private limiter failure'
          )
        );

        const response =
          await createPlanGateway(
            dependencies
          )(
            requestFor(),
            env
          );

        expect(
          response?.status
        ).toBe(503);

        expect(
          await response?.text()
        ).not.toContain(
          'private limiter failure'
        );

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();
      }
    );
  }
);

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
  createPlanActionHandler,
} from '../src/plan/actionHandler';

import {
  createPlanGateway,
  type PlanGatewayDependencies,
} from '../src/plan/gateway';

import {
  PlanProviderError,
  type PlanProvider,
} from '../src/plan/provider';

import {
  allowAllPlanRateLimiter,
} from './plan-rate-limit-fixtures';

import {
  baselineRevision,
  sessionId,
  validPlanEvidence,
} from './plan-fixtures';

const allowedOrigin =
  'https://app.perfin.test';

const env = {
  ALLOWED_ORIGINS:
    allowedOrigin,

  GEMINI_API_KEY:
    'test-key',

  GEMINI_MODEL:
    'gemini-test-model',

  GEMINI_API_BASE:
    'https://provider.test/v1beta',
} as Env;

const requestFor = (
  path: string,
  body: unknown,
  authorization =
    'Bearer valid-id-token',
  appCheck =
    'valid-app-check-token'
) =>
  new Request(
    `https://worker.test${path}`,
    {
      method: 'POST',

      headers: {
        Origin:
          allowedOrigin,

        Authorization:
          authorization,

        'X-Firebase-AppCheck':
          appCheck,

        'Content-Type':
          'application/json',

        'X-Request-Id':
          'request-e2e',
      },

      body:
        JSON.stringify(body),
    }
  );

const dependenciesFor = (
  provider:
    PlanProvider,
  rateLimiter =
    allowAllPlanRateLimiter
) => {
  const events:
    unknown[] = [];

  const actionHandler =
    createPlanActionHandler({
      provider,

      sessionIdFactory:
        () => sessionId,
    });

  const dependencies:
    PlanGatewayDependencies = {
    verifyIdToken:
      vi.fn(
        async () => ({
          uid:
            'private-user-id',
        })
      ),

    verifyAppCheckToken:
      vi.fn(
        async () => ({
          appId:
            'private-app-id',
        })
      ),

    rateLimiter,

    invokeAction:
      actionHandler,

    recordOperationalEvent:
      (event) => {
        events.push(event);
      },
  };

  return {
    dependencies,
    events,
  };
};

describe(
  'PF-208 Plan gateway end-to-end',
  () => {
    it(
      'creates a session without invoking the provider',
      async () => {
        const provider:
          PlanProvider = {
          generate:
            vi.fn(),
        };

        const {
          dependencies,
        } =
          dependenciesFor(
            provider
          );

        const response =
          await createPlanGateway(
            dependencies
          )(
            requestFor(
              '/v1/plan/session',
              {
                schemaVersion: 1,
                evidence:
                  validPlanEvidence,
              }
            ),
            env
          );

        expect(
          response?.status
        ).toBe(201);

        expect(
          provider.generate
        ).not.toHaveBeenCalled();

        expect(
          await response?.json()
        ).toMatchObject({
          schemaVersion: 1,
          sessionId,
          baselineRevision,
        });
      }
    );

    it(
      'passes valid generate requests through the full pipeline',
      async () => {
        const provider:
          PlanProvider = {
          generate:
            vi.fn(
              async () => ({
                text:
                  'Planning guidance',
                attemptCount: 1,
              })
            ),
        };

        const {
          dependencies,
          events,
        } =
          dependenciesFor(
            provider
          );

        const response =
          await createPlanGateway(
            dependencies
          )(
            requestFor(
              '/v1/plan/generate',
              {
                schemaVersion: 1,
                sessionId,
                baselineRevision,
                evidence:
                  validPlanEvidence,
              }
            ),
            env
          );

        expect(
          response?.status
        ).toBe(200);

        expect(
          provider.generate
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          response?.headers.get(
            'Access-Control-Allow-Origin'
          )
        ).toBe(
          allowedOrigin
        );

        const serializedEvents =
          JSON.stringify(events);

        expect(
          serializedEvents
        ).not.toContain(
          'private-user-id'
        );

        expect(
          serializedEvents
        ).not.toContain(
          baselineRevision
        );
      }
    );

    it(
      'blocks invalid authentication before provider invocation',
      async () => {
        const provider:
          PlanProvider = {
          generate:
            vi.fn(),
        };

        const {
          dependencies,
        } =
          dependenciesFor(
            provider
          );

        vi.mocked(
          dependencies
            .verifyIdToken
        ).mockRejectedValue(
          new Error(
            'private auth failure'
          )
        );

        const response =
          await createPlanGateway(
            dependencies
          )(
            requestFor(
              '/v1/plan/generate',
              {
                schemaVersion: 1,
                sessionId,
                baselineRevision,
                evidence:
                  validPlanEvidence,
              }
            ),
            env
          );

        expect(
          response?.status
        ).toBe(401);

        expect(
          provider.generate
        ).not.toHaveBeenCalled();
      }
    );

    it(
      'blocks rate-limited requests before provider invocation',
      async () => {
        const provider:
          PlanProvider = {
          generate:
            vi.fn(),
        };

        const {
          dependencies,
        } =
          dependenciesFor(
            provider,
            {
              consume:
                async () => ({
                  allowed: false,
                  retryAfterSeconds:
                    60,
                }),
            }
          );

        const response =
          await createPlanGateway(
            dependencies
          )(
            requestFor(
              '/v1/plan/generate',
              {
                schemaVersion: 1,
                sessionId,
                baselineRevision,
                evidence:
                  validPlanEvidence,
              }
            ),
            env
          );

        expect(
          response?.status
        ).toBe(429);

        expect(
          provider.generate
        ).not.toHaveBeenCalled();
      }
    );

    it(
      'maps provider timeout to a generic client response',
      async () => {
        const provider:
          PlanProvider = {
          generate:
            vi.fn(
              async () => {
                throw new PlanProviderError(
                  'PROVIDER_TIMEOUT',
                  true
                );
              }
            ),
        };

        const {
          dependencies,
        } =
          dependenciesFor(
            provider
          );

        const response =
          await createPlanGateway(
            dependencies
          )(
            requestFor(
              '/v1/plan/generate',
              {
                schemaVersion: 1,
                sessionId,
                baselineRevision,
                evidence:
                  validPlanEvidence,
              }
            ),
            env
          );

        expect(
          response?.status
        ).toBe(504);

        const body =
          await response?.text();

        expect(body)
          .not.toContain(
            'private-user-id'
          );

        expect(body)
          .not.toContain(
            baselineRevision
          );
      }
    );
  }
);

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
  FIREBASE_PROJECT_ID:
    'perfin-test',
  FIREBASE_PROJECT_NUMBER:
    '123456789',
} as Env;

const requestFor = (
  body: unknown
) =>
  new Request(
    'https://worker.test/v1/plan/turn',
    {
      method: 'POST',
      headers: {
        Origin:
          'https://app.perfin.test',
        Authorization:
          'Bearer private-id-token',
        'X-Firebase-AppCheck':
          'private-app-check-token',
        'Content-Type':
          'application/json',
        'X-Request-Id':
          'request-123',
      },
      body:
        JSON.stringify(body),
    }
  );

const dependenciesFor = (
  events:
    unknown[]
): PlanGatewayDependencies => ({
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

  recordOperationalEvent:
    (event) => {
      events.push(event);
    },

  now: (() => {
    let value = 100;

    return () => {
      value += 10;
      return value;
    };
  })(),
});

describe(
  'PF-208 validated gateway metadata',
  () => {
    it(
      'passes only validated request data to the action',
      async () => {
        const events:
          unknown[] = [];

        const dependencies =
          dependenciesFor(
            events
          );

        const response =
          await createPlanGateway(
            dependencies
          )(
            requestFor({
              schemaVersion: 1,
              sessionId,
              baselineRevision,
              message:
                'Private planning message',
              evidence:
                validPlanEvidence,
            }),
            env
          );

        expect(
          response?.status
        ).toBe(200);

        expect(
          dependencies
            .invokeAction
        ).toHaveBeenCalledTimes(
          1
        );

        const invocation =
          vi.mocked(
            dependencies
              .invokeAction
          ).mock.calls[0][0];

        expect(
          invocation.body
        ).toMatchObject({
          schemaVersion: 1,
          sessionId,
          baselineRevision,
          message:
            'Private planning message',
        });

        expect(
          invocation.bodyBytes
        ).toBeGreaterThan(0);
      }
    );

    it(
      'records no identity, token, message, or evidence content',
      async () => {
        const events:
          unknown[] = [];

        const dependencies =
          dependenciesFor(
            events
          );

        await createPlanGateway(
          dependencies
        )(
          requestFor({
            schemaVersion: 1,
            sessionId,
            baselineRevision,
            message:
              'Private planning message',
            evidence:
              validPlanEvidence,
          }),
          env
        );

        const serialized =
          JSON.stringify(events);

        [
          'private-user-id',
          'private-app-id',
          'private-id-token',
          'private-app-check-token',
          'Private planning message',
          baselineRevision,
          'recordedIncomeMinor',
          'Midtown',
        ].forEach(
          (value) => {
            expect(
              serialized
            ).not.toContain(
              value
            );
          }
        );

        expect(events)
          .toMatchObject([
            {
              eventVersion: 1,
              eventName:
                'plan_gateway_request',
              action:
                'turn',
              outcome:
                'accepted',
              status: 200,
            },
          ]);
      }
    );

    it(
      'rejects invalid action bodies before invocation',
      async () => {
        const events:
          unknown[] = [];

        const dependencies =
          dependenciesFor(
            events
          );

        const response =
          await createPlanGateway(
            dependencies
          )(
            requestFor({
              schemaVersion: 1,
              sessionId,
              baselineRevision,
              message:
                'Private planning message',
              evidence: {
                ...validPlanEvidence,
                merchant:
                  'Private Merchant',
              },
            }),
            env
          );

        expect(
          response?.status
        ).toBe(400);

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();

        expect(events)
          .toMatchObject([
            {
              outcome:
                'rejected',
              status: 400,
              errorCode:
                'INVALID_REQUEST',
            },
          ]);

        expect(
          JSON.stringify(events)
        ).not.toContain(
          'Private Merchant'
        );
      }
    );

    it(
      'does not fail requests when metadata recording fails',
      async () => {
        const dependencies =
          dependenciesFor([]);

        dependencies
          .recordOperationalEvent =
            () => {
              throw new Error(
                'metadata sink failed'
              );
            };

        const response =
          await createPlanGateway(
            dependencies
          )(
            requestFor({
              schemaVersion: 1,
              sessionId,
              baselineRevision,
              message:
                'Private planning message',
              evidence:
                validPlanEvidence,
            }),
            env
          );

        expect(
          response?.status
        ).toBe(200);
      }
    );
  }
);

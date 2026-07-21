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
  PLAN_MAX_BODY_BYTES,
} from '../src/plan/contracts';

import {
  createPlanGateway,
  type PlanGatewayDependencies,
} from '../src/plan/gateway';

const allowedOrigin =
  'https://app.perfin.test';

const env = {
  ALLOWED_ORIGINS:
    allowedOrigin,
  FIREBASE_PROJECT_ID:
    'perfin-test',
  FIREBASE_PROJECT_NUMBER:
    '123456789',
} as Env;

interface RequestOptions {
  readonly method?: string;
  readonly origin?:
    string | null;
  readonly authorization?:
    string | null;
  readonly appCheck?:
    string | null;
  readonly contentType?:
    string | null;
  readonly body?: string;
}

const createRequest = (
  options:
    RequestOptions = {}
) => {
  const method =
    options.method ??
    'POST';

  const headers =
    new Headers();

  const origin =
    options.origin ===
    undefined
      ? allowedOrigin
      : options.origin;

  const authorization =
    options.authorization ===
    undefined
      ? 'Bearer id-token'
      : options.authorization;

  const appCheck =
    options.appCheck ===
    undefined
      ? 'app-check-token'
      : options.appCheck;

  const contentType =
    options.contentType ===
    undefined
      ? 'application/json'
      : options.contentType;

  if (origin) {
    headers.set(
      'Origin',
      origin
    );
  }

  if (authorization) {
    headers.set(
      'Authorization',
      authorization
    );
  }

  if (appCheck) {
    headers.set(
      'X-Firebase-AppCheck',
      appCheck
    );
  }

  if (contentType) {
    headers.set(
      'Content-Type',
      contentType
    );
  }

  return new Request(
    'https://worker.test/v1/plan/generate',
    {
      method,
      headers,
      body:
        method === 'POST'
          ? options.body ??
            JSON.stringify({
              version: 1,
            })
          : undefined,
    }
  );
};

const createDependencies =
  (): PlanGatewayDependencies => ({
    verifyIdToken:
      vi.fn(
        async () => ({
          uid: 'user-123',
        })
      ),

    verifyAppCheckToken:
      vi.fn(
        async () => ({
          appId:
            'app-123',
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
              headers: {
                'Content-Type':
                  'application/json',
              },
            }
          )
      ),
  });

const requireResponse = (
  response:
    Response | null
): Response => {
  if (!response) {
    throw new Error(
      'Expected Plan gateway response'
    );
  }

  return response;
};

describe(
  'PF-208 protected Plan gateway',
  () => {
    it(
      'rejects a disallowed origin before verification',
      async () => {
        const dependencies =
          createDependencies();

        const gateway =
          createPlanGateway(
            dependencies
          );

        const response =
          requireResponse(
            await gateway(
              createRequest({
                origin:
                  'https://evil.test',
              }),
              env
            )
          );

        expect(
          response.status
        ).toBe(403);

        expect(
          dependencies
            .verifyIdToken
        ).not.toHaveBeenCalled();

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();

        expect(
          response.headers.get(
            'Access-Control-Allow-Origin'
          )
        ).toBeNull();
      }
    );

    it(
      'returns restricted preflight headers',
      async () => {
        const dependencies =
          createDependencies();

        const gateway =
          createPlanGateway(
            dependencies
          );

        const response =
          requireResponse(
            await gateway(
              createRequest({
                method:
                  'OPTIONS',
              }),
              env
            )
          );

        expect(
          response.status
        ).toBe(204);

        expect(
          response.headers.get(
            'Access-Control-Allow-Origin'
          )
        ).toBe(
          allowedOrigin
        );

        expect(
          response.headers.get(
            'Access-Control-Allow-Origin'
          )
        ).not.toBe('*');

        expect(
          dependencies
            .verifyIdToken
        ).not.toHaveBeenCalled();
      }
    );

    it(
      'rejects unsupported methods before verification',
      async () => {
        const dependencies =
          createDependencies();

        const response =
          requireResponse(
            await createPlanGateway(
              dependencies
            )(
              createRequest({
                method: 'GET',
              }),
              env
            )
          );

        expect(
          response.status
        ).toBe(405);

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      'requires JSON content',
      async () => {
        const dependencies =
          createDependencies();

        const response =
          requireResponse(
            await createPlanGateway(
              dependencies
            )(
              createRequest({
                contentType:
                  'text/plain',
              }),
              env
            )
          );

        expect(
          response.status
        ).toBe(415);

        expect(
          dependencies
            .verifyIdToken
        ).not.toHaveBeenCalled();
      }
    );

    it(
      'rejects a missing ID token before App Check',
      async () => {
        const dependencies =
          createDependencies();

        const response =
          requireResponse(
            await createPlanGateway(
              dependencies
            )(
              createRequest({
                authorization:
                  null,
              }),
              env
            )
          );

        expect(
          response.status
        ).toBe(401);

        expect(
          dependencies
            .verifyAppCheckToken
        ).not.toHaveBeenCalled();

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      'rejects invalid authentication before App Check',
      async () => {
        const dependencies =
          createDependencies();

        vi.mocked(
          dependencies
            .verifyIdToken
        ).mockRejectedValue(
          new Error(
            'private auth error'
          )
        );

        const response =
          requireResponse(
            await createPlanGateway(
              dependencies
            )(
              createRequest(),
              env
            )
          );

        expect(
          response.status
        ).toBe(401);

        expect(
          dependencies
            .verifyAppCheckToken
        ).not.toHaveBeenCalled();

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();

        expect(
          await response.text()
        ).not.toContain(
          'private auth error'
        );
      }
    );

    it(
      'rejects a missing App Check token before action invocation',
      async () => {
        const dependencies =
          createDependencies();

        const response =
          requireResponse(
            await createPlanGateway(
              dependencies
            )(
              createRequest({
                appCheck: null,
              }),
              env
            )
          );

        expect(
          response.status
        ).toBe(401);

        expect(
          dependencies
            .verifyIdToken
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          dependencies
            .verifyAppCheckToken
        ).not.toHaveBeenCalled();

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      'rejects invalid App Check before action invocation',
      async () => {
        const dependencies =
          createDependencies();

        vi.mocked(
          dependencies
            .verifyAppCheckToken
        ).mockRejectedValue(
          new Error(
            'private app error'
          )
        );

        const response =
          requireResponse(
            await createPlanGateway(
              dependencies
            )(
              createRequest(),
              env
            )
          );

        expect(
          response.status
        ).toBe(401);

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();

        expect(
          await response.text()
        ).not.toContain(
          'private app error'
        );
      }
    );

    it(
      'rejects malformed JSON after both security checks',
      async () => {
        const dependencies =
          createDependencies();

        const response =
          requireResponse(
            await createPlanGateway(
              dependencies
            )(
              createRequest({
                body: '{invalid',
              }),
              env
            )
          );

        expect(
          response.status
        ).toBe(400);

        expect(
          dependencies
            .verifyIdToken
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          dependencies
            .verifyAppCheckToken
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      'rejects a body over the configured limit',
      async () => {
        const dependencies =
          createDependencies();

        const response =
          requireResponse(
            await createPlanGateway(
              dependencies
            )(
              createRequest({
                body:
                  'x'.repeat(
                    PLAN_MAX_BODY_BYTES +
                      1
                  ),
              }),
              env
            )
          );

        expect(
          response.status
        ).toBe(413);

        expect(
          dependencies
            .invokeAction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      'awaits auth and App Check before invoking the action',
      async () => {
        const sequence:
          string[] = [];

        const dependencies:
          PlanGatewayDependencies = {
          verifyIdToken:
            async () => {
              sequence.push(
                'auth-start'
              );

              await Promise.resolve();

              sequence.push(
                'auth-end'
              );

              return {
                uid: 'user-123',
              };
            },

          verifyAppCheckToken:
            async () => {
              sequence.push(
                'app-start'
              );

              await Promise.resolve();

              sequence.push(
                'app-end'
              );

              return {
                appId:
                  'app-123',
              };
            },

          invokeAction:
            async (
              context
            ) => {
              sequence.push(
                'action'
              );

              expect(
                context.uid
              ).toBe(
                'user-123'
              );

              expect(
                context.appId
              ).toBe(
                'app-123'
              );

              return new Response(
                JSON.stringify({
                  ok: true,
                }),
                {
                  status: 200,
                }
              );
            },
        };

        const response =
          requireResponse(
            await createPlanGateway(
              dependencies
            )(
              createRequest(),
              env
            )
          );

        expect(
          response.status
        ).toBe(200);

        expect(sequence)
          .toEqual([
            'auth-start',
            'auth-end',
            'app-start',
            'app-end',
            'action',
          ]);
      }
    );

    it(
      'returns the approved origin rather than a wildcard',
      async () => {
        const dependencies =
          createDependencies();

        const response =
          requireResponse(
            await createPlanGateway(
              dependencies
            )(
              createRequest(),
              env
            )
          );

        expect(
          response.headers.get(
            'Access-Control-Allow-Origin'
          )
        ).toBe(
          allowedOrigin
        );

        expect(
          response.headers.get(
            'Access-Control-Allow-Origin'
          )
        ).not.toBe('*');
      }
    );
  }
);

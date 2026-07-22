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
  PlanProviderError,
  type PlanProvider,
} from '../src/plan/provider';

import {
  baselineRevision,
  sessionId,
  validPlanEvidence,
  validPlanGenerationMetadata,
  validPlanProviderResult,
  validPlanStructuredOutput,
} from './plan-fixtures';

const env = {} as Env;

const successProvider =
  (): PlanProvider => ({
    generate:
      vi.fn(
        async () =>
          validPlanProviderResult
      ),
  });

describe(
  'PF-208 Plan action handler',
  () => {
    it(
      'creates sessions without invoking Gemini',
      async () => {
        const provider =
          successProvider();

        const response =
          await createPlanActionHandler({
            provider,
            sessionIdFactory:
              () => sessionId,
          })(
            {
              action:
                'session',
              uid:
                'private-user',
              appId:
                'private-app',
              requestId:
                'request-123',
              bodyBytes: 100,
              body: {
                schemaVersion: 1,
                evidence:
                  validPlanEvidence,
              },
            },
            env
          );

        expect(
          response.status
        ).toBe(201);

        expect(
          provider.generate
        ).not.toHaveBeenCalled();

        expect(
          await response.json()
        ).toEqual({
          schemaVersion: 1,
          sessionId,
          baselineRevision,
        });
      }
    );

    it(
      'returns provider guidance for generate',
      async () => {
        const provider =
          successProvider();

        const response =
          await createPlanActionHandler({
            provider,
          })(
            {
              action:
                'generate',
              uid:
                'private-user',
              appId:
                'private-app',
              requestId:
                'request-123',
              bodyBytes: 100,
              body: {
                schemaVersion: 1,
                sessionId,
                baselineRevision,
                evidence:
                  validPlanEvidence,
              },
            },
            env
          );

        expect(
          response.status
        ).toBe(200);

        expect(
          await response.json()
        ).toEqual({
          schemaVersion: 1,
          action:
            'generate',
          sessionId,
          baselineRevision,
          result:
            validPlanStructuredOutput,

          generation:
            validPlanGenerationMetadata,

          validationState:
            'valid',
        });
      }
    );

    it(
      'returns a generic timeout error',
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

        const response =
          await createPlanActionHandler({
            provider,
          })(
            {
              action:
                'generate',
              uid:
                'private-user',
              appId:
                'private-app',
              requestId:
                'request-123',
              bodyBytes: 100,
              body: {
                schemaVersion: 1,
                sessionId,
                baselineRevision,
                evidence:
                  validPlanEvidence,
              },
            },
            env
          );

        expect(
          response.status
        ).toBe(504);

        const serialized =
          await response.text();

        expect(serialized)
          .toContain(
            'PROVIDER_TIMEOUT'
          );

        expect(serialized)
          .not.toContain(
            'private-user'
          );

        expect(serialized)
          .not.toContain(
            baselineRevision
          );
      }
    );

    it(
      'does not expose provider failure details',
      async () => {
        const privateFailure =
          'private provider body';

        const provider:
          PlanProvider = {
          generate:
            vi.fn(
              async () => {
                throw new Error(
                  privateFailure
                );
              }
            ),
        };

        const response =
          await createPlanActionHandler({
            provider,
          })(
            {
              action:
                'revise',
              uid:
                'private-user',
              appId:
                'private-app',
              requestId:
                'request-123',
              bodyBytes: 100,
              body: {
                schemaVersion: 1,
                sessionId,
                baselineRevision,
                instruction:
                  'Private instruction',
                evidence:
                  validPlanEvidence,
              },
            },
            env
          );

        expect(
          response.status
        ).toBe(503);

        expect(
          await response.text()
        ).not.toContain(
          privateFailure
        );
      }
    );
  }
);

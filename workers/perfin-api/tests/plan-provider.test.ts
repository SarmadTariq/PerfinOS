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
  createGeminiPlanProvider,
  createInMemoryPlanCircuitBreaker,
  PlanProviderError,
} from '../src/plan/provider';

import {
  baselineRevision,
  sessionId,
  validPlanEvidence,
} from './plan-fixtures';

const env = {
  GEMINI_API_KEY:
    'private-api-key',

  GEMINI_MODEL:
    'gemini-test-model',

  GEMINI_API_BASE:
    'https://provider.test/v1beta',
} as Env;

const request = {
  action:
    'generate' as const,

  request: {
    schemaVersion: 1 as const,
    sessionId,
    baselineRevision,
    evidence:
      validPlanEvidence,
  },
};

const structuredCandidate = {
  schemaVersion: 1,
  action: 'generate',
  baselineRevision,
  currency: 'CAD',
  periodKind:
    'current_month',
  summary:
    'Planning guidance',
  observations: [
    {
      id:
        'observation-1',
      statement:
        'Recorded expenses are below recorded income.',
      evidenceRefs: [
        'totals.recordedExpensesMinor',
        'totals.recordedIncomeMinor',
      ],
    },
  ],
  allocations: [],
  commitments: [],
  recommendations: [],
  actionProposals: [],
  warnings: [],
};

const successResponse = () =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              {
                text:
                  JSON.stringify(
                    structuredCandidate
                  ),
              },
            ],
          },
        },
      ],
    }),
    {
      status: 200,
      headers: {
        'Content-Type':
          'application/json',
      },
    }
  );

describe(
  'PF-208 Gemini provider',
  () => {
    it(
      'uses configured model and API-key header',
      async () => {
        const fetcher =
          vi.fn(
            async () =>
              successResponse()
          );

        const result =
          await createGeminiPlanProvider({
            fetcher,

            sleep:
              async () => {},

            now:
              () =>
                new Date(
                  '2026-07-21T20:00:00.000Z'
                ),
          }).generate(
            request,
            env
          );

        expect(result)
          .toEqual({
            text:
              JSON.stringify(
                structuredCandidate
              ),

            candidate:
              structuredCandidate,

            attemptCount: 1,

            metadata: {
              modelId:
                'gemini-test-model',

              promptVersion:
                'plan-prompt-v1',

              responseSchemaVersion:
                'plan-response-v1',

              outputSchemaVersion:
                1,

              attemptCount:
                1,

              generatedAt:
                '2026-07-21T20:00:00.000Z',
            },
          });

        expect(fetcher)
          .toHaveBeenCalledTimes(1);

        const [
          endpoint,
          options,
        ] = fetcher.mock.calls[0];

        expect(
          String(endpoint)
        ).toBe(
          'https://provider.test/v1beta/models/gemini-test-model:generateContent'
        );

        expect(
          String(endpoint)
        ).not.toContain(
          'private-api-key'
        );

        const headers =
          new Headers(
            options?.headers
          );

        expect(
          headers.get(
            'x-goog-api-key'
          )
        ).toBe(
          'private-api-key'
        );
      }
    );

    it(
      'retries one transient provider failure',
      async () => {
        const fetcher =
          vi.fn()
            .mockResolvedValueOnce(
              new Response(
                'private provider failure',
                {
                  status: 503,
                }
              )
            )
            .mockResolvedValueOnce(
              successResponse()
            );

        const result =
          await createGeminiPlanProvider({
            fetcher,
            sleep:
              async () => {},
          }).generate(
            request,
            env
          );

        expect(result)
          .toMatchObject({
            attemptCount: 2,
          });

        expect(fetcher)
          .toHaveBeenCalledTimes(2);
      }
    );

    it(
      'does not retry a permanent provider rejection',
      async () => {
        const fetcher =
          vi.fn(
            async () =>
              new Response(
                'private provider rejection',
                {
                  status: 400,
                }
              )
          );

        await expect(
          createGeminiPlanProvider({
            fetcher,
            sleep:
              async () => {},
          }).generate(
            request,
            env
          )
        ).rejects.toMatchObject({
          code:
            'PROVIDER_REJECTED',
        });

        expect(fetcher)
          .toHaveBeenCalledTimes(1);
      }
    );

    it(
      'aborts a timed-out request and retries once',
      async () => {
        let invocation = 0;

        const fetcher =
          vi.fn(
            async (
              _input,
              options
            ) => {
              invocation += 1;

              if (invocation === 2) {
                return successResponse();
              }

              return new Promise<Response>(
                (
                  _resolve,
                  reject
                ) => {
                  options
                    ?.signal
                    ?.addEventListener(
                      'abort',
                      () => {
                        reject(
                          new DOMException(
                            'aborted',
                            'AbortError'
                          )
                        );
                      }
                    );
                }
              );
            }
          );

        const result =
          await createGeminiPlanProvider({
            fetcher,
            timeoutMs: 5,
            sleep:
              async () => {},
          }).generate(
            request,
            env
          );

        expect(result)
          .toMatchObject({
            attemptCount: 2,
          });

        expect(fetcher)
          .toHaveBeenCalledTimes(2);
      }
    );

    it(
      'rejects a malformed provider response',
      async () => {
        const fetcher =
          vi.fn(
            async () =>
              new Response(
                JSON.stringify({
                  candidates: [],
                }),
                {
                  status: 200,
                }
              )
          );

        await expect(
          createGeminiPlanProvider({
            fetcher,
          }).generate(
            request,
            env
          )
        ).rejects.toMatchObject({
          code:
            'PROVIDER_RESPONSE_INVALID',
        });
      }
    );

    it(
      'rejects syntactically invalid structured JSON',
      async () => {
        const fetcher =
          vi.fn(
            async () =>
              new Response(
                JSON.stringify({
                  candidates: [
                    {
                      content: {
                        parts: [
                          {
                            text:
                              '{invalid-json',
                          },
                        ],
                      },
                    },
                  ],
                }),
                {
                  status: 200,
                }
              )
          );

        await expect(
          createGeminiPlanProvider({
            fetcher,
          }).generate(
            request,
            env
          )
        ).rejects.toMatchObject({
          code:
            'PROVIDER_RESPONSE_INVALID',
        });
      }
    );

    it(
      'rejects missing provider configuration before fetch',
      async () => {
        const fetcher =
          vi.fn();

        await expect(
          createGeminiPlanProvider({
            fetcher,
          }).generate(
            request,
            {
              GEMINI_MODEL:
                'gemini-test-model',
            } as Env
          )
        ).rejects.toMatchObject({
          code:
            'PROVIDER_CONFIGURATION',
        });

        expect(fetcher)
          .not.toHaveBeenCalled();
      }
    );

    it(
      'opens the circuit after repeated transient failures',
      async () => {
        let now = 0;

        const circuitBreaker =
          createInMemoryPlanCircuitBreaker({
            failureThreshold: 2,
            openDurationMs:
              1_000,
            now: () => now,
          });

        const fetcher =
          vi.fn(
            async () =>
              new Response(
                'private provider failure',
                {
                  status: 503,
                }
              )
          );

        const provider =
          createGeminiPlanProvider({
            fetcher,
            maxRetries: 0,
            circuitBreaker,
          });

        await expect(
          provider.generate(
            request,
            env
          )
        ).rejects.toBeInstanceOf(
          PlanProviderError
        );

        await expect(
          provider.generate(
            request,
            env
          )
        ).rejects.toBeInstanceOf(
          PlanProviderError
        );

        const callsBeforeOpen =
          fetcher.mock.calls.length;

        await expect(
          provider.generate(
            request,
            env
          )
        ).rejects.toMatchObject({
          code:
            'PROVIDER_CIRCUIT_OPEN',
        });

        expect(
          fetcher.mock.calls.length
        ).toBe(
          callsBeforeOpen
        );

        now += 1_000;

        await expect(
          provider.generate(
            request,
            env
          )
        ).rejects.toBeInstanceOf(
          PlanProviderError
        );

        expect(
          fetcher.mock.calls.length
        ).toBe(
          callsBeforeOpen + 1
        );
      }
    );
  }
);

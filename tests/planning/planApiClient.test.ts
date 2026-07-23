import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  PlanEvidenceSnapshot,
} from '../../src/planning/planEvidence.types';

import {
  createPlanApiClient,
  createPlanContextMessage,
  PlanApiClientError,
} from '../../src/services/plan';

const baselineRevision =
  `pe1-${'a'.repeat(32)}`;

const sessionId =
  '123e4567-e89b-42d3-a456-426614174000';

const evidence:
  PlanEvidenceSnapshot = {
    schemaVersion:
      1,

    baselineRevision,

    period: {
      kind:
        'current_month',

      startDate:
        '2026-07-01',

      endDate:
        '2026-07-23',

      monthKey:
        '2026-07',

      dayCount:
        23,

      isCompleteCalendarMonth:
        false,
    },

    currency:
      'CAD',

    currencyFractionDigits:
      2,

    totals: {
      recordedIncomeMinor:
        300_000,

      expectedIncome: {
        amountMinor:
          400_000,

        basis:
          'profile_monthly_income',
      },

      recordedExpensesMinor:
        125_000,

      netCashFlowMinor:
        175_000,

      projectedRecurringCommitmentsMinor:
        50_000,

      unmatchedRecurringCommitmentsMinor:
        25_000,

      availableAfterCommitmentsMinor:
        150_000,

      budgetTotalMinor:
        250_000,

      horizonBudgetSpendMinor:
        125_000,
    },

    categories: [],

    recurring: [],

    savings: {
      goalCount:
        0,

      targetMinor:
        0,

      savedMinor:
        0,

      remainingMinor:
        0,

      completionPercent:
        0,
    },

    locations: [],

    coverage: {
      status:
        'partial',

      transactionCount:
        4,

      incomeTransactionCount:
        1,

      expenseTransactionCount:
        3,

      locationEligibleTransactionCount:
        0,

      warnings: [
        {
          code:
            'NO_SAVINGS_GOALS',

          message:
            'No savings goals are available for planning evidence.',
        },

        {
          code:
            'NO_RECURRING_COMMITMENTS',

          message:
            'No recurring commitments are due in this evidence period.',
        },

        {
          code:
            'LOCATION_COVERAGE_UNAVAILABLE',

          message:
            'No coarse location area meets the minimum evidence threshold.',
        },
      ],
    },
  };

const context = {
  primaryGoal:
    'Reduce flexible spending',

  constraints: [
    'Keep housing unchanged',
  ],

  coachInput:
    'Focus on the next two weeks.',
};

const validTurnResponse = {
  schemaVersion:
    1,

  action:
    'turn',

  sessionId,

  baselineRevision,

  result: {
    schemaVersion:
      1,

    action:
      'turn',

    baselineRevision,

    currency:
      'CAD',

    periodKind:
      'current_month',

    summary:
      'A structured draft.',

    observations: [
      {
        id:
          'observation-1',

        statement:
          'Recorded expenses remain below recorded income.',

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
  },

  generation: {
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
      '2026-07-23T16:00:00.000Z',
  },

  validationState:
    'valid',
};

const credentials = {
  getIdToken:
    vi.fn(
      async () =>
        'private-id-token'
    ),

  getAppCheckToken:
    vi.fn(
      async () =>
        'private-app-check-token'
    ),
};

describe(
  'PF-210 secure Plan API client',
  () => {
    it(
      'creates a session and sends one protected planning turn',
      async () => {
        const requests:
          Array<{
            url: string;
            init:
              RequestInit | undefined;
          }> = [];

        const fetcher:
          typeof fetch =
          async (
            input,
            init
          ) => {
            const url =
              String(input);

            requests.push({
              url,
              init,
            });

            if (
              url.endsWith(
                '/v1/plan/session'
              )
            ) {
              return new Response(
                JSON.stringify({
                  schemaVersion:
                    1,

                  sessionId,

                  baselineRevision,
                }),
                {
                  status:
                    201,

                  headers: {
                    'Content-Type':
                      'application/json',
                  },
                }
              );
            }

            return new Response(
              JSON.stringify(
                validTurnResponse
              ),
              {
                status:
                  200,

                headers: {
                  'Content-Type':
                    'application/json',
                },
              }
            );
          };

        const client =
          createPlanApiClient({
            baseUrl:
              'https://api.example.test',

            fetcher,

            credentials,
          });

        const result =
          await client
            .createDraft(
              evidence,
              context
            );

        expect(
          result.validationState
        ).toBe('valid');

        expect(
          requests.map(
            (request) =>
              request.url
          )
        ).toEqual([
          'https://api.example.test/v1/plan/session',
          'https://api.example.test/v1/plan/turn',
        ]);

        requests.forEach(
          ({
            init,
          }) => {
            const headers =
              new Headers(
                init?.headers
              );

            expect(
              headers.get(
                'Authorization'
              )
            ).toBe(
              'Bearer private-id-token'
            );

            expect(
              headers.get(
                'X-Firebase-AppCheck'
              )
            ).toBe(
              'private-app-check-token'
            );

            expect(
              init?.body
            ).not.toContain(
              'private-id-token'
            );

            expect(
              init?.body
            ).not.toContain(
              'private-app-check-token'
            );
          }
        );

        const turnBody =
          JSON.parse(
            String(
              requests[1]
                .init
                ?.body
            )
          );

        const planningContext =
          JSON.parse(
            turnBody.message
          );

        expect(
          planningContext
        ).toEqual({
          contextVersion:
            1,

          primaryGoal:
            context.primaryGoal,

          constraints:
            context.constraints,

          coachInput:
            context.coachInput,
        });
      }
    );

    it(
      'maps Worker rate limits without exposing response details',
      async () => {
        const client =
          createPlanApiClient({
            baseUrl:
              'https://api.example.test',

            credentials,

            fetcher:
              async () =>
                new Response(
                  JSON.stringify({
                    error: {
                      code:
                        'RATE_LIMITED',

                      message:
                        'Too many requests.',
                    },
                  }),
                  {
                    status:
                      429,

                    headers: {
                      'Content-Type':
                        'application/json',

                      'Retry-After':
                        '60',
                    },
                  }
                ),
          });

        await expect(
          client.createDraft(
            evidence,
            context
          )
        ).rejects.toMatchObject({
          code:
            'rate_limited',

          status:
            429,

          retryAfterSeconds:
            60,
        });
      }
    );

    it(
      'fails before fetch when app verification is unavailable',
      async () => {
        const fetcher =
          vi.fn();

        const client =
          createPlanApiClient({
            baseUrl:
              'https://api.example.test',

            fetcher:
              fetcher as
                unknown as
                typeof fetch,

            credentials: {
              getIdToken:
                async () =>
                  'private-id-token',

              getAppCheckToken:
                async () => {
                  throw new Error(
                    'native app check unavailable'
                  );
                },
            },
          });

        await expect(
          client.createDraft(
            evidence,
            context
          )
        ).rejects.toMatchObject({
          code:
            'app_verification_unavailable',
        });

        expect(
          fetcher
        ).not.toHaveBeenCalled();
      }
    );

    it(
      'rejects non-HTTPS remote configuration',
      () => {
        expect(() =>
          createPlanApiClient({
            baseUrl:
              'http://api.example.test',
          })
        ).toThrow(
          PlanApiClientError
        );
      }
    );

    it(
      'rejects a context envelope above the Worker limit',
      () => {
        expect(() =>
          createPlanContextMessage({
            primaryGoal:
              'a'.repeat(160),

            constraints:
              Array.from(
                {
                  length: 5,
                },
                () =>
                  '\\'.repeat(
                    120
                  )
              ),

            coachInput:
              '\\'.repeat(
                800
              ),
          })
        ).toThrow(
          PlanApiClientError
        );
      }
    );

    it(
      'rejects a stale or malformed successful response',
      async () => {
        const client =
          createPlanApiClient({
            baseUrl:
              'https://api.example.test',

            credentials,

            fetcher:
              async (
                input
              ) => {
                if (
                  String(input)
                    .endsWith(
                      '/session'
                    )
                ) {
                  return new Response(
                    JSON.stringify({
                      schemaVersion:
                        1,

                      sessionId,

                      baselineRevision,
                    }),
                    {
                      status:
                        201,

                      headers: {
                        'Content-Type':
                          'application/json',
                      },
                    }
                  );
                }

                return new Response(
                  JSON.stringify({
                    ...validTurnResponse,

                    baselineRevision:
                      `pe1-${'b'.repeat(32)}`,
                  }),
                  {
                    status:
                      200,

                    headers: {
                      'Content-Type':
                        'application/json',
                    },
                  }
                );
              },
          });

        await expect(
          client.createDraft(
            evidence,
            context
          )
        ).rejects.toMatchObject({
          code:
            'invalid_response',
        });
      }
    );
  }
);

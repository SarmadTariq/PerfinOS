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
  createCloudflarePlanRateLimiter,
  createInMemoryPlanRateLimiter,
  planRateLimitKeyFor,
} from '../src/plan/rateLimit';

describe(
  'PF-208 Plan rate limiting',
  () => {
    it(
      'creates stable privacy-safe keys',
      async () => {
        const first =
          await planRateLimitKeyFor(
            'user-123',
            'generate'
          );

        const second =
          await planRateLimitKeyFor(
            'user-123',
            'generate'
          );

        expect(first)
          .toBe(second);

        expect(first)
          .not.toContain(
            'user-123'
          );
      }
    );

    it(
      'isolates counters by user',
      async () => {
        let now = 0;

        const limiter =
          createInMemoryPlanRateLimiter(
            () => now
          );

        const input = {
          action:
            'generate' as const,
          requestsPerWindow: 1,
          windowSeconds: 60,
        };

        expect(
          await limiter.consume(
            {
              ...input,
              uid: 'user-a',
            },
            {} as Env
          )
        ).toMatchObject({
          allowed: true,
        });

        expect(
          await limiter.consume(
            {
              ...input,
              uid: 'user-a',
            },
            {} as Env
          )
        ).toMatchObject({
          allowed: false,
        });

        expect(
          await limiter.consume(
            {
              ...input,
              uid: 'user-b',
            },
            {} as Env
          )
        ).toMatchObject({
          allowed: true,
        });

        now += 60_000;

        expect(
          await limiter.consume(
            {
              ...input,
              uid: 'user-a',
            },
            {} as Env
          )
        ).toMatchObject({
          allowed: true,
        });
      }
    );

    it(
      'isolates counters by route',
      async () => {
        const limiter =
          createInMemoryPlanRateLimiter(
            () => 0
          );

        await limiter.consume(
          {
            uid: 'user-a',
            action: 'generate',
            requestsPerWindow: 1,
            windowSeconds: 60,
          },
          {} as Env
        );

        expect(
          await limiter.consume(
            {
              uid: 'user-a',
              action: 'revise',
              requestsPerWindow: 1,
              windowSeconds: 60,
            },
            {} as Env
          )
        ).toMatchObject({
          allowed: true,
        });
      }
    );

    it(
      'uses the matching Cloudflare binding',
      async () => {
        const limit =
          vi.fn(
            async () => ({
              success: true,
            })
          );

        const env = {
          PLAN_GENERATE_RATE_LIMITER: {
            limit,
          },
        } as unknown as Env;

        const decision =
          await createCloudflarePlanRateLimiter()
            .consume(
              {
                uid: 'user-a',
                action: 'generate',
                requestsPerWindow: 6,
                windowSeconds: 60,
              },
              env
            );

        expect(decision)
          .toEqual({
            allowed: true,
            retryAfterSeconds: 60,
          });

        expect(limit)
          .toHaveBeenCalledTimes(1);

        expect(
          limit.mock.calls[0][0]
            .key
        ).not.toContain(
          'user-a'
        );
      }
    );
  }
);

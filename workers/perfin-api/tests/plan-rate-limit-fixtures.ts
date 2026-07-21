import type {
  PlanRateLimiter,
} from '../src/plan/rateLimit';

export const allowAllPlanRateLimiter:
  PlanRateLimiter = {
    consume:
      async (
        input
      ) => ({
        allowed: true,
        retryAfterSeconds:
          input.windowSeconds,
      }),
  };

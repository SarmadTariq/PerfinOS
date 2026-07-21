import type {
  Env,
} from '../env';

import {
  PLAN_RATE_LIMIT_WINDOW_SECONDS,
  PLAN_ROUTE_DEFINITIONS,
  type PlanGatewayAction,
} from './contracts';

export interface PlanRateLimitInput {
  readonly uid: string;

  readonly action:
    PlanGatewayAction;

  readonly requestsPerWindow:
    number;

  readonly windowSeconds:
    number;
}

export interface PlanRateLimitDecision {
  readonly allowed:
    boolean;

  readonly retryAfterSeconds:
    number;
}

export interface PlanRateLimiter {
  readonly consume: (
    input:
      PlanRateLimitInput,
    env: Env
  ) => Promise<
    PlanRateLimitDecision
  >;
}

const routeDefinitionFor = (
  action:
    PlanGatewayAction
) => {
  const definition =
    Object.values(
      PLAN_ROUTE_DEFINITIONS
    ).find(
      (candidate) =>
        candidate.action ===
        action
    );

  if (!definition) {
    throw new Error(
      'Plan rate-limit route is not configured'
    );
  }

  return definition;
};

const bindingFor = (
  env: Env,
  action:
    PlanGatewayAction
): RateLimit | undefined => {
  if (action === 'session') {
    return env
      .PLAN_SESSION_RATE_LIMITER;
  }

  if (action === 'turn') {
    return env
      .PLAN_TURN_RATE_LIMITER;
  }

  if (action === 'generate') {
    return env
      .PLAN_GENERATE_RATE_LIMITER;
  }

  return env
    .PLAN_REVISE_RATE_LIMITER;
};

const bytesToHex = (
  bytes: ArrayBuffer
) =>
  Array.from(
    new Uint8Array(bytes)
  )
    .map(
      (value) =>
        value
          .toString(16)
          .padStart(2, '0')
    )
    .join('');

export const planRateLimitKeyFor =
  async (
    uid: string,
    action:
      PlanGatewayAction
  ): Promise<string> => {
    const normalizedUid =
      uid.trim();

    if (
      normalizedUid.length === 0 ||
      normalizedUid.length > 128
    ) {
      throw new Error(
        'Rate-limit UID has an invalid format'
      );
    }

    const digest =
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(
          normalizedUid
        )
      );

    return [
      'plan-v1',
      action,
      bytesToHex(digest),
    ].join(':');
  };

export const createCloudflarePlanRateLimiter =
  (): PlanRateLimiter => ({
    consume:
      async (
        input,
        env
      ) => {
        const definition =
          routeDefinitionFor(
            input.action
          );

        if (
          input.requestsPerWindow !==
            definition
              .requestsPerWindow ||
          input.windowSeconds !==
            PLAN_RATE_LIMIT_WINDOW_SECONDS
        ) {
          throw new Error(
            'Rate-limit policy does not match the route contract'
          );
        }

        const binding =
          bindingFor(
            env,
            input.action
          );

        if (!binding) {
          throw new Error(
            'Plan rate-limit binding is unavailable'
          );
        }

        const key =
          await planRateLimitKeyFor(
            input.uid,
            input.action
          );

        const result =
          await binding.limit({
            key,
          });

        return {
          allowed:
            result.success,
          retryAfterSeconds:
            PLAN_RATE_LIMIT_WINDOW_SECONDS,
        };
      },
  });

export const createInMemoryPlanRateLimiter =
  (
    now:
      () => number =
        () => Date.now()
  ): PlanRateLimiter => {
    const counters =
      new Map<
        string,
        {
          windowStartedAt:
            number;
          consumed:
            number;
        }
      >();

    return {
      consume:
        async (
          input
        ) => {
          const currentTime =
            now();

          const key =
            await planRateLimitKeyFor(
              input.uid,
              input.action
            );

          const windowMs =
            input.windowSeconds *
            1_000;

          const existing =
            counters.get(key);

          const expired =
            !existing ||
            currentTime -
              existing
                .windowStartedAt >=
              windowMs;

          const counter =
            expired
              ? {
                  windowStartedAt:
                    currentTime,
                  consumed: 0,
                }
              : existing;

          if (
            counter.consumed >=
            input.requestsPerWindow
          ) {
            const remainingMs =
              Math.max(
                0,
                windowMs -
                  (
                    currentTime -
                    counter
                      .windowStartedAt
                  )
              );

            return {
              allowed: false,
              retryAfterSeconds:
                Math.max(
                  1,
                  Math.ceil(
                    remainingMs /
                    1_000
                  )
                ),
            };
          }

          counter.consumed += 1;

          counters.set(
            key,
            counter
          );

          return {
            allowed: true,
            retryAfterSeconds:
              input.windowSeconds,
          };
        },
    };
  };

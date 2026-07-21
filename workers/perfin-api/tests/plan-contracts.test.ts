import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PLAN_API_VERSION,
  PLAN_APP_CHECK_HEADER,
  PLAN_AUTHORIZATION_HEADER,
  PLAN_MAX_BODY_BYTES,
  PLAN_PROVIDER_MAX_RETRIES,
  PLAN_PROVIDER_TIMEOUT_MS,
  PLAN_RATE_LIMIT_WINDOW_SECONDS,
  PLAN_ROUTE_DEFINITIONS,
  resolvePlanRoute,
} from '../src/plan/contracts';

describe(
  'PF-208 Plan gateway contract',
  () => {
    it(
      'uses an explicit version',
      () => {
        expect(
          PLAN_API_VERSION
        ).toBe(1);
      }
    );

    it(
      'defines the four approved Plan routes',
      () => {
        expect(
          Object.keys(
            PLAN_ROUTE_DEFINITIONS
          ).sort()
        ).toEqual([
          '/v1/plan/generate',
          '/v1/plan/revise',
          '/v1/plan/session',
          '/v1/plan/turn',
        ]);
      }
    );

    it(
      'requires POST for every Plan route',
      () => {
        Object.values(
          PLAN_ROUTE_DEFINITIONS
        ).forEach(
          (definition) => {
            expect(
              definition.method
            ).toBe('POST');
          }
        );
      }
    );

    it(
      'does not retain the legacy shared AI routes',
      () => {
        expect(
          resolvePlanRoute(
            '/ai/report'
          )
        ).toBeNull();

        expect(
          resolvePlanRoute(
            '/ai/chat'
          )
        ).toBeNull();
      }
    );

    it(
      'returns null for unknown paths',
      () => {
        expect(
          resolvePlanRoute(
            '/v1/plan/unknown'
          )
        ).toBeNull();
      }
    );

    it(
      'defines bounded request and provider policies',
      () => {
        expect(
          PLAN_MAX_BODY_BYTES
        ).toBe(65_536);

        expect(
          PLAN_PROVIDER_TIMEOUT_MS
        ).toBe(15_000);

        expect(
          PLAN_PROVIDER_MAX_RETRIES
        ).toBe(1);

        expect(
          PLAN_RATE_LIMIT_WINDOW_SECONDS
        ).toBe(60);
      }
    );

    it(
      'uses explicit auth and App Check headers',
      () => {
        expect(
          PLAN_AUTHORIZATION_HEADER
        ).toBe(
          'Authorization'
        );

        expect(
          PLAN_APP_CHECK_HEADER
        ).toBe(
          'X-Firebase-AppCheck'
        );
      }
    );

    it(
      'defines positive per-route limits',
      () => {
        Object.values(
          PLAN_ROUTE_DEFINITIONS
        ).forEach(
          (definition) => {
            expect(
              definition
                .requestsPerWindow
            ).toBeGreaterThan(0);
          }
        );
      }
    );
  }
);

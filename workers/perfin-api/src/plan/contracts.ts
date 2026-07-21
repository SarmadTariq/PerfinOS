export const PLAN_API_VERSION =
  1 as const;

export const PLAN_JSON_CONTENT_TYPE =
  'application/json';

export const PLAN_AUTHORIZATION_HEADER =
  'Authorization';

export const PLAN_APP_CHECK_HEADER =
  'X-Firebase-AppCheck';

export const PLAN_MAX_BODY_BYTES =
  64 * 1024;

export const PLAN_PROVIDER_TIMEOUT_MS =
  15_000;

export const PLAN_PROVIDER_MAX_RETRIES =
  1;

export const PLAN_RATE_LIMIT_WINDOW_SECONDS =
  60;

export const PLAN_ROUTE_DEFINITIONS = {
  '/v1/plan/session': {
    action: 'session',
    method: 'POST',
    requestsPerWindow: 10,
  },
  '/v1/plan/turn': {
    action: 'turn',
    method: 'POST',
    requestsPerWindow: 30,
  },
  '/v1/plan/generate': {
    action: 'generate',
    method: 'POST',
    requestsPerWindow: 6,
  },
  '/v1/plan/revise': {
    action: 'revise',
    method: 'POST',
    requestsPerWindow: 6,
  },
} as const;

export type PlanRoutePath =
  keyof typeof PLAN_ROUTE_DEFINITIONS;

export type PlanGatewayAction =
  (
    typeof PLAN_ROUTE_DEFINITIONS
  )[PlanRoutePath]['action'];

export interface PlanRouteDefinition {
  readonly action:
    PlanGatewayAction;
  readonly method: 'POST';
  readonly requestsPerWindow:
    number;
}

export const resolvePlanRoute = (
  pathname: string
): PlanRouteDefinition | null => {
  if (
    !Object.prototype.hasOwnProperty.call(
      PLAN_ROUTE_DEFINITIONS,
      pathname
    )
  ) {
    return null;
  }

  return PLAN_ROUTE_DEFINITIONS[
    pathname as PlanRoutePath
  ];
};

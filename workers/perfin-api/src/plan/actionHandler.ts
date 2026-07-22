import type {
  Env,
} from '../env';

import type {
  PlanRequestContext,
} from './gateway';

import {
  PlanProviderError,
  type PlanProvider,
} from './provider';

import {
  PlanOutputValidationError,
  validatePlanProviderResult,
} from './outputValidation';

import {
  assertPlanProviderRequestSafe,
  PlanRequestSafetyError,
} from './requestSafety';

export interface PlanActionHandlerOptions {
  readonly provider:
    PlanProvider;

  readonly sessionIdFactory?:
    () => string;
}

const jsonResponse = (
  body: unknown,
  status: number
) =>
  new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type':
          'application/json; charset=utf-8',
        'Cache-Control':
          'no-store',
      },
    }
  );

const providerStatusFor = (
  error:
    PlanProviderError
) => {
  if (
    error.code ===
    'PROVIDER_TIMEOUT'
  ) {
    return {
      status: 504,
      code:
        'PROVIDER_TIMEOUT',
    };
  }

  if (
    error.code ===
      'PROVIDER_CONFIGURATION' ||
    error.code ===
      'PROVIDER_CIRCUIT_OPEN' ||
    error.code ===
      'PROVIDER_UNAVAILABLE'
  ) {
    return {
      status: 503,
      code:
        'PLAN_SERVICE_UNAVAILABLE',
    };
  }

  return {
    status: 502,
    code:
      'PROVIDER_FAILURE',
  };
};

export const createPlanActionHandler =
  (
    options:
      PlanActionHandlerOptions
  ) =>
  async (
    context:
      PlanRequestContext,
    env: Env
  ): Promise<Response> => {
    if (
      context.action ===
      'session'
    ) {
      const sessionId =
        (
          options
            .sessionIdFactory ??
          (() =>
            crypto.randomUUID())
        )();

      return jsonResponse(
        {
          schemaVersion: 1,
          sessionId,
          baselineRevision:
            context.body
              .evidence
              .baselineRevision,
        },
        201
      );
    }

    if (
      !(
        'sessionId' in
        context.body
      )
    ) {
      return jsonResponse(
        {
          error: {
            code:
              'INVALID_REQUEST',
            message:
              'Request body is invalid.',
          },
        },
        400
      );
    }

    try {
      const providerRequest = {
        action:
          context.action,

        request:
          context.body,
      } as const;

      assertPlanProviderRequestSafe(
        providerRequest
      );

      const result =
        await options
          .provider
          .generate(
            providerRequest,
            env
          );

      const validated =
        validatePlanProviderResult({
          action:
            context.action,

          request:
            context.body,

          result,
        });

      return jsonResponse(
        {
          schemaVersion: 1,

          action:
            context.action,

          sessionId:
            context.body
              .sessionId,

          baselineRevision:
            context.body
              .evidence
              .baselineRevision,

          result:
            validated.output,

          generation:
            validated.metadata,

          validationState:
            validated
              .validationState,
        },
        200
      );
    } catch (error) {
      if (
        error instanceof
        PlanRequestSafetyError
      ) {
        return jsonResponse(
          {
            error: {
              code:
                'REQUEST_UNSUPPORTED',

              message:
                'This planning request is not supported.',
            },
          },
          400
        );
      }

      if (
        error instanceof
        PlanOutputValidationError
      ) {
        return jsonResponse(
          {
            error: {
              code:
                'PROVIDER_RESPONSE_INVALID',

              message:
                'Plan guidance could not be validated.',
            },
          },
          502
        );
      }

      if (
        error instanceof
        PlanProviderError
      ) {
        const clientError =
          providerStatusFor(
            error
          );

        return jsonResponse(
          {
            error: {
              code:
                clientError.code,

              message:
                'Plan guidance could not be generated.',
            },
          },
          clientError.status
        );
      }

      return jsonResponse(
        {
          error: {
            code:
              'PLAN_SERVICE_UNAVAILABLE',

            message:
              'Plan guidance could not be generated.',
          },
        },
        503
      );
    }
  };

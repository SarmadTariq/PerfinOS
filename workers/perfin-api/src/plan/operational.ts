import type {
  PlanGatewayAction,
} from './contracts';

export type PlanOperationalOutcome =
  | 'accepted'
  | 'rejected'
  | 'failed';

export interface PlanOperationalEvent {
  readonly eventVersion: 1;

  readonly eventName:
    'plan_gateway_request';

  readonly requestId:
    string;

  readonly action:
    PlanGatewayAction;

  readonly outcome:
    PlanOperationalOutcome;

  readonly status:
    number;

  readonly durationMs:
    number;

  readonly bodyBytes:
    number;

  readonly errorCode?:
    string;
}

export interface PlanOperationalEventInput {
  readonly requestId:
    string;

  readonly action:
    PlanGatewayAction;

  readonly outcome:
    PlanOperationalOutcome;

  readonly status:
    number;

  readonly durationMs:
    number;

  readonly bodyBytes:
    number;

  readonly errorCode?:
    string;
}

const nonNegativeInteger = (
  value: number,
  name: string
) => {
  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${name} must be a non-negative integer`
    );
  }

  return value;
};

export const createPlanOperationalEvent =
  (
    input:
      PlanOperationalEventInput
  ): PlanOperationalEvent => {
    const requestId =
      input.requestId.trim();

    if (
      !/^[A-Za-z0-9._:-]{1,80}$/.test(
        requestId
      )
    ) {
      throw new Error(
        'requestId has an invalid format'
      );
    }

    const errorCode =
      input.errorCode
        ?.trim();

    if (
      errorCode &&
      !/^[A-Z0-9_]{1,64}$/.test(
        errorCode
      )
    ) {
      throw new Error(
        'errorCode has an invalid format'
      );
    }

    return {
      eventVersion: 1,
      eventName:
        'plan_gateway_request',
      requestId,
      action:
        input.action,
      outcome:
        input.outcome,
      status:
        nonNegativeInteger(
          input.status,
          'status'
        ),
      durationMs:
        nonNegativeInteger(
          input.durationMs,
          'durationMs'
        ),
      bodyBytes:
        nonNegativeInteger(
          input.bodyBytes,
          'bodyBytes'
        ),
      ...(errorCode
        ? {
            errorCode,
          }
        : {}),
    };
  };

export const serializePlanOperationalEvent =
  (
    event:
      PlanOperationalEvent
  ): string =>
    JSON.stringify(event);

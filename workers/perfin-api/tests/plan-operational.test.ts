import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  createPlanOperationalEvent,
  serializePlanOperationalEvent,
} from '../src/plan/operational';

describe(
  'PF-208 operational metadata',
  () => {
    it(
      'contains only approved metadata',
      () => {
        const event =
          createPlanOperationalEvent({
            requestId:
              'request-123',
            action:
              'generate',
            outcome:
              'accepted',
            status: 200,
            durationMs: 42,
            bodyBytes: 1_024,
          });

        expect(event)
          .toEqual({
            eventVersion: 1,
            eventName:
              'plan_gateway_request',
            requestId:
              'request-123',
            action:
              'generate',
            outcome:
              'accepted',
            status: 200,
            durationMs: 42,
            bodyBytes: 1_024,
          });
      }
    );

    it(
      'does not serialize user or financial payload fields',
      () => {
        const serialized =
          serializePlanOperationalEvent(
            createPlanOperationalEvent({
              requestId:
                'request-123',
              action:
                'turn',
              outcome:
                'rejected',
              status: 400,
              durationMs: 10,
              bodyBytes: 500,
              errorCode:
                'INVALID_REQUEST',
            })
          );

        [
          'message',
          'instruction',
          'evidence',
          'uid',
          'appId',
          'token',
          'merchant',
          'amountMinor',
          'prompt',
          'response',
        ].forEach(
          (field) => {
            expect(
              serialized
            ).not.toContain(
              `"${field}"`
            );
          }
        );
      }
    );
  }
);

import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  mapPlanGenerationFailure,
  planClientAvailabilityCopy,
} from '../../src/planning/planGenerationPresentation';

import {
  PlanApiClientError,
} from '../../src/services/plan';

describe(
  'PF-210 generation presentation',
  () => {
    it(
      'maps rate limits into a recoverable status',
      () => {
        expect(
          mapPlanGenerationFailure(
            new PlanApiClientError(
              'rate_limited',
              429,
              60
            )
          )
        ).toMatchObject({
          status:
            'rate_limited',

          code:
            'RATE_LIMITED',
        });
      }
    );

    it(
      'maps invalid provider output into validation failure',
      () => {
        expect(
          mapPlanGenerationFailure(
            new PlanApiClientError(
              'invalid_response',
              200
            )
          )
        ).toMatchObject({
          status:
            'validation_failed',

          code:
            'INVALID_RESPONSE',
        });
      }
    );

    it(
      'maps missing App Check into fail-closed unavailability',
      () => {
        const result =
          mapPlanGenerationFailure(
            new PlanApiClientError(
              'app_verification_unavailable'
            )
          );

        expect(result)
          .toMatchObject({
            status:
              'unavailable',

            code:
              'APP_VERIFICATION_UNAVAILABLE',
          });

        expect(
          result.message
        ).toContain(
          'No Plan request was sent'
        );
      }
    );

    it(
      'maps network errors without losing completed input',
      () => {
        const result =
          mapPlanGenerationFailure(
            new PlanApiClientError(
              'network_error'
            )
          );

        expect(
          result.status
        ).toBe('error');

        expect(
          result.message
        ).toContain(
          'try again'
        );
      }
    );

    it(
      'reports build-time client availability',
      () => {
        expect(
          planClientAvailabilityCopy(
            false,
            'available'
          )
        ).toContain(
          'API URL'
        );

        expect(
          planClientAvailabilityCopy(
            true,
            'not_configured'
          )
        ).toContain(
          'App Check'
        );

        expect(
          planClientAvailabilityCopy(
            true,
            'unsupported_platform'
          )
        ).toContain(
          'native App Check'
        );

        expect(
          planClientAvailabilityCopy(
            true,
            'available'
          )
        ).toBeNull();
      }
    );
  }
);

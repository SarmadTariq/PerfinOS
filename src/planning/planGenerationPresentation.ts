import type {
  PlanCreationGenerationStatus,
} from './planCreationFlow';

import type {
  PlanAppCheckAvailability,
} from '../services/firebase/appCheck';

import {
  PlanApiClientError,
} from '../services/plan';

export interface PlanGenerationFailure {
  readonly status:
    Exclude<
      PlanCreationGenerationStatus,
      | 'idle'
      | 'loading'
      | 'success'
    >;

  readonly code:
    string;

  readonly message:
    string;
}

export const planClientAvailabilityCopy =
  (
    apiConfigured:
      boolean,

    appCheckAvailability:
      PlanAppCheckAvailability
  ): string | null => {
    if (!apiConfigured) {
      return 'The secure Plan API URL is not configured for this build.';
    }

    if (
      appCheckAvailability ===
      'not_configured'
    ) {
      return 'Web App Check is not configured for this build.';
    }

    if (
      appCheckAvailability ===
      'unsupported_platform'
    ) {
      return 'Secure Plan generation is unavailable on this platform until native App Check is configured.';
    }

    return null;
  };

export const mapPlanGenerationFailure =
  (
    error: unknown
  ): PlanGenerationFailure => {
    if (
      !(
        error instanceof
        PlanApiClientError
      )
    ) {
      return {
        status:
          'error',

        code:
          'UNKNOWN_ERROR',

        message:
          'The Plan draft could not be generated. Your completed inputs remain available.',
      };
    }

    switch (error.code) {
      case 'rate_limited': {
        const retryText =
          error.retryAfterSeconds !==
            null
            ? ` Try again in about ${Math.max(
                1,
                Math.ceil(
                  error.retryAfterSeconds
                )
              )} seconds.`
            : '';

        return {
          status:
            'rate_limited',

          code:
            'RATE_LIMITED',

          message:
            `The secure Plan service is busy.${retryText} Your completed inputs remain available.`,
        };
      }

      case 'validation_failed':
      case 'invalid_response':
        return {
          status:
            'validation_failed',

          code:
            error.code ===
              'invalid_response'
              ? 'INVALID_RESPONSE'
              : 'VALIDATION_FAILED',

          message:
            'The generated response did not pass Plan validation. Nothing was saved or applied.',
        };

      case 'unsupported_request':
      case 'invalid_request':
      case 'context_too_large':
        return {
          status:
            'validation_failed',

          code:
            error.code
              .toUpperCase(),

          message:
            'The planning request could not be accepted safely. Review the goal, constraints, and coach context.',
        };

      case 'configuration_missing':
        return {
          status:
            'unavailable',

          code:
            'CONFIGURATION_MISSING',

          message:
            'Secure Plan generation is not configured for this build.',
        };

      case 'app_verification_unavailable':
      case 'app_verification_failed':
        return {
          status:
            'unavailable',

          code:
            'APP_VERIFICATION_UNAVAILABLE',

          message:
            'This app build could not complete App Check verification. No Plan request was sent.',
        };

      case 'service_unavailable':
        return {
          status:
            'unavailable',

          code:
            'PLAN_SERVICE_UNAVAILABLE',

          message:
            'Plan generation is temporarily unavailable. Your completed inputs remain available.',
        };

      case 'auth_required':
        return {
          status:
            'error',

          code:
            'AUTH_REQUIRED',

          message:
            'Your authenticated session is unavailable. Sign in again before generating a Plan.',
        };

      case 'network_error':
        return {
          status:
            'error',

          code:
            'NETWORK_ERROR',

          message:
            'The secure Plan service could not be reached. Check the connection and try again.',
        };

      case 'request_failed':
        return {
          status:
            'error',

          code:
            'REQUEST_FAILED',

          message:
            'The Plan request could not be completed. Your inputs remain available.',
        };
    }
  };

import type {
  PlanEvidenceSnapshot,
} from '../../planning/planEvidence.types';

import {
  getRemoteAppCheckToken,
  getRemoteIdToken,
} from '../firebaseService';

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PLAN_CONTEXT_MESSAGE_LIMIT =
  2_000;

const DEFAULT_TIMEOUT_MS =
  40_000;

type JsonRecord =
  Record<string, unknown>;

export type PlanApiClientErrorCode =
  | 'configuration_missing'
  | 'auth_required'
  | 'app_verification_unavailable'
  | 'app_verification_failed'
  | 'rate_limited'
  | 'unsupported_request'
  | 'validation_failed'
  | 'invalid_request'
  | 'service_unavailable'
  | 'network_error'
  | 'invalid_response'
  | 'context_too_large'
  | 'request_failed';

export class PlanApiClientError
  extends Error {
  constructor(
    readonly code:
      PlanApiClientErrorCode,

    readonly status:
      number | null = null,

    readonly retryAfterSeconds:
      number | null = null
  ) {
    super(code);
  }
}

export interface PlanDraftContext {
  readonly primaryGoal:
    string;

  readonly constraints:
    readonly string[];

  readonly coachInput:
    string;
}

export interface PlanStructuredObservation {
  readonly id:
    string;

  readonly statement:
    string;

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredAllocation {
  readonly id:
    string;

  readonly label:
    string;

  readonly categoryId:
    string | null;

  readonly amountMinor:
    number;

  readonly period:
    'plan' | 'week' | 'month';

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredCommitment {
  readonly id:
    string;

  readonly title:
    string;

  readonly description:
    string;

  readonly amountMinor:
    number | null;

  readonly dueDate:
    string | null;

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredRecommendation {
  readonly id:
    string;

  readonly title:
    string;

  readonly description:
    string;

  readonly priority:
    'low' | 'medium' | 'high';

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredActionProposal {
  readonly id:
    string;

  readonly type:
    | 'budget_adjustment'
    | 'savings_contribution'
    | 'recurring_review';

  readonly title:
    string;

  readonly description:
    string;

  readonly targetEntityId:
    string | null;

  readonly proposedAmountMinor:
    number | null;

  readonly effectiveDate:
    string | null;

  readonly requiresConfirmation:
    true;

  readonly executionState:
    'proposal_only';

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredWarning {
  readonly id:
    string;

  readonly code:
    string;

  readonly message:
    string;

  readonly evidenceRefs:
    readonly string[];
}

export interface PlanStructuredOutput {
  readonly schemaVersion:
    1;

  readonly action:
    'turn';

  readonly baselineRevision:
    string;

  readonly currency:
    string;

  readonly periodKind:
    | '7_days'
    | '14_days'
    | 'current_month'
    | 'calendar_month';

  readonly summary:
    string;

  readonly observations:
    readonly PlanStructuredObservation[];

  readonly allocations:
    readonly PlanStructuredAllocation[];

  readonly commitments:
    readonly PlanStructuredCommitment[];

  readonly recommendations:
    readonly PlanStructuredRecommendation[];

  readonly actionProposals:
    readonly PlanStructuredActionProposal[];

  readonly warnings:
    readonly PlanStructuredWarning[];
}

export interface PlanGenerationMetadata {
  readonly modelId:
    string;

  readonly promptVersion:
    string;

  readonly responseSchemaVersion:
    string;

  readonly outputSchemaVersion:
    1;

  readonly attemptCount:
    number;

  readonly generatedAt:
    string;
}

export interface PlanDraftResponse {
  readonly schemaVersion:
    1;

  readonly action:
    'turn';

  readonly sessionId:
    string;

  readonly baselineRevision:
    string;

  readonly result:
    PlanStructuredOutput;

  readonly generation:
    PlanGenerationMetadata;

  readonly validationState:
    'valid';
}

export interface PlanApiCredentialProvider {
  readonly getIdToken:
    () => Promise<string>;

  readonly getAppCheckToken:
    () => Promise<string>;
}

export interface PlanApiClientOptions {
  readonly baseUrl?:
    string;

  readonly fetcher?:
    typeof fetch;

  readonly credentials?:
    PlanApiCredentialProvider;

  readonly timeoutMs?:
    number;
}

export interface PlanApiClient {
  readonly createDraft: (
    evidence:
      PlanEvidenceSnapshot,

    context:
      PlanDraftContext
  ) => Promise<
    PlanDraftResponse
  >;
}

const recordFor = (
  value: unknown
): JsonRecord | null => {
  if (
    value === null ||
    typeof value !==
      'object' ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as JsonRecord;
};

const requiredString = (
  value: unknown
): string | null =>
  typeof value === 'string' &&
  value.trim()
    ? value
    : null;

const configuredBaseUrl =
  () =>
    process
      .env
      .EXPO_PUBLIC_PERFIN_API_BASE_URL
      ?.trim() ||
    '';

const resolveBaseUrl = (
  candidate:
    string
): string => {
  if (!candidate) {
    throw new PlanApiClientError(
      'configuration_missing'
    );
  }

  let url: URL;

  try {
    url =
      new URL(candidate);
  } catch {
    throw new PlanApiClientError(
      'configuration_missing'
    );
  }

  const localHost =
    url.hostname ===
      'localhost' ||
    url.hostname ===
      '127.0.0.1';

  if (
    url.protocol !==
      'https:' &&
    !(
      url.protocol ===
        'http:' &&
      localHost
    )
  ) {
    throw new PlanApiClientError(
      'configuration_missing'
    );
  }

  return url
    .toString()
    .replace(
      /\/+$/,
      ''
    );
};

const normalizeContextText = (
  value: string,
  maximumLength: number,
  minimumLength = 0
): string => {
  const normalized =
    value
      .normalize('NFKC')
      .trim();

  if (
    normalized.length <
      minimumLength ||
    normalized.length >
      maximumLength
  ) {
    throw new PlanApiClientError(
      'invalid_request'
    );
  }

  return normalized;
};

export const createPlanContextMessage =
  (
    context:
      PlanDraftContext
  ): string => {
    if (
      context.constraints.length >
      5
    ) {
      throw new PlanApiClientError(
        'invalid_request'
      );
    }

    const payload = {
      contextVersion:
        1 as const,

      primaryGoal:
        normalizeContextText(
          context.primaryGoal,
          160,
          3
        ),

      constraints:
        context.constraints.map(
          (constraint) =>
            normalizeContextText(
              constraint,
              120,
              1
            )
        ),

      coachInput:
        normalizeContextText(
          context.coachInput,
          800
        ),
    };

    const message =
      JSON.stringify(payload);

    if (
      message.length >
      PLAN_CONTEXT_MESSAGE_LIMIT
    ) {
      throw new PlanApiClientError(
        'context_too_large'
      );
    }

    return message;
  };

const serverErrorCode = (
  payload: unknown
): string | null => {
  const root =
    recordFor(payload);

  const error =
    recordFor(
      root?.error
    );

  return requiredString(
    error?.code
  );
};

const clientErrorFor = (
  status: number,
  payload: unknown,
  retryAfterHeader:
    string | null
): PlanApiClientError => {
  const code =
    serverErrorCode(payload);

  const retryAfter =
    retryAfterHeader
      ? Number(
          retryAfterHeader
        )
      : null;

  if (
    status === 429 ||
    code === 'RATE_LIMITED'
  ) {
    return new PlanApiClientError(
      'rate_limited',
      status,
      Number.isFinite(
        retryAfter
      )
        ? retryAfter
        : null
    );
  }

  if (
    code ===
      'AUTH_REQUIRED' ||
    code ===
      'AUTH_INVALID'
  ) {
    return new PlanApiClientError(
      'auth_required',
      status
    );
  }

  if (
    code ===
      'APP_CHECK_REQUIRED' ||
    code ===
      'APP_CHECK_INVALID'
  ) {
    return new PlanApiClientError(
      'app_verification_failed',
      status
    );
  }

  if (
    code ===
      'REQUEST_UNSUPPORTED'
  ) {
    return new PlanApiClientError(
      'unsupported_request',
      status
    );
  }

  if (
    code ===
      'PROVIDER_RESPONSE_INVALID'
  ) {
    return new PlanApiClientError(
      'validation_failed',
      status
    );
  }

  if (
    code ===
      'INVALID_REQUEST' ||
    status === 400
  ) {
    return new PlanApiClientError(
      'invalid_request',
      status
    );
  }

  if (
    status === 503 ||
    status === 504 ||
    code ===
      'PLAN_SERVICE_UNAVAILABLE' ||
    code ===
      'SERVICE_UNAVAILABLE' ||
    code ===
      'RATE_LIMIT_UNAVAILABLE' ||
    code ===
      'PROVIDER_TIMEOUT'
  ) {
    return new PlanApiClientError(
      'service_unavailable',
      status
    );
  }

  return new PlanApiClientError(
    'request_failed',
    status
  );
};

const validateSessionResponse = (
  payload: unknown,
  baselineRevision:
    string
) => {
  const record =
    recordFor(payload);

  const sessionId =
    requiredString(
      record?.sessionId
    );

  if (
    record?.schemaVersion !== 1 ||
    !sessionId ||
    !SESSION_ID_PATTERN.test(
      sessionId
    ) ||
    record
      ?.baselineRevision !==
      baselineRevision
  ) {
    throw new PlanApiClientError(
      'invalid_response'
    );
  }

  return {
    schemaVersion:
      1 as const,

    sessionId,

    baselineRevision,
  };
};

const validateDraftResponse = (
  payload: unknown,
  sessionId:
    string,
  baselineRevision:
    string
): PlanDraftResponse => {
  const root =
    recordFor(payload);

  const result =
    recordFor(
      root?.result
    );

  const generation =
    recordFor(
      root?.generation
    );

  if (
    root?.schemaVersion !== 1 ||
    root.action !== 'turn' ||
    root.sessionId !==
      sessionId ||
    root.baselineRevision !==
      baselineRevision ||
    root.validationState !==
      'valid' ||
    result?.schemaVersion !== 1 ||
    result.action !== 'turn' ||
    result.baselineRevision !==
      baselineRevision ||
    !requiredString(
      result.summary
    ) ||
    !Array.isArray(
      result.observations
    ) ||
    !Array.isArray(
      result.allocations
    ) ||
    !Array.isArray(
      result.commitments
    ) ||
    !Array.isArray(
      result.recommendations
    ) ||
    !Array.isArray(
      result.actionProposals
    ) ||
    !Array.isArray(
      result.warnings
    ) ||
    !requiredString(
      generation?.modelId
    ) ||
    !requiredString(
      generation
        ?.promptVersion
    ) ||
    !requiredString(
      generation
        ?.responseSchemaVersion
    ) ||
    generation
      ?.outputSchemaVersion !==
      1 ||
    !Number.isSafeInteger(
      generation?.attemptCount
    ) ||
    !requiredString(
      generation?.generatedAt
    )
  ) {
    throw new PlanApiClientError(
      'invalid_response'
    );
  }

  return payload as
    PlanDraftResponse;
};

export const createPlanApiClient =
  (
    options:
      PlanApiClientOptions = {}
  ): PlanApiClient => {
    const baseUrl =
      resolveBaseUrl(
        options.baseUrl ??
        configuredBaseUrl()
      );

    const fetcher =
      options.fetcher ??
      fetch;

    const credentials =
      options.credentials ?? {
        getIdToken:
          () =>
            getRemoteIdToken(),

        getAppCheckToken:
          () =>
            getRemoteAppCheckToken(),
      };

    const timeoutMs =
      options.timeoutMs ??
      DEFAULT_TIMEOUT_MS;

    const post = async (
      path: string,
      body: unknown
    ): Promise<unknown> => {
      let idToken:
        string;

      try {
        idToken =
          await credentials
            .getIdToken();
      } catch (
        error
      ) {
        if (
          error instanceof
          PlanApiClientError
        ) {
          throw error;
        }

        throw new PlanApiClientError(
          'auth_required'
        );
      }

      let appCheckToken:
        string;

      try {
        appCheckToken =
          await credentials
            .getAppCheckToken();
      } catch (
        error
      ) {
        if (
          error instanceof
          PlanApiClientError
        ) {
          throw error;
        }

        throw new PlanApiClientError(
          'app_verification_unavailable'
        );
      }

      if (
        !idToken.trim()
      ) {
        throw new PlanApiClientError(
          'auth_required'
        );
      }

      if (
        !appCheckToken.trim()
      ) {
        throw new PlanApiClientError(
          'app_verification_unavailable'
        );
      }

      const controller =
        new AbortController();

      const timer =
        setTimeout(
          () =>
            controller.abort(),
          timeoutMs
        );

      let response:
        Response;

      try {
        response =
          await fetcher(
            `${baseUrl}${path}`,
            {
              method:
                'POST',

              headers: {
                Authorization:
                  `Bearer ${idToken}`,

                'Content-Type':
                  'application/json',

                'X-Firebase-AppCheck':
                  appCheckToken,
              },

              body:
                JSON.stringify(
                  body
                ),

              signal:
                controller.signal,
            }
          );
      } catch {
        throw new PlanApiClientError(
          'network_error'
        );
      } finally {
        clearTimeout(timer);
      }

      let payload:
        unknown;

      try {
        payload =
          await response.json();
      } catch {
        throw new PlanApiClientError(
          'invalid_response',
          response.status
        );
      }

      if (!response.ok) {
        throw clientErrorFor(
          response.status,
          payload,
          response.headers.get(
            'Retry-After'
          )
        );
      }

      return payload;
    };

    return {
      createDraft:
        async (
          evidence,
          context
        ) => {
          const sessionPayload =
            await post(
              '/v1/plan/session',
              {
                schemaVersion:
                  1,

                evidence,
              }
            );

          const session =
            validateSessionResponse(
              sessionPayload,
              evidence
                .baselineRevision
            );

          const draftPayload =
            await post(
              '/v1/plan/turn',
              {
                schemaVersion:
                  1,

                sessionId:
                  session
                    .sessionId,

                baselineRevision:
                  evidence
                    .baselineRevision,

                message:
                  createPlanContextMessage(
                    context
                  ),

                evidence,
              }
            );

          return validateDraftResponse(
            draftPayload,
            session.sessionId,
            evidence
              .baselineRevision
          );
        },
    };
  };

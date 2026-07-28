import type {
  Env,
} from '../env';

import {
  PLAN_PROVIDER_MAX_RETRIES,
  PLAN_PROVIDER_TIMEOUT_MS,
  type PlanGatewayAction,
} from './contracts';

import type {
  PlanActionRequest,
} from './validation';

import {
  PLAN_OUTPUT_SCHEMA_VERSION,
  PLAN_PROMPT_VERSION,
  PLAN_RESPONSE_SCHEMA_VERSION,
  type PlanGenerationMetadata,
} from './outputContracts';

import {
  createPlanProviderBody,
} from './prompt';

export type PlanProviderAction =
  Exclude<
    PlanGatewayAction,
    'session'
  >;

export type PlanProviderErrorCode =
  | 'PROVIDER_CONFIGURATION'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_REJECTED'
  | 'PROVIDER_RESPONSE_INVALID'
  | 'PROVIDER_CIRCUIT_OPEN';

export class PlanProviderError
  extends Error {
  constructor(
    readonly code:
      PlanProviderErrorCode,
    readonly retryable:
      boolean
  ) {
    super(code);
  }
}

export interface PlanProviderRequest {
  readonly action:
    PlanProviderAction;

  readonly request:
    PlanActionRequest;
}

export interface PlanProviderResult {
  readonly text: string;

  readonly candidate:
    unknown;

  readonly attemptCount:
    number;

  readonly metadata:
    PlanGenerationMetadata;
}

export interface PlanProvider {
  readonly generate: (
    input:
      PlanProviderRequest,
    env: Env
  ) => Promise<
    PlanProviderResult
  >;
}

export interface PlanCircuitBreaker {
  readonly beforeRequest:
    () => void;

  readonly recordSuccess:
    () => void;

  readonly recordFailure:
    () => void;
}

export interface PlanProviderFetch {
  (
    input:
      RequestInfo | URL,
    init?:
      RequestInit
  ): Promise<Response>;
}

export interface PlanProviderOptions {
  readonly fetcher?:
    PlanProviderFetch;

  readonly timeoutMs?:
    number;

  readonly maxRetries?:
    number;

  readonly sleep?: (
    milliseconds: number
  ) => Promise<void>;

  readonly circuitBreaker?:
    PlanCircuitBreaker;

  readonly now?:
    () => Date;
}

export interface PlanCircuitBreakerOptions {
  readonly failureThreshold?:
    number;

  readonly openDurationMs?:
    number;

  readonly now?:
    () => number;
}

const PROVIDER_FAILURE_THRESHOLD =
  3;

const PROVIDER_CIRCUIT_OPEN_MS =
  30_000;

const MAX_PROVIDER_TEXT_LENGTH =
  12_000;

const RETRYABLE_STATUS_CODES =
  new Set([
    408,
    429,
    500,
    502,
    503,
    504,
  ]);

const requireConfiguredValue = (
  value: string | undefined,
  name: string
): string => {
  const normalized =
    value?.trim();

  if (!normalized) {
    throw new PlanProviderError(
      'PROVIDER_CONFIGURATION',
      false
    );
  }

  if (
    normalized.length >
    512
  ) {
    throw new PlanProviderError(
      'PROVIDER_CONFIGURATION',
      false
    );
  }

  return normalized;
};

const validateModelName = (
  value: string | undefined
): string => {
  const model =
    requireConfiguredValue(
      value,
      'PLAN_PROVIDER_MODEL'
    );

  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{1,100}$/.test(
      model
    )
  ) {
    throw new PlanProviderError(
      'PROVIDER_CONFIGURATION',
      false
    );
  }

  return model;
};

const validateApiBase = (
  value: string | undefined
): string => {
  const candidate =
    requireConfiguredValue(
      value,
      'PLAN_PROVIDER_API_BASE'
    ).replace(
      /\/+$/,
      ''
    );

  let url: URL;

  try {
    url =
      new URL(candidate);
  } catch {
    throw new PlanProviderError(
      'PROVIDER_CONFIGURATION',
      false
    );
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new PlanProviderError(
      'PROVIDER_CONFIGURATION',
      false
    );
  }

  return url.toString()
    .replace(
      /\/$/,
      ''
    );
};

const sleepFor = (
  milliseconds: number
) =>
  new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );

const retryDelayForAttempt = (
  attempt: number
) =>
  Math.min(
    250 * 2 ** attempt,
    1_000
  );

const isAbortError = (
  error: unknown
) =>
  error instanceof DOMException &&
  error.name ===
    'AbortError';

const providerErrorForStatus = (
  status: number
): PlanProviderError => {
  if (
    RETRYABLE_STATUS_CODES.has(
      status
    )
  ) {
    return new PlanProviderError(
      'PROVIDER_UNAVAILABLE',
      true
    );
  }

  return new PlanProviderError(
    'PROVIDER_REJECTED',
    false
  );
};

const extractProviderText = (
  payload: unknown
): string => {
  if (
    payload === null ||
    typeof payload !==
      'object'
  ) {
    throw new PlanProviderError(
      'PROVIDER_RESPONSE_INVALID',
      false
    );
  }

  const candidates =
    (
      payload as {
        candidates?: unknown;
      }
    ).candidates;

  if (
    !Array.isArray(
      candidates
    ) ||
    candidates.length === 0
  ) {
    throw new PlanProviderError(
      'PROVIDER_RESPONSE_INVALID',
      false
    );
  }

  const first =
    candidates[0];

  if (
    first === null ||
    typeof first !==
      'object'
  ) {
    throw new PlanProviderError(
      'PROVIDER_RESPONSE_INVALID',
      false
    );
  }

  const content =
    (
      first as {
        content?: unknown;
      }
    ).content;

  if (
    content === null ||
    typeof content !==
      'object'
  ) {
    throw new PlanProviderError(
      'PROVIDER_RESPONSE_INVALID',
      false
    );
  }

  const parts =
    (
      content as {
        parts?: unknown;
      }
    ).parts;

  if (
    !Array.isArray(parts)
  ) {
    throw new PlanProviderError(
      'PROVIDER_RESPONSE_INVALID',
      false
    );
  }

  const text =
    parts
      .map((part) => {
        if (
          part === null ||
          typeof part !==
            'object'
        ) {
          return '';
        }

        const candidate =
          (
            part as {
              text?: unknown;
            }
          ).text;

        return typeof candidate ===
          'string'
          ? candidate
          : '';
      })
      .join('')
      .trim();

  if (
    text.length === 0 ||
    text.length >
      MAX_PROVIDER_TEXT_LENGTH
  ) {
    throw new PlanProviderError(
      'PROVIDER_RESPONSE_INVALID',
      false
    );
  }

  return text;
};

const parseProviderCandidate = (
  text: string
): Record<
  string,
  unknown
> => {
  let candidate:
    unknown;

  try {
    candidate =
      JSON.parse(text);
  } catch {
    throw new PlanProviderError(
      'PROVIDER_RESPONSE_INVALID',
      false
    );
  }

  if (
    candidate === null ||
    typeof candidate !==
      'object' ||
    Array.isArray(candidate)
  ) {
    throw new PlanProviderError(
      'PROVIDER_RESPONSE_INVALID',
      false
    );
  }

  return candidate as Record<
    string,
    unknown
  >;
};


export const createInMemoryPlanCircuitBreaker =
  (
    options:
      PlanCircuitBreakerOptions = {}
  ): PlanCircuitBreaker => {
    const failureThreshold =
      options.failureThreshold ??
      PROVIDER_FAILURE_THRESHOLD;

    const openDurationMs =
      options.openDurationMs ??
      PROVIDER_CIRCUIT_OPEN_MS;

    const now =
      options.now ??
      (() => Date.now());

    if (
      !Number.isSafeInteger(
        failureThreshold
      ) ||
      failureThreshold < 1
    ) {
      throw new Error(
        'Circuit failure threshold is invalid'
      );
    }

    if (
      !Number.isSafeInteger(
        openDurationMs
      ) ||
      openDurationMs < 1
    ) {
      throw new Error(
        'Circuit duration is invalid'
      );
    }

    let consecutiveFailures =
      0;

    let openUntil = 0;

    let probeInFlight =
      false;

    return {
      beforeRequest: () => {
        const currentTime =
          now();

        if (
          openUntil >
          currentTime
        ) {
          throw new PlanProviderError(
            'PROVIDER_CIRCUIT_OPEN',
            false
          );
        }

        if (
          openUntil > 0 &&
          currentTime >=
            openUntil
        ) {
          if (probeInFlight) {
            throw new PlanProviderError(
              'PROVIDER_CIRCUIT_OPEN',
              false
            );
          }

          probeInFlight =
            true;
        }
      },

      recordSuccess: () => {
        consecutiveFailures =
          0;

        openUntil = 0;

        probeInFlight =
          false;
      },

      recordFailure: () => {
        probeInFlight =
          false;

        consecutiveFailures +=
          1;

        if (
          consecutiveFailures >=
          failureThreshold
        ) {
          openUntil =
            now() +
            openDurationMs;
        }
      },
    };
  };

export const createPlanProvider =
  (
    options:
      PlanProviderOptions = {}
  ): PlanProvider => {
    const fetcher =
      options.fetcher ??
      fetch;

    const timeoutMs =
      options.timeoutMs ??
      PLAN_PROVIDER_TIMEOUT_MS;

    const maxRetries =
      options.maxRetries ??
      PLAN_PROVIDER_MAX_RETRIES;

    const sleep =
      options.sleep ??
      sleepFor;

    const circuitBreaker =
      options.circuitBreaker ??
      createInMemoryPlanCircuitBreaker();

    const now =
      options.now ??
      (() => new Date());

    if (
      !Number.isSafeInteger(
        timeoutMs
      ) ||
      timeoutMs < 1 ||
      timeoutMs > 60_000
    ) {
      throw new Error(
        'Provider timeout is invalid'
      );
    }

    if (
      !Number.isSafeInteger(
        maxRetries
      ) ||
      maxRetries < 0 ||
      maxRetries > 2
    ) {
      throw new Error(
        'Provider retry count is invalid'
      );
    }

    return {
      generate:
        async (
          input,
          env
        ) => {
          const apiKey =
            requireConfiguredValue(
              env.PLAN_PROVIDER_API_KEY,
              'PLAN_PROVIDER_API_KEY'
            );

          const model =
            validateModelName(
              env.PLAN_PROVIDER_MODEL
            );

          const apiBase =
            validateApiBase(
              env.PLAN_PROVIDER_API_BASE
            );

          const endpoint =
            `${apiBase}/models/${
              encodeURIComponent(
                model
              )
            }:generateContent`;

          circuitBreaker
            .beforeRequest();

          let finalError:
            PlanProviderError |
            null = null;

          const maximumAttempts =
            maxRetries + 1;

          for (
            let attempt = 0;
            attempt <
              maximumAttempts;
            attempt += 1
          ) {
            const controller =
              new AbortController();

            const timeout =
              setTimeout(
                () => {
                  controller.abort();
                },
                timeoutMs
              );

            try {
              const response =
                await fetcher(
                  endpoint,
                  {
                    method:
                      'POST',

                    headers: {
                      'Content-Type':
                        'application/json',

                      'x-goog-api-key':
                        apiKey,
                    },

                    body:
                      JSON.stringify(
                        createPlanProviderBody(
                          input
                        )
                      ),

                    signal:
                      controller.signal,
                  }
                );

              if (!response.ok) {
                throw providerErrorForStatus(
                  response.status
                );
              }

              const payload =
                await response.json();

              const text =
                extractProviderText(
                  payload
                );

              const candidate =
                parseProviderCandidate(
                  text
                );

              const generatedAt =
                now();

              if (
                !(
                  generatedAt instanceof
                  Date
                ) ||
                Number.isNaN(
                  generatedAt.getTime()
                )
              ) {
                throw new PlanProviderError(
                  'PROVIDER_CONFIGURATION',
                  false
                );
              }

              circuitBreaker
                .recordSuccess();

              return {
                text,
                candidate,

                attemptCount:
                  attempt + 1,

                metadata: {
                  modelId:
                    model,

                  promptVersion:
                    PLAN_PROMPT_VERSION,

                  responseSchemaVersion:
                    PLAN_RESPONSE_SCHEMA_VERSION,

                  outputSchemaVersion:
                    PLAN_OUTPUT_SCHEMA_VERSION,

                  attemptCount:
                    attempt + 1,

                  generatedAt:
                    generatedAt
                      .toISOString(),
                },
              };
            } catch (error) {
              const providerError =
                error instanceof
                  PlanProviderError
                  ? error
                  : isAbortError(
                        error
                      )
                    ? new PlanProviderError(
                        'PROVIDER_TIMEOUT',
                        true
                      )
                    : new PlanProviderError(
                        'PROVIDER_UNAVAILABLE',
                        true
                      );

              finalError =
                providerError;

              const hasRetry =
                providerError
                  .retryable &&
                attempt + 1 <
                  maximumAttempts;

              if (!hasRetry) {
                if (
                  providerError
                    .retryable
                ) {
                  circuitBreaker
                    .recordFailure();
                }

                throw providerError;
              }

              await sleep(
                retryDelayForAttempt(
                  attempt
                )
              );
            } finally {
              clearTimeout(
                timeout
              );
            }
          }

          circuitBreaker
            .recordFailure();

          throw (
            finalError ??
            new PlanProviderError(
              'PROVIDER_UNAVAILABLE',
              true
            )
          );
        },
    };
  };

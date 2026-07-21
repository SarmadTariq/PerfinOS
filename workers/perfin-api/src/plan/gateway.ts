import type {
  Env,
} from '../env';

import {
  FirebaseVerificationConfigurationError,
  type VerifiedFirebaseApp,
  type VerifiedFirebaseUser,
} from './firebaseVerification';

import {
  PLAN_APP_CHECK_HEADER,
  PLAN_AUTHORIZATION_HEADER,
  PLAN_JSON_CONTENT_TYPE,
  PLAN_MAX_BODY_BYTES,
  resolvePlanRoute,
  type PlanGatewayAction,
} from './contracts';

import {
  createPlanOperationalEvent,
  type PlanOperationalEvent,
  type PlanOperationalOutcome,
} from './operational';

import {
  PlanRequestValidationError,
  validatePlanActionRequest,
  type PlanActionRequest,
} from './validation';

const REQUEST_ID_HEADER =
  'X-Request-Id';

const CORS_ALLOWED_HEADERS = [
  'Authorization',
  'Content-Type',
  'X-Firebase-AppCheck',
  'X-Request-Id',
].join(', ');

export interface PlanRequestContext {
  readonly action:
    PlanGatewayAction;
  readonly uid: string;
  readonly appId: string;
  readonly requestId: string;
  readonly body:
    PlanActionRequest;

  readonly bodyBytes:
    number;
}

export interface PlanGatewayDependencies {
  readonly verifyIdToken: (
    token: string,
    env: Env
  ) => Promise<
    VerifiedFirebaseUser
  >;

  readonly verifyAppCheckToken: (
    token: string,
    env: Env
  ) => Promise<
    VerifiedFirebaseApp
  >;

  readonly invokeAction: (
    context: PlanRequestContext,
    env: Env
  ) => Promise<Response>;

  readonly recordOperationalEvent?: (
    event:
      PlanOperationalEvent
  ) => void;

  readonly now?: () => number;
}

class PlanHttpError
  extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const approvedOrigins = (
  env: Env
): Set<string> =>
  new Set(
    (
      env.ALLOWED_ORIGINS ??
      ''
    )
      .split(',')
      .map(
        (origin) =>
          origin.trim()
      )
      .filter(Boolean)
  );

const resolveAllowedOrigin = (
  request: Request,
  env: Env
): string | null => {
  const origin =
    request.headers.get(
      'Origin'
    );

  if (!origin) {
    return null;
  }

  if (
    !approvedOrigins(env).has(
      origin
    )
  ) {
    throw new PlanHttpError(
      403,
      'ORIGIN_NOT_ALLOWED',
      'Request origin is not allowed.'
    );
  }

  return origin;
};

const requestIdFor = (
  request: Request
): string => {
  const candidate =
    request.headers.get(
      REQUEST_ID_HEADER
    );

  if (
    candidate &&
    /^[A-Za-z0-9._:-]{1,80}$/.test(
      candidate
    )
  ) {
    return candidate;
  }

  return crypto.randomUUID();
};

const responseHeaders = (
  allowedOrigin: string | null,
  requestId: string
): Headers => {
  const headers =
    new Headers({
      'Cache-Control':
        'no-store',
      'Content-Type':
        'application/json; charset=utf-8',
      'Vary':
        'Origin',
      'X-Content-Type-Options':
        'nosniff',
      [REQUEST_ID_HEADER]:
        requestId,
    });

  if (allowedOrigin) {
    headers.set(
      'Access-Control-Allow-Origin',
      allowedOrigin
    );
  }

  return headers;
};

const jsonResponse = (
  body: unknown,
  status: number,
  allowedOrigin: string | null,
  requestId: string
): Response =>
  new Response(
    JSON.stringify(body),
    {
      status,
      headers:
        responseHeaders(
          allowedOrigin,
          requestId
        ),
    }
  );

const errorResponse = (
  error: PlanHttpError,
  allowedOrigin: string | null,
  requestId: string
): Response =>
  jsonResponse(
    {
      error: {
        code: error.code,
        message:
          error.message,
      },
    },
    error.status,
    allowedOrigin,
    requestId
  );

const preflightResponse = (
  allowedOrigin: string,
  requestId: string
): Response => {
  const headers =
    responseHeaders(
      allowedOrigin,
      requestId
    );

  headers.delete(
    'Content-Type'
  );

  headers.set(
    'Access-Control-Allow-Headers',
    CORS_ALLOWED_HEADERS
  );

  headers.set(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS'
  );

  headers.set(
    'Access-Control-Max-Age',
    '600'
  );

  return new Response(
    null,
    {
      status: 204,
      headers,
    }
  );
};

const decorateResponse = (
  response: Response,
  allowedOrigin: string | null,
  requestId: string
): Response => {
  const headers =
    new Headers(
      response.headers
    );

  responseHeaders(
    allowedOrigin,
    requestId
  ).forEach(
    (value, key) => {
      headers.set(
        key,
        value
      );
    }
  );

  return new Response(
    response.body,
    {
      status:
        response.status,
      statusText:
        response.statusText,
      headers,
    }
  );
};

const requireJsonContentType = (
  request: Request
) => {
  const contentType =
    request.headers
      .get('Content-Type')
      ?.split(';')[0]
      .trim()
      .toLowerCase();

  if (
    contentType !==
    PLAN_JSON_CONTENT_TYPE
  ) {
    throw new PlanHttpError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json.'
    );
  }
};

const assertContentLength = (
  request: Request
) => {
  const header =
    request.headers.get(
      'Content-Length'
    );

  if (!header) {
    return;
  }

  const length =
    Number(header);

  if (
    !Number.isSafeInteger(
      length
    ) ||
    length < 0
  ) {
    throw new PlanHttpError(
      400,
      'INVALID_CONTENT_LENGTH',
      'Content-Length is invalid.'
    );
  }

  if (
    length >
    PLAN_MAX_BODY_BYTES
  ) {
    throw new PlanHttpError(
      413,
      'BODY_TOO_LARGE',
      'Request body is too large.'
    );
  }
};

const readBoundedJson = async (
  request: Request
): Promise<{
  readonly body: unknown;
  readonly bodyBytes: number;
}> => {
  if (!request.body) {
    throw new PlanHttpError(
      400,
      'MALFORMED_BODY',
      'Request body must contain valid JSON.'
    );
  }

  const reader =
    request.body.getReader();

  const chunks:
    Uint8Array[] = [];

  let totalBytes = 0;

  while (true) {
    const {
      done,
      value,
    } = await reader.read();

    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    totalBytes +=
      value.byteLength;

    if (
      totalBytes >
      PLAN_MAX_BODY_BYTES
    ) {
      await reader.cancel();

      throw new PlanHttpError(
        413,
        'BODY_TOO_LARGE',
        'Request body is too large.'
      );
    }

    chunks.push(value);
  }

  const merged =
    new Uint8Array(
      totalBytes
    );

  let offset = 0;

  chunks.forEach(
    (chunk) => {
      merged.set(
        chunk,
        offset
      );

      offset +=
        chunk.byteLength;
    }
  );

  const text =
    new TextDecoder()
      .decode(merged);

  if (!text.trim()) {
    throw new PlanHttpError(
      400,
      'MALFORMED_BODY',
      'Request body must contain valid JSON.'
    );
  }

  try {
    return {
      body:
        JSON.parse(text),
      bodyBytes:
        totalBytes,
    };
  } catch {
    throw new PlanHttpError(
      400,
      'MALFORMED_BODY',
      'Request body must contain valid JSON.'
    );
  }
};

const bearerTokenFor = (
  request: Request
): string => {
  const value =
    request.headers.get(
      PLAN_AUTHORIZATION_HEADER
    );

  if (
    !value?.startsWith(
      'Bearer '
    )
  ) {
    throw new PlanHttpError(
      401,
      'AUTH_REQUIRED',
      'Authentication failed.'
    );
  }

  const token =
    value.slice(7).trim();

  if (!token) {
    throw new PlanHttpError(
      401,
      'AUTH_REQUIRED',
      'Authentication failed.'
    );
  }

  return token;
};

const appCheckTokenFor = (
  request: Request
): string => {
  const token =
    request.headers
      .get(
        PLAN_APP_CHECK_HEADER
      )
      ?.trim();

  if (!token) {
    throw new PlanHttpError(
      401,
      'APP_CHECK_REQUIRED',
      'App verification failed.'
    );
  }

  return token;
};

export const createPlanGateway = (
  dependencies:
    PlanGatewayDependencies
) =>
  async (
    request: Request,
    env: Env
  ): Promise<
    Response | null
  > => {
    const pathname =
      new URL(
        request.url
      ).pathname;

    const route =
      resolvePlanRoute(
        pathname
      );

    if (!route) {
      return null;
    }

    const now =
      dependencies.now ??
      (() => Date.now());

    const startedAt =
      now();

    let bodyBytes = 0;

    const requestId =
      requestIdFor(request);

    let allowedOrigin:
      string | null = null;

    const recordEvent = (
      outcome:
        PlanOperationalOutcome,
      status: number,
      errorCode?: string
    ) => {
      try {
        dependencies
          .recordOperationalEvent?.(
            createPlanOperationalEvent({
              requestId,
              action:
                route.action,
              outcome,
              status,
              durationMs:
                Math.max(
                  0,
                  Math.round(
                    now() -
                    startedAt
                  )
                ),
              bodyBytes,
              errorCode,
            })
          );
      } catch {
        return;
      }
    };

    try {
      allowedOrigin =
        resolveAllowedOrigin(
          request,
          env
        );

      if (
        request.method ===
        'OPTIONS'
      ) {
        if (!allowedOrigin) {
          throw new PlanHttpError(
            403,
            'ORIGIN_REQUIRED',
            'Request origin is not allowed.'
          );
        }

        const response =
          preflightResponse(
            allowedOrigin,
            requestId
          );

        recordEvent(
          'accepted',
          response.status
        );

        return response;
      }

      if (
        request.method !==
        route.method
      ) {
        throw new PlanHttpError(
          405,
          'METHOD_NOT_ALLOWED',
          'Method is not allowed.'
        );
      }

      requireJsonContentType(
        request
      );

      assertContentLength(
        request
      );

      const idToken =
        bearerTokenFor(
          request
        );

      let verifiedUser:
        VerifiedFirebaseUser;

      try {
        verifiedUser =
          await dependencies
            .verifyIdToken(
              idToken,
              env
            );
      } catch (error) {
        if (
          error instanceof
          FirebaseVerificationConfigurationError
        ) {
          throw error;
        }

        throw new PlanHttpError(
          401,
          'AUTH_INVALID',
          'Authentication failed.'
        );
      }

      const appCheckToken =
        appCheckTokenFor(
          request
        );

      let verifiedApp:
        VerifiedFirebaseApp;

      try {
        verifiedApp =
          await dependencies
            .verifyAppCheckToken(
              appCheckToken,
              env
            );
      } catch (error) {
        if (
          error instanceof
          FirebaseVerificationConfigurationError
        ) {
          throw error;
        }

        throw new PlanHttpError(
          401,
          'APP_CHECK_INVALID',
          'App verification failed.'
        );
      }

      const readResult =
        await readBoundedJson(
          request
        );

      bodyBytes =
        readResult.bodyBytes;

      let body:
        PlanActionRequest;

      try {
        body =
          validatePlanActionRequest(
            route.action,
            readResult.body
          );
      } catch (error) {
        if (
          error instanceof
          PlanRequestValidationError
        ) {
          throw new PlanHttpError(
            400,
            'INVALID_REQUEST',
            'Request body is invalid.'
          );
        }

        throw error;
      }

      const response =
        await dependencies
          .invokeAction(
            {
              action:
                route.action,
              uid:
                verifiedUser.uid,
              appId:
                verifiedApp.appId,
              requestId,
              body,
              bodyBytes,
            },
            env
          );

      const decorated =
        decorateResponse(
          response,
          allowedOrigin,
          requestId
        );

      recordEvent(
        response.status >= 500
          ? 'failed'
          : response.status >= 400
            ? 'rejected'
            : 'accepted',
        response.status
      );

      return decorated;
    } catch (error) {
      if (
        error instanceof
        PlanHttpError
      ) {
        const response =
          errorResponse(
            error,
            allowedOrigin,
            requestId
          );

        recordEvent(
          error.status >= 500
            ? 'failed'
            : 'rejected',
          error.status,
          error.code
        );

        return response;
      }

      if (
        error instanceof
        FirebaseVerificationConfigurationError
      ) {
        const serviceError =
          new PlanHttpError(
            503,
            'SERVICE_UNAVAILABLE',
            'Plan service is unavailable.'
          );

        const response =
          errorResponse(
            serviceError,
            allowedOrigin,
            requestId
          );

        recordEvent(
          'failed',
          response.status,
          serviceError.code
        );

        return response;
      }

      const internalError =
        new PlanHttpError(
          500,
          'INTERNAL_ERROR',
          'Unexpected worker error.'
        );

      const response =
        errorResponse(
          internalError,
          allowedOrigin,
          requestId
        );

      recordEvent(
        'failed',
        response.status,
        internalError.code
      );

      return response;
    }
  };

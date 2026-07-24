import type {
  Env,
} from '../env';
import type {
  VerifiedFirebaseApp,
  VerifiedFirebaseUser,
} from '../plan/firebaseVerification';

const MAX_RECEIPT_BYTES =
  5 * 1024 * 1024;
const ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
} as const;

type ReceiptMimeType =
  keyof typeof MIME_EXTENSIONS;
type ReceiptExtension =
  (typeof MIME_EXTENSIONS)[ReceiptMimeType];

export interface ReceiptGatewayDependencies {
  readonly verifyIdToken: (
    token: string,
    env: Env
  ) => Promise<VerifiedFirebaseUser>;
  readonly verifyAppCheckToken: (
    token: string,
    env: Env
  ) => Promise<VerifiedFirebaseApp>;
  readonly now?: () => Date;
}

interface ReceiptRoute {
  transactionId: string;
  receiptId: string;
}

class ReceiptHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const receiptRoute = (
  request: Request
): ReceiptRoute | null => {
  const parts = new URL(request.url)
    .pathname
    .split('/')
    .filter(Boolean);

  if (
    parts.length !== 3 ||
    parts[0] !== 'receipts'
  ) {
    return null;
  }

  const transactionId =
    decodeURIComponent(parts[1]);
  const receiptId =
    decodeURIComponent(parts[2]);

  if (
    !ID_PATTERN.test(transactionId) ||
    !ID_PATTERN.test(receiptId)
  ) {
    throw new ReceiptHttpError(
      400,
      'INVALID_RECEIPT_ID',
      'Transaction and receipt ids must use 1-80 letters, numbers, dots, underscores, or hyphens.'
    );
  }

  return {
    transactionId,
    receiptId,
  };
};

const allowedOrigin = (
  request: Request,
  env: Env
): string | null => {
  const origin =
    request.headers.get('Origin');

  if (!origin) return null;

  const approved = new Set(
    (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (!approved.has(origin)) {
    throw new ReceiptHttpError(
      403,
      'ORIGIN_NOT_ALLOWED',
      'Request origin is not allowed.'
    );
  }

  return origin;
};

const responseHeaders = (
  origin: string | null
): Headers => {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  });

  if (origin) {
    headers.set(
      'Access-Control-Allow-Origin',
      origin
    );
  }

  return headers;
};

const json = (
  body: unknown,
  status: number,
  origin: string | null
) => {
  const headers =
    responseHeaders(origin);
  headers.set(
    'Content-Type',
    'application/json'
  );

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers,
    }
  );
};

const bearerToken = (
  request: Request
): string => {
  const authorization =
    request.headers.get(
      'Authorization'
    );

  if (
    !authorization?.startsWith(
      'Bearer '
    ) ||
    !authorization.slice(7).trim()
  ) {
    throw new ReceiptHttpError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Authentication required.'
    );
  }

  return authorization
    .slice(7)
    .trim();
};

const appCheckToken = (
  request: Request
): string => {
  const token =
    request.headers
      .get('X-Firebase-AppCheck')
      ?.trim();

  if (!token) {
    throw new ReceiptHttpError(
      401,
      'APP_CHECK_REQUIRED',
      'Firebase App Check is required.'
    );
  }

  return token;
};

const extensionFromRequest = (
  request: Request
): ReceiptExtension => {
  const extension =
    new URL(request.url)
      .searchParams
      .get('extension')
      ?.trim()
      .toLowerCase();

  if (
    extension !== 'jpg' &&
    extension !== 'png' &&
    extension !== 'heic' &&
    extension !== 'heif'
  ) {
    throw new ReceiptHttpError(
      400,
      'INVALID_RECEIPT_EXTENSION',
      'A supported receipt extension is required.'
    );
  }

  return extension;
};

export const canonicalReceiptObjectKey = ({
  uid,
  transactionId,
  receiptId,
  extension,
}: ReceiptRoute & {
  uid: string;
  extension: ReceiptExtension;
}): string =>
  `receipts/${uid}/${transactionId}/${receiptId}.${extension}`;

export const createReceiptGateway = (
  dependencies: ReceiptGatewayDependencies
) =>
  async (
    request: Request,
    env: Env
  ): Promise<Response | null> => {
    let origin: string | null = null;

    try {
      const route = receiptRoute(request);

      if (!route) return null;

      origin = allowedOrigin(
        request,
        env
      );

      if (request.method === 'OPTIONS') {
        const headers =
          responseHeaders(origin);
        headers.set(
          'Access-Control-Allow-Headers',
          'Authorization, Content-Type, X-Firebase-AppCheck'
        );
        headers.set(
          'Access-Control-Allow-Methods',
          'GET, POST, DELETE, OPTIONS'
        );
        return new Response(null, {
          status: 204,
          headers,
        });
      }

      if (
        request.method !== 'POST' &&
        request.method !== 'GET' &&
        request.method !== 'DELETE'
      ) {
        return json(
          {
            error: {
              code: 'METHOD_NOT_ALLOWED',
              message: 'Method not allowed.',
            },
          },
          405,
          origin
        );
      }

      const verifiedUser =
        await dependencies.verifyIdToken(
          bearerToken(request),
          env
        );
      await dependencies.verifyAppCheckToken(
        appCheckToken(request),
        env
      );

      if (!env.RECEIPTS) {
        return json(
          {
            error: {
              code: 'RECEIPTS_NOT_CONFIGURED',
              message: 'Receipt storage is not configured.',
            },
          },
          503,
          origin
        );
      }

      if (request.method === 'POST') {
        const mimeType = (
          request.headers
            .get('Content-Type') ??
          ''
        )
          .split(';')[0]
          .trim() as ReceiptMimeType;
        const extension =
          MIME_EXTENSIONS[mimeType];

        if (!extension) {
          throw new ReceiptHttpError(
            415,
            'UNSUPPORTED_RECEIPT_TYPE',
            'Use JPG, PNG, HEIC, or HEIF.'
          );
        }

        const body =
          await request.arrayBuffer();

        if (body.byteLength === 0) {
          throw new ReceiptHttpError(
            400,
            'EMPTY_RECEIPT',
            'Receipt body is empty.'
          );
        }

        if (
          body.byteLength >
          MAX_RECEIPT_BYTES
        ) {
          throw new ReceiptHttpError(
            413,
            'RECEIPT_TOO_LARGE',
            'Receipt exceeds the 5 MB limit.'
          );
        }

        const objectKey =
          canonicalReceiptObjectKey({
            uid: verifiedUser.uid,
            ...route,
            extension,
          });
        await env.RECEIPTS.put(
          objectKey,
          body,
          {
            httpMetadata: {
              contentType: mimeType,
            },
          }
        );
        const uploadedAt =
          (
            dependencies.now ??
            (() => new Date())
          )().toISOString();

        return json(
          {
            objectKey,
            uploadedAt,
            mimeType,
            sizeBytes: body.byteLength,
          },
          201,
          origin
        );
      }

      const extension =
        extensionFromRequest(request);
      const objectKey =
        canonicalReceiptObjectKey({
          uid: verifiedUser.uid,
          ...route,
          extension,
        });

      if (request.method === 'DELETE') {
        await env.RECEIPTS.delete(
          objectKey
        );
        return new Response(null, {
          status: 204,
          headers:
            responseHeaders(origin),
        });
      }

      const object =
        await env.RECEIPTS.get(
          objectKey
        );

      if (!object) {
        return json(
          {
            error: {
              code: 'RECEIPT_NOT_FOUND',
              message: 'Receipt not found.',
            },
          },
          404,
          origin
        );
      }

      const headers =
        responseHeaders(origin);
      headers.set(
        'Cache-Control',
        'private, max-age=3600'
      );
      headers.set(
        'Content-Type',
        object.httpMetadata
          ?.contentType ??
          'application/octet-stream'
      );

      return new Response(
        object.body,
        {
          status: 200,
          headers,
        }
      );
    } catch (error) {
      if (
        error instanceof
        ReceiptHttpError
      ) {
        return json(
          {
            error: {
              code: error.code,
              message: error.message,
            },
          },
          error.status,
          origin
        );
      }

      return json(
        {
          error: {
            code: 'INVALID_RECEIPT_TOKEN',
            message: 'Receipt authorization failed.',
          },
        },
        401,
        origin
      );
    }
  };

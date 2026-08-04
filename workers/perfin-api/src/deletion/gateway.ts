import {
  SignJWT,
  importPKCS8,
} from 'jose';

import type {
  Env,
} from '../env';
import type {
  VerifiedFirebaseApp,
  VerifiedFirebaseUser,
} from '../plan/firebaseVerification';

type Fetcher = typeof fetch;

interface DeletionCounts {
  firestoreDocuments: number;
  receiptObjects: number;
}

interface AccountDeletionJob {
  jobId: string;
  status:
    | 'deleting'
    | 'partial_failure'
    | 'remote_complete';
  unresolvedResourceClasses: string[];
  counts: DeletionCounts;
  requestedAt: string;
  completedAt?: string;
}

export interface DeletionGatewayDependencies {
  readonly verifyIdToken: (
    token: string,
    env: Env
  ) => Promise<VerifiedFirebaseUser>;
  readonly verifyAppCheckToken: (
    token: string,
    env: Env
  ) => Promise<VerifiedFirebaseApp>;
  readonly fetch?: Fetcher;
  readonly now?: () => Date;
  readonly accessTokenForDeletion?: (
    env: Env,
    now: Date,
    fetcher: Fetcher
  ) => Promise<string>;
}

class DeletionHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const deletionRoute = (
  request: Request
): boolean =>
  new URL(request.url).pathname ===
  '/account/deletion-jobs';

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
    throw new DeletionHttpError(
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
    throw new DeletionHttpError(
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
    throw new DeletionHttpError(
      401,
      'APP_CHECK_REQUIRED',
      'Firebase App Check is required.'
    );
  }

  return token;
};

const idempotencyKey = (
  request: Request
): string => {
  const key =
    request.headers
      .get('Idempotency-Key')
      ?.trim();

  if (
    !key ||
    key.length > 120
  ) {
    throw new DeletionHttpError(
      400,
      'IDEMPOTENCY_KEY_REQUIRED',
      'A valid Idempotency-Key header is required.'
    );
  }

  return key;
};

const hexDigest = async (
  value: string
): Promise<string> => {
  const bytes =
    new TextEncoder().encode(
      value
    );
  const digest =
    await crypto.subtle.digest(
      'SHA-256',
      bytes
    );

  return [...new Uint8Array(digest)]
    .map((byte) =>
      byte.toString(16).padStart(2, '0')
    )
    .join('');
};

const normalizePrivateKey = (
  value: string
) =>
  value.includes('\\n')
    ? value.replace(/\\n/g, '\n')
    : value;

const requireServiceAuthority = (
  env: Env
) => {
  const projectId =
    env.FIREBASE_PROJECT_ID
      ?.trim();
  const clientEmail =
    env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL
      ?.trim();
  const privateKey =
    env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
      ?.trim();

  if (
    !projectId ||
    !clientEmail ||
    !privateKey
  ) {
    throw new DeletionHttpError(
      503,
      'DELETION_AUTHORITY_NOT_CONFIGURED',
      'Account deletion requires configured Firebase service account authority.'
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey:
      normalizePrivateKey(privateKey),
    privateKeyId:
      env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID
        ?.trim(),
  };
};

const accessToken = async (
  env: Env,
  now: Date,
  fetcher: Fetcher
): Promise<string> => {
  const authority =
    requireServiceAuthority(env);
  const issuedAt =
    Math.floor(
      now.getTime() / 1000
    );
  const key =
    await importPKCS8(
      authority.privateKey,
      'RS256'
    );
  const assertion =
    await new SignJWT({
      scope:
        'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
    })
      .setProtectedHeader({
        alg: 'RS256',
        ...(authority.privateKeyId
          ? {
              kid:
                authority.privateKeyId,
            }
          : {}),
      })
      .setIssuer(
        authority.clientEmail
      )
      .setSubject(
        authority.clientEmail
      )
      .setAudience(
        'https://oauth2.googleapis.com/token'
      )
      .setIssuedAt(issuedAt)
      .setExpirationTime(
        issuedAt + 3600
      )
      .sign(key);

  const response =
    await fetcher(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body:
          new URLSearchParams({
            grant_type:
              'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
          }),
      }
    );

  const payload =
    await response
      .json()
      .catch(() => null) as
      | {
          access_token?: string;
        }
      | null;

  if (
    !response.ok ||
    !payload?.access_token
  ) {
    throw new DeletionHttpError(
      502,
      'DELETION_AUTHORITY_TOKEN_FAILED',
      'Account deletion authority token request failed.'
    );
  }

  return payload.access_token;
};

const firestoreDocumentBase = (
  projectId: string
) =>
  `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;

const firestoreFetch = async (
  fetcher: Fetcher,
  token: string,
  url: string,
  init: RequestInit = {}
) => {
  const headers =
    new Headers(init.headers);
  headers.set(
    'Authorization',
    `Bearer ${token}`
  );

  return fetcher(
    url,
    {
      ...init,
      headers,
    }
  );
};

const relativeDocumentPath = (
  name: string
) => {
  const marker =
    '/documents/';
  const index =
    name.indexOf(marker);

  if (index < 0) {
    throw new DeletionHttpError(
      502,
      'INVALID_FIRESTORE_DOCUMENT_PATH',
      'Firestore returned an unexpected document path.'
    );
  }

  return name.slice(
    index + marker.length
  );
};

const listCollectionIds = async (
  fetcher: Fetcher,
  token: string,
  base: string,
  documentPath: string
): Promise<string[]> => {
  const collectionIds: string[] = [];
  let pageToken = '';

  do {
    const response =
      await firestoreFetch(
        fetcher,
        token,
        `${base}/${documentPath}:listCollectionIds`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body:
            JSON.stringify({
              pageSize: 100,
              ...(pageToken
                ? {
                    pageToken,
                  }
                : {}),
            }),
        }
      );

    if (response.status === 404) {
      return collectionIds;
    }

    const payload =
      await response
        .json()
        .catch(() => null) as
        | {
            collectionIds?: string[];
            nextPageToken?: string;
          }
        | null;

    if (!response.ok) {
      throw new DeletionHttpError(
        response.status,
        'FIRESTORE_COLLECTION_LIST_FAILED',
        'Could not enumerate account data collections.'
      );
    }

    collectionIds.push(
      ...(payload?.collectionIds ?? [])
    );
    pageToken =
      payload?.nextPageToken ?? '';
  } while (pageToken);

  return collectionIds;
};

const deleteDocumentTree = async (
  fetcher: Fetcher,
  token: string,
  base: string,
  documentPath: string
): Promise<number> => {
  let deleted = 0;
  const childCollections =
    await listCollectionIds(
      fetcher,
      token,
      base,
      documentPath
    );

  for (const collectionId of childCollections) {
    deleted += await deleteCollection(
      fetcher,
      token,
      base,
      `${documentPath}/${collectionId}`
    );
  }

  const response =
    await firestoreFetch(
      fetcher,
      token,
      `${base}/${documentPath}`,
      {
        method: 'DELETE',
      }
    );

  if (response.status === 404) {
    return deleted;
  }

  if (!response.ok) {
    throw new DeletionHttpError(
      response.status,
      'FIRESTORE_DELETE_FAILED',
      'Could not delete all account data.'
    );
  }

  return deleted + 1;
};

const deleteCollection = async (
  fetcher: Fetcher,
  token: string,
  base: string,
  collectionPath: string
): Promise<number> => {
  let deleted = 0;
  let pageToken = '';

  do {
    const url =
      new URL(
        `${base}/${collectionPath}`
      );
    url.searchParams.set(
      'pageSize',
      '100'
    );
    if (pageToken) {
      url.searchParams.set(
        'pageToken',
        pageToken
      );
    }

    const response =
      await firestoreFetch(
        fetcher,
        token,
        url.toString()
      );

    if (response.status === 404) {
      return deleted;
    }

    const payload =
      await response
        .json()
        .catch(() => null) as
        | {
            documents?: {
              name: string;
            }[];
            nextPageToken?: string;
          }
        | null;

    if (!response.ok) {
      throw new DeletionHttpError(
        response.status,
        'FIRESTORE_DOCUMENT_LIST_FAILED',
        'Could not enumerate account data documents.'
      );
    }

    for (const document of payload?.documents ?? []) {
      deleted += await deleteDocumentTree(
        fetcher,
        token,
        base,
        relativeDocumentPath(
          document.name
        )
      );
    }

    pageToken =
      payload?.nextPageToken ?? '';
  } while (pageToken);

  return deleted;
};

const deleteUserFirestoreData = async (
  uid: string,
  env: Env,
  token: string,
  fetcher: Fetcher
): Promise<number> => {
  const authority =
    requireServiceAuthority(env);

  return deleteDocumentTree(
    fetcher,
    token,
    firestoreDocumentBase(
      authority.projectId
    ),
    `users/${encodeURIComponent(uid)}`
  );
};

const deleteReceiptObjects = async (
  uid: string,
  env: Env
): Promise<number> => {
  if (!env.RECEIPTS) {
    throw new DeletionHttpError(
      503,
      'RECEIPTS_NOT_CONFIGURED',
      'Receipt storage is not configured.'
    );
  }

  let deleted = 0;
  let cursor:
    | string
    | undefined;

  do {
    const listed =
      await env.RECEIPTS.list({
        prefix:
          `receipts/${uid}/`,
        cursor,
      });
    const keys =
      listed.objects.map(
        (object) => object.key
      );

    for (
      let index = 0;
      index < keys.length;
      index += 100
    ) {
      const batch =
        keys.slice(
          index,
          index + 100
        );

      if (batch.length) {
        await env.RECEIPTS.delete(
          batch
        );
        deleted += batch.length;
      }
    }

    cursor =
      listed.truncated
        ? listed.cursor
        : undefined;
  } while (cursor);

  return deleted;
};

export const createDeletionGateway = (
  dependencies: DeletionGatewayDependencies
) =>
  async (
    request: Request,
    env: Env
  ): Promise<Response | null> => {
    let origin: string | null = null;

    try {
      if (!deletionRoute(request)) {
        return null;
      }

      origin = allowedOrigin(
        request,
        env
      );

      if (request.method === 'OPTIONS') {
        const headers =
          responseHeaders(origin);
        headers.set(
          'Access-Control-Allow-Headers',
          'Authorization, Content-Type, X-Firebase-AppCheck, Idempotency-Key'
        );
        headers.set(
          'Access-Control-Allow-Methods',
          'POST, OPTIONS'
        );
        return new Response(null, {
          status: 204,
          headers,
        });
      }

      if (request.method !== 'POST') {
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

      const key =
        idempotencyKey(request);
      const verifiedUser =
        await dependencies.verifyIdToken(
          bearerToken(request),
          env
        );
      await dependencies.verifyAppCheckToken(
        appCheckToken(request),
        env
      );

      const now =
        (
          dependencies.now ??
          (() => new Date())
        )();
      const jobId =
        `acctdel-${(
          await hexDigest(
            `${verifiedUser.uid}:${key}`
          )
        ).slice(0, 24)}`;
      const fetcher =
        dependencies.fetch ?? fetch;

      let receiptObjects = 0;
      let firestoreDocuments = 0;

      try {
        const token =
          await (
            dependencies.accessTokenForDeletion ??
            accessToken
          )(
            env,
            now,
            fetcher
          );

        receiptObjects =
          await deleteReceiptObjects(
            verifiedUser.uid,
            env
          );
        firestoreDocuments =
          await deleteUserFirestoreData(
            verifiedUser.uid,
            env,
            token,
            fetcher
          );
      } catch (error) {
        if (
          error instanceof
          DeletionHttpError
        ) {
          return json(
            {
              error: {
                code: error.code,
                message: error.message,
              },
              job: {
                jobId,
                status:
                  'partial_failure',
                unresolvedResourceClasses: [
                  'firestore',
                  'receipts',
                  'identity',
                ],
                counts: {
                  firestoreDocuments,
                  receiptObjects,
                },
                requestedAt:
                  now.toISOString(),
              } satisfies AccountDeletionJob,
            },
            error.status,
            origin
          );
        }

        throw error;
      }

      return json(
        {
          jobId,
          status:
            'remote_complete',
          unresolvedResourceClasses: [],
          counts: {
            firestoreDocuments,
            receiptObjects,
          },
          requestedAt:
            now.toISOString(),
          completedAt:
            (
              dependencies.now ??
              (() => new Date())
            )().toISOString(),
        } satisfies AccountDeletionJob,
        202,
        origin
      );
    } catch (error) {
      if (
        error instanceof
        DeletionHttpError
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
            code: 'ACCOUNT_DELETION_FAILED',
            message: 'Account deletion failed.',
          },
        },
        500,
        origin
      );
    }
  };

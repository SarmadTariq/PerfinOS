import type {
  Env,
} from './env';

import {
  verifyFirebaseAppCheckToken,
  verifyFirebaseIdToken,
} from './plan/firebaseVerification';

import {
  createPlanGateway,
} from './plan/gateway';

import {
  serializePlanOperationalEvent,
} from './plan/operational';

const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Object-Key',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    },
  }
);

export async function requireAuth(
  request: Request,
  env: Env
): Promise<string> {
  const authorization =
    request.headers.get(
      'Authorization'
    );

  if (
    !authorization?.startsWith(
      'Bearer '
    )
  ) {
    throw new Response(
      JSON.stringify({
        error:
          'Authentication required',
      }),
      {
        status: 401,
      }
    );
  }

  const token =
    authorization
      .slice(7)
      .trim();

  if (!token) {
    throw new Response(
      JSON.stringify({
        error:
          'Authentication required',
      }),
      {
        status: 401,
      }
    );
  }

  try {
    const verified =
      await verifyFirebaseIdToken(
        token,
        env
      );

    return verified.uid;
  } catch {
    throw new Response(
      JSON.stringify({
        error:
          'Invalid token',
      }),
      {
        status: 401,
      }
    );
  }
}

const notConfigured = (feature: string) =>{
  return json({ error: `${feature} is not configured`, placeholder: true }, 503);
};

const handleReceiptUpload = async (request: Request, env: Env): Promise<Response> => {

  const userId = await requireAuth(request, env);
  if (!env.RECEIPTS) return notConfigured('R2 Receipts');

  const filename = request.headers.get('X-Object-Key');
  const mimeType = (request.headers.get('Content-Type') || 'image/jpeg').split(';')[0].trim();

  if (!filename) return json({ error: 'X-Object-Key header required' }, 400);
  if (!ALLOWED_RECEIPT_TYPES.includes(mimeType)) {
    return json({ error: 'Unsupported MIME type. Use JPG, PNG, HEIC, or HEIF.' }, 415);
  }

  const objectKey = `${userId}/${filename}`;

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) return json({ error: 'Empty file body' }, 400);
  if (body.byteLength > MAX_RECEIPT_BYTES) {
    return json({ error: 'File exceeds 5 MB limit' }, 413);
  }

  await env.RECEIPTS.put(objectKey, body, {
    httpMetadata: { contentType: mimeType },
  });

  return json({ objectKey, uploadedAt: new Date().toISOString() });
};

// ── Receipt download: Worker fetches from R2, streams back ─────────────────

const handleReceiptDownload = async (request: Request, env: Env): Promise<Response> => {
  await requireAuth(request, env);
  if (!env.RECEIPTS) return notConfigured('R2 Receipts');

  const body = (await request.json()) as { objectKey?: string };
  const objectKey = body?.objectKey;
  if (!objectKey) return json({ error: 'objectKey required' }, 400);

  const obj = await env.RECEIPTS.get(objectKey);
  if (!obj) return json({ error: 'Receipt not found' }, 404);

  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

// ── Receipt delete ─────────────────────────────────────────────────────────

const handleReceiptDelete = async (request: Request, env: Env): Promise<Response> => {
  const userId = await requireAuth(request, env);
  if (!env.RECEIPTS) return notConfigured('R2 Receipts');

  // objectKey is everything after /receipts/ in the path
  const rawKey = new URL(request.url).pathname.replace(/^\/receipts\//, '');
  const fileName = decodeURIComponent(rawKey);
  const objectKey = `${userId}/${fileName}`;
  if (!objectKey) return json({ error: 'objectKey required in path' }, 400);

  await env.RECEIPTS.delete(objectKey);
  return json({ deleted: true, objectKey });
};

// ── Google Places proxy ────────────────────────────────────────────────────

const handlePlaces = async (request: Request, env: Env): Promise<Response> => {
  if (!env.GOOGLE_PLACES_API_KEY) return notConfigured('Google Places');
  const url = new URL(request.url);
  const query = url.searchParams.get('query')?.trim();
  if (!query) return json([]);

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
  });

  if (!response.ok) return json({ error: 'Place search failed' }, response.status);
  const payload = (await response.json()) as any;
  return json(
    (payload.places || []).map((place: any) => ({
      placeId: place.id,
      name: place.displayName?.text || place.formattedAddress,
      address: place.formattedAddress,
      formattedAddress: place.formattedAddress,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      placeType: place.primaryType,
    }))
  );
};

const planGateway =
  createPlanGateway({
    verifyIdToken:
      verifyFirebaseIdToken,
    verifyAppCheckToken:
      verifyFirebaseAppCheckToken,
    recordOperationalEvent:
      (event) => {
        console.log(
          serializePlanOperationalEvent(
            event
          )
        );
      },

    invokeAction:
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code:
                'PLAN_ACTION_UNAVAILABLE',
              message:
                'Plan AI actions are not available.',
            },
          }),
          {
            status: 501,
            headers: {
              'Content-Type':
                'application/json; charset=utf-8',
            },
          }
        ),
  });

// ── Main router ────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url =
      new URL(request.url);

    try {
      const planResponse =
        await planGateway(
          request,
          env
        );

      if (planResponse) {
        return planResponse;
      }

      if (
        request.method ===
        'OPTIONS'
      ) {
        return json({});
      }
      if (url.pathname === '/places/search' && request.method === 'GET') {
        return handlePlaces(request, env);
      }
      if (
        (
          url.pathname ===
            '/ai/report' ||
          url.pathname ===
            '/ai/chat'
        ) &&
        request.method ===
          'POST'
      ) {
        return json(
          {
            error:
              'Legacy AI route is disabled',
          },
          410
        );
      }
      if (url.pathname === '/receipts/upload' && request.method === 'POST') {
        return handleReceiptUpload(request, env);
      }
      if (url.pathname === '/receipts/download-url' && request.method === 'POST') {
        return handleReceiptDownload(request, env);
      }
      if (url.pathname.startsWith('/receipts/') && request.method === 'DELETE') {
        return handleReceiptDelete(request, env);
      }
      return json({ error: 'Not found' }, 404);
    } catch (error) {
      if (error instanceof Response) return error;
      return json({ error: 'Unexpected worker error' }, 500);
    }
  },
};

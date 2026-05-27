interface Env {
  RECEIPTS: R2Bucket;
  GEMINI_API_KEY?: string;
  GOOGLE_PLACES_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
}

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
  });

const requireAuth = (request: Request): string => {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    throw new Response('Authentication required', { status: 401 });
  }
  return auth.slice('Bearer '.length);
  // TODO (roadmap): verify Firebase ID token via JWKS from
  // https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
  // Check iss === https://securetoken.google.com/${FIREBASE_PROJECT_ID}, aud, exp
};

const notConfigured = (feature: string) =>
  json({ error: `${feature} is not configured`, placeholder: true }, 503);

// ── Receipt upload: client POSTs binary → Worker writes to R2 ──────────────

const handleReceiptUpload = async (request: Request, env: Env): Promise<Response> => {
  requireAuth(request);
  if (!env.RECEIPTS) return notConfigured('R2 Receipts');

  const objectKey = request.headers.get('X-Object-Key');
  const mimeType = (request.headers.get('Content-Type') || 'image/jpeg').split(';')[0].trim();

  if (!objectKey) return json({ error: 'X-Object-Key header required' }, 400);
  if (!ALLOWED_RECEIPT_TYPES.includes(mimeType)) {
    return json({ error: 'Unsupported MIME type. Use JPG, PNG, HEIC, or HEIF.' }, 415);
  }

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
  requireAuth(request);
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
  requireAuth(request);
  if (!env.RECEIPTS) return notConfigured('R2 Receipts');

  // objectKey is everything after /receipts/ in the path
  const rawKey = new URL(request.url).pathname.replace(/^\/receipts\//, '');
  const objectKey = decodeURIComponent(rawKey);
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

// ── Gemini AI proxy (report + chat share same handler) ─────────────────────

const handleAiReport = async (request: Request, env: Env): Promise<Response> => {
  requireAuth(request);
  if (!env.GEMINI_API_KEY) return notConfigured('Gemini AI');

  const aggregatePayload = await request.json();
  const prompt = [
    'You are PerFin OS, an educational personal finance planning assistant.',
    'Use only the aggregate JSON data provided. Do not infer private personal details.',
    'Do not provide tax, legal, banking, or investment advice.',
    'Respond in plain language with 2–4 concise, actionable planning observations.',
    JSON.stringify(aggregatePayload),
  ].join('\n\n');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!response.ok) return json({ error: 'AI provider failed' }, response.status);
  const model = (await response.json()) as any;
  const text =
    model.candidates?.[0]?.content?.parts?.[0]?.text || 'No AI response was generated.';

  return json({
    title: 'AI Planner Summary',
    summary: text,
    recommendations: [],
  });
};

// ── Main router ────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return json({});

    const url = new URL(request.url);

    try {
      if (url.pathname === '/places/search' && request.method === 'GET') {
        return handlePlaces(request, env);
      }
      if (url.pathname === '/ai/report' && request.method === 'POST') {
        return handleAiReport(request, env);
      }
      if (url.pathname === '/ai/chat' && request.method === 'POST') {
        return handleAiReport(request, env);
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

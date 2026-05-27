# PerFin OS Production Readiness Notes

## v1.0.0 Decisions

- Guest mode is local-only.
- Firebase Auth and Firestore are the authenticated source of truth.
- Receipt uploads are authenticated-only and support up to 5 images per transaction.
- Cloudflare R2 is the planned receipt storage layer; Firebase Storage is intentionally avoided.
- AI Reports and Planner Chat are authenticated-only and send aggregate-only data.
- Google Maps/Places is supported through configured keys and cost controls.
- Freemium v2.0 is represented only through entitlement metadata in v1.

## Placeholder Integrations

The app is safe to run without production keys. Missing integrations show locked, fallback, or configuration-needed states instead of crashing.

Required later:

- Firebase public Expo config.
- Cloudflare Worker API URL.
- Cloudflare R2 bucket and credentials.
- Gemini API key stored as Worker secret.
- Google Maps/Places keys with strict restrictions and quotas.

## Audit Gates

Run after each production milestone:

```bash
npm run typecheck
npm run build
npm run audit:prod
```

Also inspect:

- `git status`
- secret scan
- guest/auth data routing
- input validators
- receipt file limits
- map placeholder behavior
- AI aggregate-only payload behavior

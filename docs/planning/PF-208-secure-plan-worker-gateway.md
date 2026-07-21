# PF-208 Secure Plan Worker Gateway

## Purpose

The Plan Worker accepts deterministic financial evidence produced by the application and uses Gemini only to produce educational planning language.

Gemini does not calculate authoritative financial values.

## Request path

Every protected Plan request follows this order:

1. Resolve the versioned route.
2. Validate the request origin when an Origin header exists.
3. Enforce the HTTP method.
4. Enforce application/json.
5. Reject declared oversized bodies.
6. Verify the Firebase ID token.
7. Verify the Firebase App Check token.
8. Apply the verified-user and route rate limit.
9. Read the bounded body.
10. Validate the versioned action contract.
11. Invoke the action handler.
12. Record privacy-safe operational metadata.

Provider code cannot run before authentication, App Check, rate limiting, and request validation succeed.

## Endpoints

- POST /v1/plan/session
- POST /v1/plan/turn
- POST /v1/plan/generate
- POST /v1/plan/revise

OPTIONS is supported for approved browser origins.

Legacy /ai/report and /ai/chat routes are disabled.

## Authentication

Protected Plan requests require:

- Authorization: Bearer <Firebase ID token>
- X-Firebase-AppCheck: <Firebase App Check token>

Firebase ID tokens and App Check tokens are verified cryptographically by the Worker.

## CORS

ALLOWED_ORIGINS contains a comma-separated exact allowlist.

Browser preflight requests require an approved Origin.

Native mobile requests may omit Origin. They still require valid Firebase authentication and App Check.

Wildcard Plan CORS is prohibited.

## Body and schema limits

- Content type: application/json
- Maximum body size: 65,536 bytes
- Schema version: 1
- User message maximum: 2,000 characters
- Unknown request properties are rejected
- Prohibited financial-evidence properties are rejected

The accepted evidence contract excludes merchant names, payment methods, notes, receipts, coordinates, full addresses, place IDs, raw transactions, and goal names.

## Rate limits

Per verified user, per Cloudflare location:

- session: 10 per 60 seconds
- turn: 30 per 60 seconds
- generate: 6 per 60 seconds
- revise: 6 per 60 seconds

Rate limits protect the Worker and provider from abuse. They are not accounting or billing counters.

## Provider reliability

- model: environment-controlled
- API key: Worker secret
- API-key transport: x-goog-api-key header
- timeout: 15 seconds
- retry: one retry for transient failures only
- permanent provider rejections are not retried
- circuit breaker opens after repeated transient failures
- provider bodies and internal errors are not returned to clients

## Operational metadata

The Worker may record:

- request ID
- action
- outcome
- status
- duration
- request-body byte count
- generic error code

The Worker must not log:

- Firebase UID
- App Check app ID
- tokens
- prompts
- user messages
- revision values
- financial evidence
- provider responses
- provider failure bodies

## Environment separation

The default Wrangler environment is local and is named perfin-os-local.

Production deployment must explicitly use:

    npx wrangler deploy --env production

The production Worker is named perfin-os.

Production requires these configured secrets or runtime settings:

- GEMINI_API_KEY
- FIREBASE_PROJECT_NUMBER
- ALLOWED_ORIGINS

Production non-secret configuration includes:

- FIREBASE_PROJECT_ID
- GEMINI_MODEL
- GEMINI_API_BASE
- PLAN_ENV

Bindings and vars are repeated in the production environment because Wrangler does not inherit them into named environments.

## Local development

Copy the example without committing the real file:

    cp .dev.vars.example .dev.vars

Replace all placeholders locally.

Do not use both .dev.vars and .env.

## Production preparation

The required production values are not configured or deployed by this change.

Before deployment, an authorized operator must:

1. Confirm the Firebase project number.
2. Confirm the exact production origin allowlist.
3. Confirm the rate-limit namespace IDs are unused.
4. Configure the Gemini API key as a Worker secret.
5. Configure the remaining required production values.
6. run the complete verification suite.
7. perform a staging or controlled production smoke test.

## Verification

From workers/perfin-api:

    npm run verify:release

From the repository root:

    npm run typecheck
    npm run build
    git diff --check

No deployment is part of PF-208 implementation review.

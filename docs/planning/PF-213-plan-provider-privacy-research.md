# PF-213 Provider Privacy Research

Access date: 2026-07-23

## Gemini Developer API

Official documentation states that prompts and responses from Paid Services are
not used to improve Google products. It also states that prompt and response
logging can still occur for abuse monitoring unless a project has approved zero
data retention handling. Grounding, Interactions, Live, File, and caching
features have separate retention behavior.

PerFin OS uses `generateContent` with JSON output. The inspected Plan prompt does
not enable tools, Search grounding, Maps grounding, File API, Live API,
Interactions API, or explicit context caching.

Unknown:

- Whether the configured API project is a Paid Service.
- Whether zero data retention is approved for the project.
- The selected project's billing, quota, region, or abuse-log configuration.
- The legal jurisdiction applicable to the deployed project.

No in-app or release copy may claim zero retention, no training, or a specific
jurisdiction until those project facts are verified.

Sources:

- [Zero data retention in the Gemini Developer API](https://ai.google.dev/gemini-api/docs/zdr?hl=en)
- [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms)
- [Gemini API billing](https://ai.google.dev/gemini-api/docs/billing/)

## Cloudflare Workers Logs

Official documentation states that Workers Logs can include invocation logs,
custom logs, errors, and uncaught exceptions. It documents a maximum retention
of 7 days, with 3 days on Free and 7 days on Paid at the time of access.

Local configuration persists invocation logs and traces with a 10 percent
head-sampling rate. The custom Plan event is allowlisted and excludes request
body, user text, evidence, user ID, tokens, prompts, and provider responses.

Unknown:

- Cloudflare account plan.
- Actual deployed sampling override.
- Logpush, third-party sink, alerting, or staff-access configuration.
- Whether a deployed environment captures additional platform fields.

Source:

- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)

## Firebase And Firestore

Official documentation states that Firestore location is selected when a
database is provisioned and cannot later be changed for that database. It also
states that deleting a document does not automatically delete subcollections.

Unknown:

- Current Firestore database region or multi-region.
- Backup, point-in-time recovery, TTL, and delete-protection settings.
- Account-deletion automation and operational access policy.

Sources:

- [Cloud Firestore locations](https://firebase.google.com/docs/firestore/locations)
- [Delete data from Cloud Firestore](https://firebase.google.com/docs/firestore/manage-data/delete-data)
- [Manage Firestore databases](https://firebase.google.com/docs/firestore/manage-databases)

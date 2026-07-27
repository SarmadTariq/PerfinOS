# PF-213 Plan Threat Model, Abuse, And Cost

## Trust Boundaries

1. The client owns raw finance data and calculates deterministic evidence.
2. Firebase Authentication and App Check identify an accepted request.
3. The Worker validates origin, body size, route schema, evidence shape, request
   content, rate limit, provider response, and error mapping.
4. Gemini receives only the bounded Plan request.
5. The client persists only validated Plan/version data.
6. Firestore rules enforce owner scope, immutable versions/results, and bounded
   confirmed action writes.

## Abuse Cases And Controls

| Case | Current control | Residual risk |
|---|---|---|
| Prompt override or secret request | Request-safety patterns and synthetic tests reject before provider call | Novel wording can bypass pattern matching |
| Sensitive contact/account text | Shared sensitive-text validator rejects request, evidence labels, and output | Free-form non-pattern identifiers can remain |
| Unsupported financial advice | Request and output policy checks | Advisory language still requires human review |
| Claimed autonomous action | Output validation rejects executed-action language; actions require explicit client confirmation | Authenticated owner can edit their own finance records outside Plan |
| Unknown evidence reference | Output evidence-reference validator | Provider can omit useful evidence and be rejected |
| Malformed or oversized output | JSON/schema/content/length validation | Provider outage remains visible to user |
| Burst abuse | Per-user and per-location route rate limits | No durable daily per-user budget |
| Retry amplification | One retry maximum; circuit opens after three failures for 30 seconds | In-memory circuit state is isolate-local |
| Large request cost | 64 KiB body limit and 1,200 output-token limit | Input token budget is not separately metered |
| Session replay | Authentication, App Check, revision, and request validation | Session IDs are stateless and not server-bound |
| Log leakage | Allowlisted metadata event and static log scan | Platform invocation metadata and console settings are Unknown |

## Cost Limits

- Body: 64 KiB maximum.
- Output: 1,200 tokens maximum.
- Provider timeout: 15 seconds.
- Retry: one retry maximum.
- Circuit: opens after three failures for 30 seconds.
- Session route: 10 requests per 60 seconds.
- Turn route: 30 requests per 60 seconds.
- Generate and revise routes: 6 requests per 60 seconds each.
- Worker logs and traces: 10 percent head sampling in local configuration.

Daily project quota, daily per-user spend, billing alerts, and deployed provider
quota are Unknown. Production release remains blocked until an authorized human
verifies those controls.

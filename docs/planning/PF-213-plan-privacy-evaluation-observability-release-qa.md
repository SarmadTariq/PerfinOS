# PF-213 Plan Privacy, Evaluation, Observability, And Release QA

## Scope

PF-213 owns Plan-specific evidence. PF-203 owns the later product-wide Privacy
and Help inventory and final in-app copy.

## Verified Code Controls

- Firebase Authentication and App Check are required by the Plan Worker gateway.
- CORS uses an explicit configured allowlist.
- Request body limit is 64 KiB.
- Route-specific per-user and per-location limits are configured.
- Provider timeout is 15 seconds with one retry maximum.
- Circuit breaker opens after three failures for 30 seconds.
- Provider output limit is 1,200 tokens.
- Prompt, response schema, output schema, model, attempt count, and timestamp are
  recorded in generation provenance.
- Provider tools and function calling are not enabled.
- Operational events contain only allowlisted aggregate metadata.
- Logs and traces use 10 percent head sampling in the inspected configuration.
- Sensitive request text, evidence labels, and provider output are rejected.
- Deterministic evidence remains authoritative.
- Provider output cannot directly mutate finance data.
- Confirmed actions require explicit review and validated Firestore writes.

## Synthetic Evaluation Profiles

The required inventory is implemented as a stable contract:

- empty
- partial
- low income
- negative cash flow
- high recurring load
- budget pressure
- savings goal
- no place
- stale evidence
- conflicting active Plan

Worker fixtures cover accepted bounded evidence plus prompt override, secret
request, sensitive data, unsupported advice, malformed output, unknown evidence
references, prohibited actions, timeout, retry, outage, and circuit behavior.
App and Firestore suites cover stale evidence, active-Plan conflicts, owner
isolation, immutable history, and atomic action writes.

## Release Decision

Local review status can be `ready_for_human_review` only when required local
tests, typecheck, build, Worker verification, privacy scan, diff check, and
bundle export pass.

Production release status remains `blocked` in this package because these facts
are Unknown:

- Gemini paid-service and zero-data-retention project status.
- Firebase database location, backup, TTL, and deletion configuration.
- Cloudflare account plan, deployed log settings, and staff access.
- Distinct production resource/project configuration.
- Daily provider quota, billing alerts, and per-user spend control.
- Signed-in runtime, native simulator/device, outage, and screen-reader QA.

No deployment or external configuration mutation is part of PF-213.

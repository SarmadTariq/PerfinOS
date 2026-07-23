# PF-212 Plan Action Application

## Decision

Confirmed Plan actions use immutable child records at:

`users/{userId}/plans/{planId}/actionResults/{applicationId}`

An applied action does not create or mutate a `PlanVersion`. The immutable source
version remains the proposal and evidence record. The child result records the
bounded outcome and the exact reviewed preview revision.

A small mutable action-state document at
`users/{userId}/plans/{planId}/actionState/current` holds only the accepted
post-action evidence revision, the bounded set of successfully applied proposal
IDs, and the last application ID. This pointer lets separate confirmed proposals
advance from one immutable source version without rewriting that version.

## Supported writes

- total budget update
- category budget update
- savings-goal creation
- savings-goal update

Budget proposal values are final reviewed values. A `savings_contribution`
proposal is a delta: savings-goal update computes `current + contribution`, and
savings-goal creation uses the contribution as the starting balance. The final
balance must remain below the goal target.

Activity, Reports, Insights, Categories, Recurring Expenses, scenario comparison,
custom proposals, and future proposal types remain non-mutating.

## Atomic boundary

One Firestore transaction rereads the owner Plan, immutable source version,
action-state pointer, legacy app-data document, result id, and exact budget,
category, or savings-goal entity. It then validates:

- authenticated ownership
- active current Plan version
- immutable proposal type, target, and amount binding
- exact selection digest for duplicate detection
- exact target and current value
- account and Plan currency
- amount bounds
- deterministic evidence revision
- reviewed preview fingerprint
- idempotency id
- whether the proposal already succeeded

On success, the transaction updates only the target entity, its matching
legacy app-data entry, the action-state pointer, and one immutable action result.
Category-budget actions update the selected month’s
`Budget.categoryBudgets` value. The budget screen overlays that month-specific
value onto category defaults for analytics and display; it does not rewrite the
global `Category.monthlyBudget` default. Any failure leaves all affected records
unchanged.
Infrastructure failures remain transient and can retry with the same application
id. Validation failures are non-retryable until the user reviews a recalculated
preview. A canceled or blocked application ID can never be returned as success.

## Data minimization

Action results contain bounded identifiers, status, safe failure code, currency,
selection digest, finance-document ID, legacy mirror index, major/minor-unit
before/change/proposed values, pre/post evidence and preview revisions, and a
Firestore server timestamp. They do not store transactions, merchant names,
notes, receipts, recurring records, account data, location data, provider
prompts, or raw model output.

## Trust boundary

Application runs in the authenticated owner client because PF-212 does not add a
privileged backend action endpoint. Immutable Plan versions expose a bounded
rule-facing proposal map containing only schema version, type, target, and amount.
Firestore rules require that binding, the current source version, bounded fields,
server timestamps, a linked successful result, a real before/after value change,
and matching writes at the recorded canonical entity and legacy app-data index
before action state can advance. The repository separately requires full
business-field parity between entity documents and the legacy app-data mirror
before patching only the intended fields.

These records are owner-scoped audit history, not a tamper-proof third-party
ledger. A future trusted backend can strengthen that boundary without changing
the immutable result model.

## Result semantics

Supported presentation states are success, blocked, canceled, partial failure,
and non-retryable failure. First-release writes are atomic, so the implementation
does not manufacture a partial failure. The presentation layer handles that
status defensively for future non-atomic actions and never reports all actions
complete unless every supported proposal's latest result is successful.

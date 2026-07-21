# PF-207 Plan Deterministic Evidence Engine

## Purpose

Produce every authoritative, horizon-scoped financial value required by Plan before any Gemini request is created.

All financial calculations are deterministic application logic. AI may explain the evidence but does not calculate authoritative totals.

## Primary interface

`buildPlanEvidenceSnapshot(input: PlanEvidenceInput): PlanEvidenceSnapshot`

## Supported horizons

- Seven-day rolling period ending on the supplied anchor date
- Fourteen-day rolling period ending on the supplied anchor date
- Current calendar month through the supplied anchor date
- Selected past calendar month

Future selected months are rejected. All boundaries are inclusive and use explicit UTC calendar dates.

## Financial rules

- Calculations use integer minor units.
- Currency precision comes from the selected currency.
- Financial source values must be finite and non-negative.
- Recorded income and expenses remain authoritative.
- Short-period expected income is unavailable and is never prorated.
- Historical expected income is unavailable without historical evidence.
- Negative available amounts are preserved as deficits.

## Budget rules

- Matching monthly Budget records are authoritative.
- Short horizons use monthly budget context without proration.
- Missing category allocations remain unavailable rather than inferred.

## Recurring commitments

- Only active recurring records create projected commitments.
- Weekly, biweekly, monthly, quarterly, and annual frequencies are supported.
- Month-end recurrence clamps shorter months and returns to the original intended day.
- Recorded occurrences are reconciled internally to prevent double deductions.
- Merchant information never enters the returned evidence snapshot.

## Location evidence

- Expense transactions only.
- Neighborhood is the only accepted area label.
- At least three transactions must support an area.
- Addresses, coordinates, place IDs, merchant names, and inferred home or work locations are excluded.

## Privacy exclusions

The returned snapshot excludes user identity, transaction IDs, raw transactions, merchant names, payment methods, notes, receipts, coordinates, full addresses, place IDs, and savings-goal names.

## Baseline revision

`baselineRevision` is a deterministic fingerprint of the completed privacy-safe evidence snapshot.

It supports stale-evidence detection only. It is not a cryptographic security or authorization control.

## Verification

- `npm test`
- `npm run typecheck`
- `npm run build`
- `git diff --check`

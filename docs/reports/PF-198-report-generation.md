# PF-198 Report Generation

## Supported Report

PerFin OS currently supports one report type: a deterministic monthly summary.
The reporting period is one calendar month identified by `YYYY-MM`.

The screen does not offer arbitrary-range generation because the persistence
model and existing report identity are monthly. Activity filters can still be
adjusted independently, but they are not silently converted into a different
report period.

## Generation States

The Reports screen distinguishes:

- not generated;
- generating;
- generated but not saved;
- saved;
- unavailable;
- failed;
- partial data; and
- empty data.

Repeated generation requests are blocked while one is in flight. A failed
request leaves the selected month and previously saved reports intact.

## Calculation Ownership

Income, expenses, net cash flow, category ranking, budget status, and report
coverage come from deterministic local calculations. Generated reports are
not labeled as AI output.

The selected month is the shared reconciliation boundary for Reports,
Activity-compatible transaction filtering, and Dashboard-compatible monthly
totals.

Savings progress is an account-level snapshot at generation time, not a
monthly cash-flow total.

## Persistence

Generation creates an unsaved preview. Saving persists the report through the
existing workspace repository and replaces the report with the same monthly
identifier.

Existing saved reports without the new optional metadata remain readable.

## Unsupported Actions

The UI does not expose report export, report deletion, a report-detail route,
arbitrary report types, or AI interpretation because those capabilities do not
exist in the inspected repository.

## Runtime Boundary

PF-198 requires focused and broad automated checks before merge. Manual
platform, large-text, keyboard, and screen-reader checks remain final PF-204
release-gate evidence unless they are captured separately on this branch.

# PF-211 Plan Detail, Versions, and Lifecycle

## Decision

PF-211 keeps the existing Firestore repository as the persistence boundary and adds `planWorkspaceService` as the application-service boundary used by Plan views.

Plan versions remain immutable. Manual revisions call `createPlanVersion`, duplicates call `createPlan`, and lifecycle controls call `updatePlanLifecycle`. Views do not write Firestore documents directly.

## Evidence Summary

New versions store an aggregated `PlanEvidenceSummary`:

- baseline revision
- period
- currency
- coverage state
- transaction count
- aggregate income, expense, cash-flow, recurring, budget, and savings values in integer minor units

The summary contains no transaction records, merchant names, notes, receipts, coordinates, addresses, or place identifiers. Existing versions without this optional field remain readable and require no migration.

Before activation, current deterministic evidence is rebuilt from app data and compared with the saved version. A changed baseline blocks activation until the user creates a new Plan from current evidence. Summary-only manual revisions remain available without Gemini but intentionally cannot clear this safeguard.

Saved-period reconstruction anchors short horizons to the saved Plan end date. Component revisions identify changes to expected-income basis, categories, recurring signals, savings, coarse location signals, and coverage without storing raw records.

Summary-only manual revisions preserve the prior immutable version's evidence provenance. They do not relabel unchanged allocations, commitments, recommendations, or proposals as current evidence.

## Lifecycle

- Draft: activate or archive
- Active: complete or archive
- Completed: archive
- Archived: read-only lifecycle

Every lifecycle action requires confirmation. If one active Plan overlaps the target period, activation offers explicit replacement and archives the conflicting Plan through the existing transactional repository operation. Multiple overlaps are blocked for separate resolution.

Lifecycle transactions require the current immutable version ID observed during review. If another version becomes current first, the transaction fails and the user must reload before changing lifecycle.

## Account Isolation Correction

The verified base retained shared finance workspace data for one render while the session owner changed. The app now remounts the finance workspace for signed-out, guest, and each remote owner state. Plan list/detail requests also reject superseded results, and Plan-owned state remounts when the owner or selected Plan changes.

## Provider Independence

Saved Plan listing, detail, version history, manual revision, duplication, and lifecycle operations do not call Gemini or the Plan Worker. Provider metadata is displayed only as stored provenance.

## Baseline Correction

The verified `origin/dev` base failed typecheck because the PF-210 saved-state button referenced a missing style and passed unsupported props to the shared `Button`. PF-211 conditionally removes that button after save, matching the intended behavior and restoring typecheck.

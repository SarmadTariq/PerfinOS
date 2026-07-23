# PF-213 Plan Data Inventory

Access date: 2026-07-23

This inventory covers Plan only. It does not claim that the full PerFin OS
privacy inventory is complete.

| Data class | Source and purpose | Boundary and storage | Retention and user control | Verified status |
|---|---|---|---|---|
| Deterministic evidence | Local finance workspace; establishes totals, category pace, recurring load, savings progress, coverage, and a revision | Built on device; bounded aggregate contract is sent to the Worker and provider | Not stored as a separate raw snapshot; bounded evidence summary and revision can be stored in an immutable Plan version | Verified in code and tests |
| Primary goal | User text; defines Plan intent | Sent through Worker to provider; normalized title is stored on the Plan | Stored with the Plan until a supported lifecycle or future deletion path changes it | Verified in code; deletion duration Unknown |
| Constraints and coach text | User text; guides one Plan turn | Sent through Worker to provider; not stored as separate fields in Plan persistence | Client flow lifetime and provider handling apply | Verified in code; provider retention Unknown |
| Session ID | Client-generated UUID; correlates a creation conversation | Sent to Worker and provider request validation; Worker is stateless and does not persist a session record | Client flow lifetime | Verified; server-side user/session binding is not implemented |
| Validated output | Provider-generated structured Plan content | Validated in Worker before returning to client | Transient in Worker; selected content is stored in Plan and version | Verified |
| Saved Plan | Title, dates, currency, lifecycle, current version pointer | Owner-scoped Firestore document | Archive is implemented; direct delete is denied by current rules | Verified |
| Plan versions | Summary, evidence summary, allocations, commitments, recommendations, proposals, provenance, validation | Owner-scoped immutable Firestore subcollection | Append-only; direct update/delete is denied | Verified |
| Action proposal bindings | Type, target, amount, effective month | Stored in immutable Plan version for rule validation | Same as Plan version | Verified |
| Action results | Bounded IDs, selection digest, amount changes, evidence revisions, target/index bindings, status | Owner-scoped immutable Firestore subcollection | Direct update/delete is denied | Verified |
| Action state | Current source version, accepted evidence revision, applied proposal IDs, latest success ID | Owner-scoped mutable Firestore document | Replaced as confirmed actions advance | Verified |
| Operational event | Request ID, route action, outcome, status, duration, body bytes, generic error code | Serialized to Cloudflare Workers Logs; no user text or finance payload | Cloudflare documents 3 days for Free and 7 days for Paid, with a 7-day maximum; actual account plan is Unknown | Code and official docs verified |
| Provider prompt and response | System instructions, bounded user text/evidence, structured response | Gemini Developer API | Paid service and project ZDR status are Unknown; no zero-retention claim is made | Official behavior researched; project setting Unknown |

## Raw Data Boundary

Raw transaction history, merchant names, notes, receipt content, exact
coordinates, full addresses, place identifiers, account numbers, tokens,
provider prompts, and raw model output must not enter Plan logs, saved review
evidence, or action results.

Raw finance data is read locally to calculate deterministic evidence. It is not
part of the Worker evidence schema. User-created category names and coarse area
labels do cross the provider boundary, so PF-213 validation rejects values that
look like contact, credential, account, or street-address data.

## Deletion And Archival

- Plan archive is implemented.
- Plan and version direct deletion is denied by current Firestore rules.
- Deleting a Firestore parent document does not automatically delete its
  subcollections. Any future account-deletion implementation must explicitly
  cover versions and action results.
- Firestore TTL, backup, point-in-time recovery, database location, and account
  deletion automation are Unknown because no console settings were inspected.

## Sources

- [Gemini Developer API zero data retention](https://ai.google.dev/gemini-api/docs/zdr?hl=en)
- [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms)
- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [Delete data from Cloud Firestore](https://firebase.google.com/docs/firestore/manage-data/delete-data)
- [Cloud Firestore locations](https://firebase.google.com/docs/firestore/locations)

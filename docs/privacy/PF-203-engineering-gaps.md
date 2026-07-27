# PF-203 Privacy Engineering Gaps

Status: local findings only. No remote issues were created.

## Release-Blocking Unknowns

- Gemini paid-service and zero-data-retention eligibility/configuration.
- Firebase region, TTL, backups, recovery, staff access, and production
  separation.
- Cloudflare account plan, log retention/access, R2 region, lifecycle, cache,
  and backup behavior.
- Google Places deployed billing/terms context and attribution/storage-policy
  review.
- Legal review for provider terms, jurisdiction, privacy policy, consent,
  retention, deletion commitments, and contact obligations.

## Missing Product Controls

- No verified account-wide Firebase Authentication and Firestore deletion.
- No verified in-app deletion of all guest AsyncStorage data.
- No app call from receipt or transaction deletion to the authenticated R2
  object-delete route.
- No report deletion.
- No hard delete for Plans, versions, proposals, or action results.
- No in-app support or deletion-request contact route.
- No retention or backup status surface backed by deployed configuration.

## Follow-Up Verification

- Confirm that signed-in ownership rules cover every entity and Plan
  subcollection in the deployed project.
- Add an authenticated, auditable account-deletion design that enumerates
  Firestore subcollections and receipt objects.
- Add receipt-object deletion/reconciliation before promising receipt removal.
- Verify Google Places attribution and stored-field policy in every map/search
  presentation.
- Verify logs contain only allowlisted operational fields under forced failure.
- Run legal review separately from product UX and engineering review.

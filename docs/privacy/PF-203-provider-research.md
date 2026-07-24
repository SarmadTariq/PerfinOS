# PF-203 Provider Research

Research date: 2026-07-23

This note records official documentation used to bound engineering claims. It
does not verify the deployed project or replace legal review.

## Google Gemini

Official documentation:

- https://ai.google.dev/gemini-api/docs/zdr
- https://ai.google.dev/gemini-api/docs/billing/
- https://ai.google.dev/gemini-api/terms

The current documentation distinguishes free and paid services and describes
specific conditions for zero-data-retention behavior. The inspected code does
not prove the deployed project's billing tier, retention eligibility, or
console configuration. Those facts remain Unknown and are omitted from
public-facing guarantees.

## Google Places

Official documentation:

- https://developers.google.com/maps/documentation/places/web-service/policies
- https://developers.google.com/maps/documentation/places/web-service/usage-and-billing

The policies restrict caching of Places content, with stated exceptions such
as place identifiers, and require applicable attribution and privacy terms.
The Worker requests a bounded field mask. Deployed billing, regional terms,
attribution review, and stored-result compliance remain Unknown.

## Cloudflare R2

Official documentation:

- https://developers.cloudflare.com/r2/objects/delete-objects/
- https://developers.cloudflare.com/r2/buckets/object-lifecycles/
- https://developers.cloudflare.com/r2/reference/consistency/

R2 supports object deletion and configurable lifecycle rules. The inspected
Worker has an authenticated delete route, but the app has no verified client
workflow that calls it when a receipt or transaction is removed. Deployed
lifecycle rules, cache behavior, bucket region, backup, and retention remain
Unknown.

## Firebase Firestore

Official documentation:

- https://firebase.google.com/docs/firestore/manage-data/delete-data
- https://firebase.google.com/docs/firestore/locations
- https://firebase.google.com/docs/firestore/manage-databases

Firestore supports document, collection, and TTL deletion mechanisms, but
deleting a parent document does not automatically delete subcollections. The
app supports entity-level writes and deletes for selected product records; it
does not implement verified account-wide deletion. Database location,
backups, TTL, recovery, and deployed access settings remain Unknown.

## Review Boundary

Product UX review can confirm that in-app copy matches verified code paths and
labels Unknowns. Legal review must separately assess provider terms, privacy
policy obligations, jurisdiction, consent, retention policy, and deletion
commitments before production release.

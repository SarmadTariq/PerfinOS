# PF-200 Profile And Account Hierarchy

## Editable Personal Information

- display name;
- optional phone.

Name and phone use field-level validation. Currency, income, and budget are
financial preferences owned by Settings, not Profile.

## Read-Only Account Information

- authentication email;
- guest or signed-in workspace state;
- guest or free account tier; and
- workspace creation date.

Email is read-only because the repository has no verified reauthentication and
email-change flow. PF-200 does not imply paid benefits or future subscription
features.

## Plan State

Profile reports only verified entitlement-level Plan availability. It does not
invent a saved Plan count. Opening Plan navigates to the registered Plan tab
and does not create or replace a Plan.

## Utilities

Profile preserves direct access to Categories, Reports, Settings, and Privacy
& Help. More uses the registered Plan destination.

## Logout

Sign out requires explicit confirmation. Signed-in sign out awaits Firebase
sign-out before clearing the local workspace. A failed remote sign-out leaves
the session state available and surfaces the error. Guest exit remains a local
session action.

## Runtime Boundary

PF-200 requires focused and broad automated checks before merge. Manual route
interaction, platform, large-text, keyboard, and screen-reader checks remain
final PF-204 release-gate evidence unless captured separately on this branch.

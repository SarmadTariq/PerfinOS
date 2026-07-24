# PF-202 Category Management

## Ownership And Types

Categories are separated into income and expense groups. Seeded categories are
default categories. Categories created in a workspace are user categories.
Default categories remain available and cannot be renamed, archived, or
deleted from the management screen.

## Historical Meaning

Transactions store both a category identifier and a category-name snapshot.
Renaming a category changes the category definition and future selections; it
does not rewrite existing transaction snapshots.

An active user-created category can be archived. Archived categories are
unavailable for new transactions but remain visible when editing a transaction
that already references one.

The management screen does not expose hard deletion. This finance boundary
cannot prove that a category is absent from saved Plan versions or action
proposals, so archiving is the supported removal behavior.

No broad transaction migration is part of PF-202.

## Budget Relationship

The management screen reports whether a category has:

- a category default monthly budget;
- one or more month-specific budget-map entries; or
- no verified budget relationship.

Archiving does not remove budget-map history or Plan history.

## Product Effects

- Activity and transaction detail retain historical category-name snapshots.
- Add Transaction lists active categories for the selected income or expense
  type.
- Edit Transaction also retains the transaction's selected archived category.
- Dashboard, Reports, and Insights continue to calculate from transaction
  records and category identifiers.
- Budgets continue to use category identifiers for month-specific values.

## Validation

Names are trimmed, must contain visible text, have a bounded length, and must
be unique within the same income or expense type, including archived
categories. Expense monthly budget values must be finite and non-negative.
Income categories do not expose a budget field.

## Runtime Boundary

PF-202 requires focused and broad automated checks before merge. Manual
platform, large-text, keyboard, and screen-reader checks remain runtime
evidence items for the final PF-204 release gate unless captured separately
on this branch.

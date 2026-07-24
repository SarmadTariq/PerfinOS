# PF-199 Insight Hierarchy

## Purpose

Insights is a bounded decision surface for the current Activity period. It
does not diagnose financial risk, predict outcomes, or execute changes.

## Hierarchy

The surface separates:

- observations: descriptive facts from the selected transactions;
- attention items: evidence gaps or threshold comparisons worth reviewing;
- next actions: explicit routes to a supported destination.

Only a small number of current-period items are shown. Each item names its
period, data used, comparison, why it matters, deterministic basis, and
uncertainty.

## Sources

PF-199 signals are deterministic. AI-assisted interpretation is not displayed
because the Insights screen does not call an AI provider.

Reports owns report calculations. Insights consumes current Activity context
and does not duplicate saved-report generation.

## Destinations

Supported next steps are:

- Activity with the current shared filter context;
- Reports;
- Budgets;
- Categories; and
- Plan.

ActivityFilterContext remains mounted across those routes. Opening Plan also
receives a non-persistent review payload that identifies the source insight,
period, frequency, evidence, comparison, and suggested review intent.

Opening Plan only opens the existing Plan workspace. It never starts Plan
creation, activates a plan, archives an active plan, or replaces one.

## Empty, Partial, And Stale States

No tracked transactions produces an empty state rather than advice.
Transactions with missing category references produce a partial-data notice.
A period ending before today is labeled historical; it is not presented as a
current prediction.

## Runtime Boundary

PF-199 requires focused and broad automated checks before merge. Manual route
interaction, platform, large-text, keyboard, and screen-reader checks remain
final PF-204 release-gate evidence unless they are captured separately on
this branch.

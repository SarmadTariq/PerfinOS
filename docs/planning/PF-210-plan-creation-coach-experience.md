# PF-210 Plan Creation and Coach Experience

## Product boundary

PF-210 creates and saves reviewed draft Plans.

It does not:

- activate a Plan
- replace an active Plan
- execute an action proposal
- update a budget
- contribute to savings
- change a recurring commitment
- create or edit a transaction

Those operations require later explicit workflows.

## Creation flow

The production flow contains ten ordered steps:

1. Overview
2. Horizon
3. Financial context
4. Data-use disclosure
5. Primary goal
6. Constraints
7. Coach input
8. Generate
9. Review
10. Save

## Financial evidence

PerFin OS builds the evidence snapshot deterministically before any protected AI request.

The snapshot contains bounded financial aggregates and approved evidence references.

It excludes raw sensitive source fields such as:

- merchant names
- transaction notes
- payment methods
- receipt contents
- coordinates
- full addresses
- place identifiers

## Protected generation

Protected generation requires:

- an authenticated Firebase user
- a Firebase ID token
- a valid Firebase App Check token
- the configured secure Plan Worker URL
- reviewed deterministic evidence
- accepted data-use disclosure
- a primary goal

The client creates a Plan session and then sends one bounded planning turn.

Tokens are sent in headers and are not included in request bodies.

## App Check platform state

Web generation uses Firebase App Check with reCAPTCHA Enterprise when the public site key is configured.

Native iOS and Android generation intentionally fail closed until native App Check providers are configured.

The rest of the Plan flow remains visible so the unsupported-platform state can be explained accurately.

Do not disable or bypass Worker App Check enforcement to make native generation appear functional.

## Generated draft

The Worker returns schema-validated structured output.

The app displays:

- summary
- observations
- allocations
- commitments
- recommendations
- action proposals
- warnings
- evidence references
- model, prompt, and schema provenance

## Manual editing

The user may edit:

- Plan summary
- recommendation titles and descriptions
- action-proposal titles and descriptions

The user may not edit through this screen:

- authoritative evidence
- evidence references
- generated amounts
- proposal types
- proposal target IDs
- proposal dates
- confirmation requirements
- proposal execution state

## Persistence

Saving creates:

- one owner-only FinancialPlan
- status draft
- version count 1
- one immutable initial PlanVersion
- AI generation provenance
- proposal-only action records

Saving does not activate the Plan or execute an action.

## Failure handling

The creation flow preserves completed input during:

- rate limiting
- invalid model output
- request rejection
- Worker outage
- network failure
- missing API configuration
- missing or unsupported App Check
- unavailable authenticated session

No failed request is represented as saved or applied.

## Runtime QA matrix

### Shared

- Plan home opens from the primary Plan destination.
- Create a Plan enters step 1 of 10.
- Back and Continue preserve completed input.
- Progress text and progressbar values match the active step.
- Required steps block advancement.
- Coach input displays its sensitive-data warning.
- Loading state prevents duplicate generation.
- Review shows evidence references.
- Action proposals state that they are proposals only.
- Editing does not expose amount or evidence-reference controls.
- Save remains disabled until review confirmation.
- Saved state offers Plan home and restart actions.
- Restart returns to step 1 with cleared draft state.

### Guest

- Guest can inspect the local creation flow.
- Guest cannot invoke protected generation.
- Guest cannot persist a cloud draft.
- Account-required copy is accurate.

### Web

- Missing API configuration shows unavailable state.
- Missing App Check site key shows unavailable state.
- Configured App Check sends a protected request.
- Narrow widths do not clip controls or horizontal content.
- Browser keyboard navigation reaches all buttons and fields.

### iOS and Android

- The screen renders and scrolls correctly.
- Safe areas and the software keyboard do not block inputs.
- Native App Check limitation is shown.
- No unverified native request is sent.

### Accessibility

- Screen reader announces the screen title.
- Progress exposes step number and percentage.
- Choice chips expose selected state.
- Disclosure control exposes checked state.
- Buttons have meaningful labels.
- Disabled controls are announced as disabled.
- Large text remains readable without clipped actions.
- Light and dark themes preserve readable contrast.

## Verification commands

    npm run typecheck
    npm run build
    npm test
    npm run test:pf206
    npm run test:pf210
    git diff --check

From workers/perfin-api:

    npm run verify:release

Three-platform bundle smoke:

    npx expo export --platform all --output-dir .expo/pf210-platform-smoke

# Transaction Place UI Fix

## Objective

Improve the Place section and persistent save panel in the shared Add/Edit Transaction form without changing transaction data, location services, navigation, or persistence behavior.

## Scope

Modify only:

- `src/views/transactions/TransactionFormView.tsx`

## Place Search State

Before a place is selected, show:

- Place search field
- Up to three search suggestions
- Use my location action
- No map preview
- No Clear action

Selecting a result must:

- Store the selected place
- Clear remote suggestions
- Stop the selected place from immediately appearing again as a suggestion
- Replace the search interface with the selected-place state

## Selected Place State

After a place is selected, show one compact card containing:

- Place icon
- Short place name
- Address limited to two lines
- Change action
- Remove action

Change must:

- Clear the selected place
- Preserve the place name as the search query
- Return to the search interface

Remove must:

- Clear the selected place
- Clear the search query
- Clear remote suggestions
- Preserve the valid No place transaction behavior

## Map Preview

Show the map only when a place is selected.

Reduce the preview height from 220 to approximately 156.

The map remains informational and does not introduce new interaction or navigation behavior.

## Save Panel

On narrow mobile widths:

- Stack validation copy above the action
- Make the Add Transaction or Save Changes button full width
- Preserve safe-area padding
- Preserve keyboard visibility
- Preserve disabled and loading states

On wider screens:

- Keep the existing horizontal layout

## Data and Behavior Guardrails

Do not change:

- Transaction model
- No place compatibility record
- Firebase behavior
- Location service behavior
- Receipt handling
- Category handling
- Add navigation back to Activity
- Edit navigation back to Transaction Detail
- Unsaved-change confirmation
- Duplicate-submission protection

## Verification

Run:

- `npm run typecheck`
- `npm run build`
- `git diff --check`

Runtime review:

- Add Transaction with no place
- Add Transaction with searched place
- Add Transaction using current location
- Edit existing place
- Change selected place
- Remove selected place
- Narrow mobile width
- Keyboard-open state
- Light mode
- Dark mode

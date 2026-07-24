# PF-201 Preference Architecture

## Implemented Controls

- Appearance is an immediate selector persisted to device AsyncStorage by
  ThemeContext.
- Display currency, monthly income, and default monthly budget are edited in
  Settings and persisted through the active finance workspace.
- Profile, Categories, and Privacy & Help are navigation rows.
- `Exit guest workspace` and `Sign out` are destructive actions with
  confirmation.

Each implemented control displays its current value and exposes selected,
loading, success, or failure state where applicable.

## Informational Capabilities

- Push notifications are not implemented. No active-looking toggle is shown.
- Location permission remains point-of-use in transaction and map workflows.
  Settings does not request permission or start location tracking.
- Plan-generation availability reflects guest state and current entitlement.
  Provider readiness is verified at request time, not claimed in Settings.
- Monthly Reports remain deterministic. Settings does not activate AI report
  interpretation.

## Guest And Signed-In Differences

Guest workspace copy states that data is local and unsynced. Signed-in copy
describes the active account workspace without claiming external console
settings.

## Runtime Boundary

PF-201 covers Settings hierarchy, preference persistence entry points, validation,
route wiring, and focused tests. Cumulative privacy/release acceptance remains
blocked on PF-204.

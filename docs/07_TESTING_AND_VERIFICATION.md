# Testing And Verification

## Automated Checks

```bash
npm run typecheck
npm run build
npm run audit:prod
```

## Manual QA Scenarios

- Logo animation routes unauthenticated users to Login.
- Continue as Guest creates a local-only workspace.
- Guest can use basic expense, budget, goal, map, analytics, and report flows.
- Guest cannot use AI, receipts, cloud sync, or account recovery.
- Signup/login can import guest data.
- Amount fields reject letters and invalid decimal formats.
- Expense save requires category, amount, merchant/source, date, payment method, and selected place.
- Receipt picker enforces 5 images and 5 MB per image.
- Missing Worker/Google/Gemini keys show safe placeholder states.
- Map heatmap is colorful and pins show place name plus amount.

## Remaining Test Work

- Add unit tests for validators, analytics, and persistence routing.
- Add screen smoke tests for guest/auth/import flows.
- Add Worker endpoint tests once real signing logic is implemented.

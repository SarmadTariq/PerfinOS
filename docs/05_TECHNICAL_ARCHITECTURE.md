# Technical Architecture

## App Architecture

`App.tsx` wraps `AppNavigator` with `FinanceProvider`. `AppNavigator` owns the splash animation, unauthenticated auth stack, onboarding gate, main stack, and bottom tabs.

## State And Persistence

`FinanceProvider` is the mutation boundary:

- Guest users persist to AsyncStorage through `localFinanceStore`.
- Authenticated users sync to Firestore through `firebaseService`.
- Feature gates come from `UserPlan` entitlement metadata.
- Guest data can be imported into an authenticated workspace.

## Service Layer

- `initialData.ts`: empty workspace creation and default categories.
- `financeAnalytics.ts`: summaries, breakdowns, insights, reports, filtering, and grouping.
- `locationService.ts`: current location and Places proxy/fallback search.
- `receiptService.ts`: local receipt metadata and backend configuration checks.
- `aiService.ts`: aggregate-only AI report proxy with rule-based fallback.
- `config.ts`: public placeholder configuration.

## Backend Proxy

`workers/perfin-api` contains Cloudflare Worker placeholder endpoints for:

- R2 receipt signed URLs.
- Google Places proxy.
- Gemini AI proxy.

Secrets must live in Cloudflare Worker secrets or local `.dev.vars`, never in committed Expo code.

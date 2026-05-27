# PerFin OS

PerFin OS is an Expo React Native personal finance operating system for expense tracking, budgeting, receipt organization, location-aware spending maps, and educational planning insights.

## Overview

PerFin OS v1.0.0 is moving from a production product into a production-ready foundation. The app now uses a login-first flow, supports a local-only guest workspace, and reserves cloud sync, receipt uploads, account recovery, and AI planning for authenticated users.

The product does not connect to bank accounts, process payments, or provide legal, tax, banking, or investment advice.

## Core Flows

| Flow | Behavior |
| --- | --- |
| App launch | Animated logo splash routes unauthenticated users to Login |
| Guest mode | Local-only workspace for basic expenses, budgets, maps, goals, analytics, and reports |
| Account mode | Firebase Auth + Firestore workspace with cloud sync and account recovery |
| Guest upgrade | Login/signup can import local guest data into the authenticated workspace |
| Add/edit expense | Numeric amount guards, required category/date/merchant/payment method, place-based location selection |
| Maps | Google Places-ready search adapter, current-location default, colorful heatmap, category pins with location name and amount |
| Receipts | Authenticated-only multi-image receipt placeholders, up to 5 images per expense, 5 MB/image guard |
| AI | Authenticated-only AI Reports + Planner Chat using aggregate-only data with rule-based fallback |

## Tech Stack

| Layer | Tools |
| --- | --- |
| App | Expo 54, React 19, React Native 0.81, TypeScript |
| Navigation | React Navigation stack + bottom tabs |
| State | React Context with centralized guards and persistence routing |
| Local storage | AsyncStorage for guest workspace only |
| Auth/data | Firebase Auth and Firestore |
| Maps/location | Expo Location, React Native Maps, Google Places proxy placeholder |
| Receipts | Expo Image Picker, Cloudflare R2 via Worker placeholder |
| AI | Gemini-compatible Worker proxy with deterministic fallback |
| Backend proxy | Cloudflare Worker in `workers/perfin-api` |

## Architecture

```text
App.tsx
  FinanceProvider
    AppNavigator
      SplashGate
      AuthStack
      Onboarding
      MainStack / Tabs
```

Key boundaries:

- `src/context/FinanceContext.tsx` routes guest writes to local storage and authenticated writes to Firestore.
- `src/services/initialData.ts` creates empty PerFin OS workspaces and default categories without seeded transaction data.
- `src/utils/validation.ts` centralizes money, location, receipt, and transaction guards.
- `src/services/locationService.ts` uses the Worker Places endpoint when configured and Expo geocoding as a safe fallback.
- `src/services/aiService.ts` sends aggregate-only payloads when configured and otherwise returns rule-based planner output.
- `workers/perfin-api` contains placeholder Worker endpoints for Places, receipts, and AI proxying.

## Data Model

The main finance model is in `src/models/finance.ts`.

| Model | Purpose |
| --- | --- |
| `User` | Profile, currency, income, and monthly budget |
| `UserPlan` | Guest/free/premium-placeholder entitlement metadata |
| `Transaction` | Income/expense record with amount, category, merchant/source, payment method, location, and receipts |
| `ExpenseLocation` | Place ID, display name, formatted address, coordinates, source, and place type |
| `ReceiptAttachment` | Receipt image metadata and upload status |
| `Budget` | Monthly total/category budget data |
| `SavingsGoal` | Goal target, current amount, and target date |
| `Report` | Monthly report output |

## Setup

```bash
npm install
```

Run locally:

```bash
npm run start
```

Run web:

```bash
npm run web
```

Validate:

```bash
npm run typecheck
npm run build
npm run audit:prod
```


Committed files must use placeholders only:

```text
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_PERFIN_API_BASE_URL=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Cloudflare/Gemini secrets belong in Cloudflare Worker secrets or local `.dev.vars`, not in the Expo app:

```text
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
GEMINI_API_KEY=
GOOGLE_PLACES_API_KEY=
FIREBASE_PROJECT_ID=
```

## Production Safety Notes

- Do not commit `.env`, `.dev.vars`, Firebase private keys, R2 credentials, Gemini keys, Google server keys, or signing files.
- Restrict Google Maps/Places keys by platform, bundle ID, SHA, referrer, API, and quota.
- Keep receipts behind authenticated Worker routes.
- Guest data is local-only and should be imported explicitly before account sync.
- AI features send aggregate-only finance data and fall back to deterministic rules when unconfigured.

## Screenshots And Demo

Screenshots will be added after final UI capture/export.

Planned paths:

```text
docs/screenshots/login.png
docs/screenshots/dashboard.png
docs/screenshots/add-expense.png
docs/screenshots/expense-map.png
docs/screenshots/ai-reports.png
docs/demo/perfin-os-demo.mp4
```

## Known Limitations

- Worker receipt signed URL endpoints are placeholders until Cloudflare R2 credentials are configured.
- Gemini and Google Places calls require keys configured outside committed source.
- Guest users cannot use cloud sync, receipt uploads, account recovery, or AI features.
- Automated unit/e2e tests are still planned.
- PerFin OS v1.0.0 includes freemium metadata only; no payment or pricing UI is included.

## Roadmap

- Complete R2 signed upload/download/delete implementation.
- Add Firebase ID token verification in the Worker.
- Add AI planner chat UI beyond report generation.
- Add unit tests for validation, analytics, and persistence.
- Add smoke tests for guest, auth, receipts, maps, and AI fallback.
- Add PerFin OS v2.0 freemium upgrade screens and payment integration.

## Author

Built by Yash Kanadhia.

## License

MIT License. See `LICENSE`.

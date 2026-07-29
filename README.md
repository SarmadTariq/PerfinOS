# PerFin OS

PerFin OS is a location-aware personal finance application that helps people capture financial activity, understand spending patterns, and turn evidence into practical plans.

Built with Expo, React Native, TypeScript, Firebase, and Cloudflare Workers, the product connects transaction tracking, reports, insights, planning, and confirmed financial actions in one mobile-first experience.

## Product vision

Personal finance tools often separate tracking, analysis, and planning into disconnected workflows. PerFin OS brings them together through one clear loop:

**Activity → Reports → Insights → Plan → Actions**

The goal is to help users understand what happened, why it matters, and what to do next.

## Core capabilities

- Record and review income and expenses
- Categorize transactions and manage recurring expenses
- Track budgets and savings goals
- Explore financial activity through list and location-aware views
- Review reports, analytics, and structured insights
- Create and review financial plans
- Confirm plan actions before they affect user data
- Attach receipt or payment images to transactions
- Support guest and authenticated user experiences
- Manage profile, settings, privacy, and account preferences

## Location-aware finance

Location is treated as optional financial context, not as a requirement.

When enabled, PerFin OS can associate transactions with places, support map-based review, and help users understand spending patterns across merchants, areas, and routines. The product is designed to keep location use visible, purposeful, and under user control.

## Product architecture

PerFin OS uses a modular application structure that separates presentation, state, data access, cloud services, and domain logic.

```text
Mobile and Web Application
        │
        ├── Views and reusable UI components
        ├── View models and application contexts
        ├── Finance, reporting, insight, and planning modules
        ├── Local and remote repositories
        │
        ├── Firebase
        │   ├── Authentication
        │   ├── Firestore persistence
        │   └── Application integrity controls
        │
        └── Cloudflare Worker API
            ├── Planning workflows
            ├── Receipt operations
            ├── Request validation
            └── Rate limiting and provider boundaries
```

## Technology stack

| Area | Technology |
|---|---|
| Application | Expo, React Native, React |
| Language | TypeScript |
| Navigation | React Navigation |
| Authentication and data | Firebase Authentication, Cloud Firestore |
| Local persistence | AsyncStorage and repository abstractions |
| Maps and location | Expo Location, React Native Maps |
| Server-side API | Cloudflare Workers |
| Object storage | Cloudflare R2 |
| Build and release | Expo Application Services |

## Repository structure

```text
.
├── assets/                 Application icons and public media assets
├── src/
│   ├── components/         Shared UI and domain components
│   ├── context/            Session, theme, activity, and finance state
│   ├── hooks/              Reusable application hooks
│   ├── insights/           Insight hierarchy and supporting logic
│   ├── models/             Finance and planning domain models
│   ├── navigation/         Application navigation
│   ├── planning/           Plan creation, review, evidence, and actions
│   ├── reporting/          Period and report generation logic
│   ├── repositories/       Local, Firebase, and analytics repositories
│   ├── services/           Firebase, location, receipt, and plan services
│   ├── theme/              Design tokens and visual foundations
│   ├── viewmodels/         Screen-facing application logic
│   └── views/              Product screens and flows
├── workers/perfin-api/     Cloudflare Worker API
├── firestore.rules         Firestore security rules
└── package.json            Application scripts and dependencies
```

## Getting started

### Prerequisites

- Node.js
- npm
- Expo-compatible development environment
- Firebase project access for authenticated and remote-data workflows
- Cloudflare access for Worker and receipt-service development

### Install the application

```bash
npm ci
```

### Configure local environment values

Create local environment files from the supplied examples:

```bash
cp .env.example .env
cp workers/perfin-api/.dev.vars.example workers/perfin-api/.dev.vars
```

Provide only the values required for the environment you are running. Never commit local environment files, credentials, service-account files, signing keys, or platform configuration secrets.

### Run the application

```bash
npm start
```

Platform-specific commands:

```bash
npm run ios
npm run android
npm run web
```

### Install Worker dependencies

```bash
npm ci --prefix workers/perfin-api
```

## Verification

Run the application release checks:

```bash
npx expo install --check
npx expo-doctor
npm run typecheck:strict
npm run build
npm audit --omit=dev
```

Run the Worker release checks:

```bash
npm --prefix workers/perfin-api run verify:release
npm --prefix workers/perfin-api audit
```

A change should not be considered release-ready until the relevant automated checks pass and the affected user flows have been reviewed on their target platforms.

## Privacy and security

PerFin OS handles financial and location-related information, so privacy and security are product requirements rather than optional additions.

The repository is structured around these principles:

- User-scoped access to authenticated data
- Explicit permission for location and media access
- Separation between client code and server-side provider operations
- Validation before plan actions modify financial data
- Restricted handling of receipts and uploaded objects
- Environment files and credentials excluded from version control
- Security rules and application checks reviewed alongside feature changes

PerFin OS provides financial organization and educational planning support. It does not provide regulated financial, tax, legal, or investment advice.

## Development workflow

- `main` represents the protected release line
- `dev` is the integration branch
- Focused branches are used for upgrades, features, fixes, security work, and release preparation
- Pull requests should target `dev` unless they are part of an approved release or hotfix process
- Each pull request should include its scope, verification evidence, risks, and any remaining manual checks

## Project status

PerFin OS is under active development and release preparation. The repository includes the core product surfaces, data layer, planning system, cloud API, and release configuration. Production releases require successful automated checks, native build validation, platform testing, privacy review, and controlled approval.

## Contributors

- **Yash Kanadhia** — Product direction, product design, UX systems, and engineering
- **Sarmad Tariq** — Backend engineering and data architecture
- **Alexis** — Frontend engineering and product implementation

Additional contributions should be credited through the repository history and pull requests.

## License

See [`LICENSE`](LICENSE) for repository licensing terms.

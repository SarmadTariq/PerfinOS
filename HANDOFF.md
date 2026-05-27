# PERFIN — Session Handoff

**Trigger word:** Say `PERFIN` to activate this context in a new Claude session.

When activated, read this file top to bottom before doing anything. Do not ask clarifying questions until you have read it fully. This file is the source of truth for session continuity.

---

## Project Identity

| Field | Value |
|-------|-------|
| App name | PerFin OS |
| Previous name | SpendSight |
| Type | Expo React Native personal finance OS |
| Local path | `/Users/yashkanadhia/Documents/Dev-Projects/REACT/PerFin OS` |
| GitHub | https://github.com/kanadhiayash/perfin-os |
| Branch | `main` |
| Version | 1.0.0 |
| Status | Fully built, committed, pushed, verified running |

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | Expo 54, React Native 0.81, React 19 |
| Language | TypeScript (strict) |
| Navigation | React Navigation — stack + bottom tabs |
| State | React Context (`FinanceContext`) |
| Local storage | AsyncStorage (guest mode only) |
| Auth / cloud data | Firebase Auth + Firestore (placeholder — needs real keys) |
| Maps | Expo Location + React Native Maps + Google Places proxy (placeholder) |
| Receipts | Expo Image Picker + Cloudflare R2 via Worker (placeholder) |
| AI | Gemini-compatible Cloudflare Worker proxy with deterministic fallback |
| Backend | Cloudflare Worker in `workers/perfin-api/` |
| Build | `npx expo export --platform web --output-dir dist` |
| Type check | `npm run typecheck` |

---

## App Architecture

```
SafeAreaProvider                     ← react-native-safe-area-context
  FinanceProvider (FinanceContext)   ← guest/auth routing, AsyncStorage, Firestore
    AppNavigator
      SplashGate (animated logo)
        AuthStack                    ← Login, Signup, ForgotPassword, NotFound
        OnboardingScreen             ← shown after first guest/auth login if !data.onboarded
        MainStack
          Tabs (bottom nav)
            Dashboard  (Home)
            Transactions  (Activity)
            Map
            Insights
            More
          AddTransaction
          EditTransaction
          TransactionDetail
          Budgets
          Categories
          SavingsGoals
          Analytics
          RecurringExpenses
          Reports
          Settings
          Profile
          HelpAbout
          NotFound
```

**Key invariant:** `SafeAreaProvider` MUST wrap everything at the root of `App.tsx`. Without it, the entire app renders blank after auth. This was a bug found and fixed in the last session.

---

## Session Summary (2026-05-19, continued — Claude Code)

### Demo Seed Data Added

- `src/services/initialData.ts` — added `createDemoAppData()`: 33 transactions across current + last month, budgets for both months, 2 savings goals (Emergency Fund, MacBook Pro M4), `onboarded: true` so guest bypasses onboarding
- `src/services/localFinanceStore.ts` — first-time guest now initialises with `createDemoAppData()` instead of empty state
- Commit: `6c282f8` — `feat: add demo seed data for guest mode — 33 transactions across 2 months`
- Verified in browser: Dashboard shows INCOME CA$5,200 | EXPENSES CA$1,869 | BUDGET USED 58% healthy | SAVINGS 39% / CA$5,040 | Top Categories Housing + Food | Map heatmap populated

---

## Session Summary (2026-05-19, original — Codex)

### What Was Built (Codex upgrade — SpendSight → PerFin OS)

| Layer | Before | After |
|-------|--------|-------|
| Data model | `Expense.ts`, `User.ts` (thin) | `src/models/finance.ts` — User, Transaction, Category, Budget, SavingsGoal, Insight, RecurringExpense, Report |
| State | Per-screen local state | `src/context/FinanceContext.tsx` — guest/auth routing, AsyncStorage, Firestore, feature gates |
| Screens | 8 basic SpendSight screens | `src/screens/PerFinOSScreens.tsx` — 21 screens |
| UI kit | Basic Button/Card/Input/Text | `src/components/PerFinOSUI.tsx` — StatCard, ChartCard, BarListChart, MetricGrid, ProgressBar, ScreenHeader, CategoryBadge, EmptyState, LoadingState, ErrorState, ConfirmModal, Toast, IconButton |
| Services | `expenseService.ts` only | `financeAnalytics.ts`, `aiService.ts`, `localFinanceStore.ts`, `receiptService.ts`, `config.ts`, `initialData.ts` |
| Backend | None | `workers/perfin-api/` — Cloudflare Worker |
| Docs | 3 SpendSight docs | 9 PerFin OS docs in `docs/` |

### What Was Done in This Session

1. Confirmed Codex upgrade code was complete but uncommitted
2. Ran `npm run typecheck` — 0 errors
3. Reset staging, deleted superseded SpendSight files, committed in 3 structured commits:
   - `eb2a904` — `feat: add PerFin OS finance data model and guest persistence`
   - `888045d` — `feat: build PerFin OS screen system, analytics flows, and navigation`
   - `bd1cd66` — `docs: add PerFin OS audit, architecture, accessibility, and README package`
   - `8b9a321` — `chore: ignore .claude/ directory`
4. Created GitHub repo `https://github.com/kanadhiayash/perfin-os` via API and pushed all commits
5. Built Expo web export (`npm run build`) — succeeded
6. Ran app with Playwright + headless Chrome
7. **Found and fixed bug:** `SafeAreaProvider` missing from `App.tsx` — entire app rendered blank after guest login
8. Verified screens working: Login ✅, Onboarding ✅ (with validation), Dashboard ✅, Transactions ✅, Insights ✅, More hub ✅

---

## Uncommitted Changes (commit these first)

Two files are modified locally but not yet committed:

### 1. `App.tsx` — SafeAreaProvider bug fix

```tsx
// BEFORE (broken — blank screen after auth)
import AppNavigator from './src/navigation/AppNavigator';
import { FinanceProvider } from './src/context/FinanceContext';

export default function App() {
  return (
    <FinanceProvider>
      <AppNavigator />
    </FinanceProvider>
  );
}

// AFTER (fixed)
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { FinanceProvider } from './src/context/FinanceContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <FinanceProvider>
        <AppNavigator />
      </FinanceProvider>
    </SafeAreaProvider>
  );
}
```

### 2. `src/screens/PerFinOSScreens.tsx` — Onboarding improvements

- Currency field upgraded from free-text `Field` to `SelectField` with dropdown options: `['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'INR', 'JPY']`
- Income and budget fields now pipe through `sanitizeMoneyInput()` on change

**Commit command:**
```bash
cd "/Users/yashkanadhia/Documents/Dev-Projects/REACT/PerFin OS"
git add App.tsx src/screens/PerFinOSScreens.tsx
git commit -m "fix: add SafeAreaProvider to root and improve onboarding form"
git push origin main
```

---

## Key File Paths

| File | Purpose |
|------|---------|
| `App.tsx` | Root — SafeAreaProvider + FinanceProvider + AppNavigator |
| `src/navigation/AppNavigator.tsx` | SplashGate, AuthStack, OnboardingGate, MainStack, Tabs |
| `src/context/FinanceContext.tsx` | All state, guest/auth routing, persistence |
| `src/models/finance.ts` | Full data model types |
| `src/screens/PerFinOSScreens.tsx` | All 21 screens (2130+ lines) |
| `src/components/PerFinOSUI.tsx` | Full UI kit (539 lines) |
| `src/components/ExpenseNativeMap.tsx` | Map with heatmap + category pins |
| `src/services/financeAnalytics.ts` | Analytics engine — summaries, insights, reports |
| `src/services/localFinanceStore.ts` | AsyncStorage persistence for guest mode |
| `src/services/aiService.ts` | AI proxy with deterministic fallback |
| `src/services/config.ts` | Safe placeholder config |
| `src/utils/validation.ts` | Input guards — `parseMoney`, `sanitizeMoneyInput`, receipt limits |
| `src/utils/format.ts` | `formatCurrency`, `getMonthKey`, `readableMonth`, `todayIso` |
| `src/theme.ts` | `Colors`, `Radius`, `Spacing` design tokens |
| `workers/perfin-api/src/index.ts` | Cloudflare Worker endpoints |
| `docs/` | 9 PerFin OS docs — audit, brief, architecture, case study, etc. |
| `ZEREFOS.md` | Zeref OS kernel at project root |

---

## Git Log (full)

```
8b9a321  chore: ignore .claude/ directory
bd1cd66  docs: add PerFin OS audit, architecture, accessibility, and README package
888045d  feat: build PerFin OS screen system, analytics flows, and navigation
eb2a904  feat: add PerFin OS finance data model and guest persistence
1706d0a  docs: add FAANG-level portfolio README
4bba01f  Initial commit
```

---

## How to Run

```bash
# Navigate to project
cd "/Users/yashkanadhia/Documents/Dev-Projects/REACT/PerFin OS"

# Type check
npm run typecheck

# Build web export
npm run build        # outputs to dist/

# Serve locally (for Playwright or browser review)
python3 -m http.server 8765 --directory dist &
# then open http://localhost:8765 in browser

# Start Expo dev server (for live reload on device/simulator)
npm start

# iOS simulator
npm run ios

# Android emulator
npm run android
```

---

## Guest App Flow (verified working)

1. App launches → animated PerFin OS logo splash (420ms fade in, 360ms hold, 260ms fade out)
2. Splash completes → Login screen
3. Tap "Continue as Guest" → Onboarding screen
4. Fill Name, select Currency (dropdown), enter Monthly Income + Budget → tap "Finish Setup"
5. Validation: income must be > 0, budget must be > 0 — shows inline error if not
6. After valid submit → Dashboard with hero panel, 4 stat cards, Add Transaction CTA
7. Bottom nav: Home (Dashboard), Activity (Transactions), Map, Insights, More
8. More hub → 10 tiles: Map, Budgets, Categories, Savings Goals, Analytics, Recurring Expenses, Reports, Profile, Settings, Help/About

---

## Next Steps Queue

### Immediate — ready now
- [x] Commit App.tsx + PerFinOSScreens.tsx (done — `be8332a`)
- [x] Add demo seed data (done — `6c282f8`)
- [ ] Capture README screenshots — Login, Dashboard (populated), Transactions, More hub at 390×844
- [ ] Add Transaction flow — add a transaction, verify it appears on Dashboard stat cards and Transactions list

### Medium Priority
- [ ] Budgets screen — add a budget and verify progress bar updates
- [ ] Savings Goals screen — add a goal, verify progress
- [ ] Analytics screen — verify charts render with seed data
- [ ] Reports screen — generate a monthly report

### Future / Requires External Keys
- [ ] Map screen — needs Google Places API key (currently shows placeholder)
- [ ] AI Reports + Planner — needs Cloudflare Worker deployed + Gemini API key
- [ ] Firebase Auth — needs real Firebase project config in `.env`
- [ ] Receipt uploads — needs Cloudflare R2 bucket + Worker secrets
- [ ] Native date picker — currently using text field
- [ ] Automated tests — unit (validators, analytics), smoke (guest flow), a11y (VoiceOver/TalkBack)

---

## Separate In-Progress Task (different repo)

**Zeref Skills Fleet v2.0.0 → v2.1.0 upgrade** is a separate pending task in a different repo:
- Local repo: `/Users/yashkanadhia/Documents/Claude/99_ZEREF/zeref-skills-fleet 2/`
- Target: sync local repo from 112 skills → 102 skills matching installed plugin cache at `/Users/yashkanadhia/.claude/plugins/cache/zeref-skills/zeref-skills-fleet/2.1.0/`
- Status: planned but not executed — user interrupted before execution

---

## Placeholder Integrations (safe without keys)

All missing integrations show locked/fallback/placeholder states — the app does NOT crash without keys.

| Integration | Placeholder behavior |
|-------------|---------------------|
| Firebase | Auth forms show "configuration needed" |
| Google Maps/Places | Map shows static placeholder |
| Cloudflare Worker | AI + receipt endpoints return rule-based fallback |
| Gemini | AI Planner uses deterministic response generator |

Required keys when ready: Firebase Expo config, Cloudflare Worker API URL, Cloudflare R2 bucket + credentials, Gemini API key (stored as Worker secret), Google Maps/Places keys with quota restrictions.

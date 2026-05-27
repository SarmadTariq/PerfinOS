# Changelog

All notable changes to this project are documented here.

---

## [1.0.0] — 2026-05-19

### PerFin OS — Production Release

This release marks the full redesign and rebuild of the original SpendSight v0.1 prototype into PerFin OS, a production-quality personal finance operating system for iOS/Android/Web built on Expo 54 + React Native 0.81.

### Added

- **Full navigation system** — React Navigation stack + bottom tabs (Dashboard, Activity, Map, Insights, More/Profile)
- **Finance data model** — `Transaction`, `Budget`, `SavingsGoal`, `Category`, `RecurringExpense`, `UserPlan`, `AppData` types with full TypeScript coverage
- **FinanceContext** — React Context + AsyncStorage persistence for guest and authenticated users
- **Guest mode with demo data** — realistic Toronto-based seed transactions (33 entries, 2 months) so first launch shows a populated dashboard
- **Dashboard screen** — stat cards (income, expenses, budget, savings), top-category bar chart, recent transactions list, budget health card
- **Activity screen** — full transaction list with month/category filter, search, add/edit/delete flows
- **Map screen** — expense heat map with neighborhood clustering and category filter
- **Insights screen** — spending trend chart, category breakdown, month-over-month comparison, AI Reports gate (feature flag)
- **More/Profile screen** — account info, plan entitlements, savings goals, settings, sign-out
- **Onboarding flow** — multi-step form (name, income, budget, categories) with skip-to-demo option
- **Add/Edit Transaction sheet** — merchant, amount, category, date, payment method, notes, location fields
- **Category management** — create, edit, delete custom categories with icon + color picker
- **Budget management** — per-category and total budget editing
- **Savings Goals** — create and track progress toward named goals
- **Design system** — `theme.ts` (Colors, Spacing, Radius, Shadows, Typography), `PerFinOSUI.tsx` component library (StatCard, ChartCard, CategoryBadge, ProgressBar, BarListChart, EmptyState, LoadingState, ErrorState, ConfirmModal, Toast, IconButton)
- **Accessibility** — `accessibilityRole`, `accessibilityLabel` on all interactive elements; `adjustsFontSizeToFit` on stat values
- **Dark mode** — full dark palette across all screens and components

### Changed (from SpendSight v0.1)

- **Architecture** — from single-file prototype to multi-screen modular structure
- **Color system** — iOS-native semantic palette (primary `#007AFF`, success `#34C759`, danger `#FF3B30`, warning `#FF9500`) replacing monochrome grayscale
- **Icon system** — MaterialCommunityIcons for category icons, MaterialIcons for UI chrome, Ionicons for navigation tabs
- **State management** — from local component state to `FinanceContext` with AsyncStorage persistence
- **Data model** — from ad-hoc objects to fully typed finance models with `userId`, `createdAt`, `updatedAt` fields
- **Navigation** — from placeholder screens to full React Navigation stack with auth-gated routing
- **Onboarding** — from single screen to multi-step wizard with validation and skip-to-demo

### Removed

- SpendSight v0.1 prototype screens (HomeScreen, LoginScreen, mock data)
- FontAwesome icon dependency (replaced by MaterialIcons + MaterialCommunityIcons)
- Static hardcoded category list (replaced by user-editable categories with defaults)

---

## [0.1.0] — 2025-01-01

### SpendSight v0.1 — Initial Prototype

- Basic Expo + React Native scaffold
- Login screen, Home screen with static expense list
- Prototype color theme and typography
- MaterialCommunityIcons + MaterialIcons + FontAwesome icon setup
- No persistent state, no navigation, no data model

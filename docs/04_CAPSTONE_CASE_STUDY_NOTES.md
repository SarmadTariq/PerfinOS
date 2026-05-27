# Capstone Case Study Notes

## Problem
Users can lose visibility into everyday spending because purchases, income, subscriptions, budgets, and goals are mentally tracked in separate places.

## Users
Students, early-career professionals, and budget-conscious users who need simple financial visibility.

## Product Goal
Create a polished, usable personal finance analytics product that makes spending behavior easier to understand.

## Research Assumptions
Users want fast scanning, clear categories, budget status, subscription awareness, and progress feedback without a complex banking setup.

## UX Decisions
- Dashboard first for quick status.
- Bottom tabs for core workflows.
- More hub for secondary screens.
- Text-supported charts for accessibility and production explanation.
- Local guest workspace data to remove backend setup friction.

## Information Architecture
Auth/demo entry, onboarding, dashboard, transactions, budgets, insights, and a More hub containing categories, savings goals, analytics, recurring expenses, reports, settings, profile, and help/about.

## Feature List
Guest auth, transaction CRUD, categories, budgets, savings goals, recurring detection, insights, analytics charts, monthly reports, settings, profile, empty/loading/error states.

## Data Model
Defined in `src/models/finance.ts` with User, Transaction, Category, Budget, SavingsGoal, Insight, RecurringExpense, and Report.

## Automation Logic
Service functions calculate summaries, category breakdowns, budget health, savings progress, insights, recurring expenses, reports, filtering, sorting, and time grouping.

## Technical Architecture
Expo React Native, TypeScript, React Navigation, AsyncStorage, `FinanceContext`, service-layer analytics, shared UI components.

## Accessibility Decisions
Named buttons, labeled fields, readable chart summaries, non-color-only status, semantic state components, and clear validation errors.

## Future Roadmap
Production auth, backend sync, exportable PDF reports, richer native charts, date picker, automated tests, and screenshot assets.

## What Makes This Capstone-Level
PerFin OS combines product brief, IA, data modeling, service-layer automation, UX system components, CRUD, charts, accessibility, security posture, and technical documentation.

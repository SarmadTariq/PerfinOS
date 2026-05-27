/**
 * Repository barrel — data access layer for PerFin OS.
 *
 * All data reads/writes flow through these modules:
 * - `AnalyticsRepository` — pure financial calculation functions
 * - `LocalRepository`     — AsyncStorage (guest / offline mode)
 * - `FirebaseRepository`  — Firestore CRUD (authenticated users)
 *
 * @example
 * import { calculateMonthlySummary, loadGuestAppData } from '../../repositories';
 */
export * from './AnalyticsRepository';
export * from './LocalRepository';
export * from './FirebaseRepository';

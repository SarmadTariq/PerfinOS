/**
 * ViewModel barrel — Phase 1 priority ViewModels.
 *
 * These hooks extract the most complex state and derivation logic from their
 * respective screens. Screens can still call `useFinance()` directly for
 * simple CRUD operations — full extraction happens in Phase 2.
 *
 * @example
 * import { useDashboardViewModel } from '../../viewmodels';
 */
export { useDashboardViewModel } from './useDashboardViewModel';
export { useTransactionViewModel } from './useTransactionViewModel';
export { useMapViewModel } from './useMapViewModel';
export { useReportsViewModel } from './useReportsViewModel';

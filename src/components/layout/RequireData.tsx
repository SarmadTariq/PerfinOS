import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { AppData } from '../../models/finance';
import { ErrorState } from '../finance/ErrorState';
import { LoadingState } from '../finance/LoadingState';

/**
 * Auth and data gate for protected screens.
 * Renders a loading spinner while data is fetching,
 * an error state if load failed, or calls `children(data)` once data is ready.
 *
 * @param children - Render-prop receiving the loaded AppData
 */
export const RequireData = ({ children }: { children: (data: AppData) => React.ReactNode }) => {
  const { data, status, error, logout } = useFinance();

  if (status === 'loading') return <LoadingState />;
  if (status === 'error' || !data) {
    return <ErrorState message={error || 'PerFin OS could not load data.'} onRetry={logout} />;
  }

  return <>{children(data)}</>;
};

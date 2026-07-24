export const FINANCE_WORKSPACE_SOURCES = [
  'profile',
  'preferences',
  'entitlement',
  'workspaceMeta',
  'migration',
  'transactions',
  'categories',
  'budgets',
  'savingsGoals',
  'recurringExpenses',
  'reports',
] as const;

export type FinanceWorkspaceSource =
  typeof FINANCE_WORKSPACE_SOURCES[number];

export const createWorkspaceSubscriptionBarrier = () => {
  const ready =
    new Set<FinanceWorkspaceSource>();

  return {
    markReady: (
      source: FinanceWorkspaceSource
    ) => {
      ready.add(source);
      return (
        ready.size ===
        FINANCE_WORKSPACE_SOURCES.length
      );
    },
    isReady: () =>
      ready.size ===
      FINANCE_WORKSPACE_SOURCES.length,
  };
};

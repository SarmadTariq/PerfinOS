export const financeWorkspaceOwnershipKey =
  ({
    remoteUserId,
    isAuthenticated,
    isGuestSession,
  }: {
    remoteUserId: string | null;
    isAuthenticated: boolean;
    isGuestSession: boolean;
  }): string => {
    if (remoteUserId) {
      return `finance-owner:remote:${remoteUserId}`;
    }

    if (isGuestSession) {
      return 'finance-owner:guest';
    }

    return isAuthenticated
      ? 'finance-owner:local-auth'
      : 'finance-owner:signed-out';
  };

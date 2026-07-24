export interface FinanceWorkspaceHydrationToken {
  ownerKey: string;
  epoch: number;
}

export const createFinanceWorkspaceHydrationEpoch = (
  initialOwnerKey = ''
) => {
  let ownerKey = initialOwnerKey;
  let epoch = 0;

  return {
    begin: (
      nextOwnerKey: string
    ): FinanceWorkspaceHydrationToken => {
      ownerKey = nextOwnerKey;
      epoch += 1;
      return {
        ownerKey,
        epoch,
      };
    },
    isCurrent: (
      token: FinanceWorkspaceHydrationToken
    ) =>
      token.ownerKey === ownerKey &&
      token.epoch === epoch,
    invalidate: (
      token: FinanceWorkspaceHydrationToken
    ) => {
      if (
        token.ownerKey === ownerKey &&
        token.epoch === epoch
      ) {
        epoch += 1;
      }
    },
  };
};

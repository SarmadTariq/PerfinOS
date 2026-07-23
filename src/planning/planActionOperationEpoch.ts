export interface PlanActionOperationToken {
  ownerKey: string;
  epoch: number;
}

export interface PlanActionOperationEpoch {
  move: (ownerKey: string) => void;
  begin: () => PlanActionOperationToken;
  isCurrent: (token: PlanActionOperationToken) => boolean;
}

export const planActionOwnerKey = (
  userId: string,
  planId: string,
  versionId: string
): string => `${userId}:${planId}:${versionId}`;

export const createPlanActionOperationEpoch = (
  initialOwnerKey: string
): PlanActionOperationEpoch => {
  let ownerKey = initialOwnerKey;
  let epoch = 0;

  return {
    move: (nextOwnerKey) => {
      if (nextOwnerKey === ownerKey) return;
      ownerKey = nextOwnerKey;
      epoch += 1;
    },
    begin: () => ({ ownerKey, epoch }),
    isCurrent: (token) =>
      token.ownerKey === ownerKey && token.epoch === epoch,
  };
};

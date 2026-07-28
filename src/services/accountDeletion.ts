import type {
  AppData,
  ReceiptAttachment,
} from '../models/finance';

export const ACCOUNT_DELETION_REQUEST_DOCUMENT =
  'accountDeletion' as const;

export const ACCOUNT_DELETION_CONFIRMATION =
  'DELETE' as const;

export const ACCOUNT_DELETION_ASSOCIATED_COLLECTIONS = [
  'profile/main',
  'private/preferences',
  'private/entitlement',
  'private/migration',
  'private/workspaceMeta',
  'private/appData',
  'transactions',
  'categories',
  'budgets',
  'savingsGoals',
  'recurringExpenses',
  'reports',
  'plans',
  'plans/*/versions',
  'plans/*/actionResults',
  'plans/*/actionState',
  'planReservations',
  'firebaseAuthUser',
  'r2Receipts',
] as const;

export type AccountDeletionStatus =
  | 'requested'
  | 'processing'
  | 'completed'
  | 'failed';

export interface AccountDeletionRequest {
  schemaVersion: 1;
  userId: string;
  email: string;
  status: AccountDeletionStatus;
  requestedAt: string;
  updatedAt: string;
  source: 'in_app';
  receiptObjectKeys: string[];
  associatedCollections: string[];
  retryCount: number;
  failureCode: string | null;
}

export interface AccountDeletionPlan {
  request: AccountDeletionRequest;
  receiptCount: number;
  transactionCount: number;
  planCount: number;
  requiresRecentAuthentication: boolean;
  requiresRemoteProcessor: boolean;
}

const RECEIPT_OBJECT_KEY_PATTERN =
  /^receipts\/[A-Za-z0-9._-]+\/[A-Za-z0-9][A-Za-z0-9._-]{0,79}\/[A-Za-z0-9][A-Za-z0-9._-]{0,79}\.(jpg|png|heic|heif)$/;

const isRemoteReceipt =
  (
    userId: string,
    receipt: ReceiptAttachment
  ) =>
    receipt.status === 'uploaded' &&
    receipt.objectKey.startsWith(
      `receipts/${userId}/`
    ) &&
    RECEIPT_OBJECT_KEY_PATTERN.test(
      receipt.objectKey
    );

export const collectReceiptObjectKeys = (
  data: AppData
): string[] => {
  const keys = new Set<string>();

  for (const transaction of data.transactions) {
    for (const receipt of transaction.receipts || []) {
      if (
        isRemoteReceipt(
          data.user.id,
          receipt
        )
      ) {
        keys.add(receipt.objectKey);
      }
    }
  }

  return [...keys].sort();
};

export const buildAccountDeletionRequest = ({
  data,
  now,
}: {
  data: AppData;
  now: string;
}): AccountDeletionRequest => ({
  schemaVersion: 1,
  userId: data.user.id,
  email: data.user.email,
  status: 'requested',
  requestedAt: now,
  updatedAt: now,
  source: 'in_app',
  receiptObjectKeys:
    collectReceiptObjectKeys(data),
  associatedCollections: [
    ...ACCOUNT_DELETION_ASSOCIATED_COLLECTIONS,
  ],
  retryCount: 0,
  failureCode: null,
});

export const buildAccountDeletionPlan = ({
  data,
  now,
}: {
  data: AppData;
  now: string;
}): AccountDeletionPlan => ({
  request:
    buildAccountDeletionRequest({
      data,
      now,
    }),
  receiptCount:
    collectReceiptObjectKeys(data).length,
  transactionCount:
    data.transactions.length,
  planCount:
    (data as AppData & {
      plans?: unknown[];
    }).plans?.length ?? 0,
  requiresRecentAuthentication: true,
  requiresRemoteProcessor: true,
});

export const validateAccountDeletionConfirmation =
  (value: string) =>
    value.trim() === ACCOUNT_DELETION_CONFIRMATION;

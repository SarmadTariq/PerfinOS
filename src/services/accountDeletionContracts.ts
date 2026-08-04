import type {
  AppData,
} from '../models/finance';

export const ACCOUNT_DELETION_STATUSES = [
  'requested',
  'reauth_required',
  'deleting',
  'partial_failure',
  'remote_complete',
  'identity_complete',
  'complete',
] as const;

export type AccountDeletionStatus =
  (typeof ACCOUNT_DELETION_STATUSES)[number];

export interface AccountDeletionDisclosure {
  title: string;
  categories: string[];
  requiresReauthentication: boolean;
}

export interface AccountDeletionJob {
  jobId: string;
  status: AccountDeletionStatus;
  unresolvedResourceClasses: string[];
}

interface ReceiptDeletionInput {
  uid: string;
  transactions: {
    receipts?: {
      objectKey?: string;
    }[];
  }[];
}

const escapeRegExp =
  (
    value: string
  ) =>
    value.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

const canonicalReceiptPatternFor =
  (
    uid: string
  ) =>
    new RegExp(
      `^receipts/${escapeRegExp(uid)}/[A-Za-z0-9][A-Za-z0-9._-]{0,79}/[A-Za-z0-9][A-Za-z0-9._-]{0,79}\\.(jpg|png|heic|heif)$`
    );

export const receiptObjectKeysForDeletion =
  ({
    uid,
    transactions,
  }: ReceiptDeletionInput): string[] => {
    const pattern =
      canonicalReceiptPatternFor(uid);
    const keys = new Set<string>();

    transactions.forEach(
      (transaction) => {
        transaction.receipts
          ?.forEach((receipt) => {
            const key =
              receipt.objectKey
                ?.trim();

            if (
              key &&
              pattern.test(key)
            ) {
              keys.add(key);
            }
          });
      }
    );

    return [...keys].sort();
  };

export const buildAccountDeletionDisclosure =
  (
    isGuest: boolean
  ): AccountDeletionDisclosure =>
    isGuest
      ? {
          title:
            'Delete guest data',
          categories: [
            'Guest workspace data on this device',
            'Profile preferences, transactions, categories, budgets, goals, recurring items, and reports',
          ],
          requiresReauthentication:
            false,
        }
      : {
          title:
            'Delete account',
          categories: [
            'Profile and account identity',
            'Transactions, budgets, goals, recurring items, and reports',
            'Plan drafts, generated versions, and action history',
            'Uploaded receipt objects and receipt metadata',
            'Product preferences and entitlement records',
          ],
          requiresReauthentication:
            true,
        };

export const localDeletionReceiptKeys =
  (
    data: AppData
  ) =>
    receiptObjectKeysForDeletion({
      uid: data.user.id,
      transactions:
        data.transactions,
    });

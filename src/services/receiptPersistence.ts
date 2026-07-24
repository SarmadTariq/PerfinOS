import type {
  ReceiptAttachment,
} from '../models/finance';

export type PersistedReceiptAttachment =
  Omit<
    ReceiptAttachment,
    'localUri' | 'error'
  > & {
    status: 'uploaded';
  };

export const persistedReceiptAttachments = (
  receipts: ReceiptAttachment[]
): PersistedReceiptAttachment[] =>
  receipts.flatMap((receipt) => {
    if (
      receipt.status !== 'uploaded' ||
      !receipt.objectKey.trim()
    ) {
      return [];
    }

    const {
      localUri: _localUri,
      error: _error,
      ...persisted
    } = receipt;

    return [{
      ...persisted,
      status: 'uploaded' as const,
    }];
  });

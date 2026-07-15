import { ReceiptAttachment } from '../models/finance';
import { appConfig } from './configService';
import { auth } from './firebaseService';

export interface LocalReceiptInput {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

const receiptId = () => `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createLocalReceiptAttachment = (asset: LocalReceiptInput): ReceiptAttachment => {
  const id = receiptId();

  return {
    id,
    objectKey: "",
    fileName: asset.fileName ?? `${id}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    sizeBytes: asset.fileSize ?? 0,
    uploadedAt: new Date().toISOString(),
    status: appConfig.apiBaseUrl ? 'local' : 'error',
    localUri: asset.uri,
    error: appConfig.apiBaseUrl ? undefined : 'Receipt upload backend is not configured yet.',
  };
};

export const receiptUploadConfigured = () => !!appConfig.apiBaseUrl;

/**
 * Upload a single local receipt to Cloudflare R2 via the PerFin OS Worker.
 * Requires an authenticated Firebase user and a configured apiBaseUrl.
 * Returns updated ReceiptAttachment with status 'uploaded' on success or 'error' on failure.
 * Non-blocking — call fire-and-forget after transaction save.
 */
export const uploadReceiptToWorker = async (transactionId: string, receipt: ReceiptAttachment): Promise<ReceiptAttachment> => {
  if (!appConfig.apiBaseUrl) {
    return { ...receipt, status: 'error', error: 'Upload backend not configured' };
  }
  if (!receipt.localUri) {
    return { ...receipt, status: 'error', error: 'No local file URI to upload' };
  }
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (!token) {
      return { ...receipt, status: 'error', error: 'Not authenticated — sign in to upload receipts' };
    }

    const blob = await fetch(receipt.localUri).then((res) => res.blob());
    const response = await fetch(`${appConfig.apiBaseUrl}/receipts/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': receipt.mimeType,
        "X-Transaction-Id": transactionId,
        "X-Receipt-Id": receipt.id,
      },
      body: blob,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string };
      return { ...receipt, status: 'error', error: err.error || `Upload failed (${response.status})` };
    }

    const { objectKey, uploadedAt } = await response.json() as { objectKey: string; uploadedAt: string };
    // Clear local URI after confirmed upload to avoid double-upload
    return { ...receipt, objectKey, status: 'uploaded', uploadedAt, localUri: undefined, error: undefined };
  } catch (err: any) {
    return { ...receipt, status: 'error', error: err.message || 'Upload failed' };
  }
};

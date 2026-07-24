import type {
  ReceiptAttachment,
} from '../models/finance';
import { appConfig } from './configService';
import {
  auth,
  getPlanAppCheckAvailability,
  getRemoteAppCheckToken,
} from './firebaseService';

export interface LocalReceiptInput {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

export interface ReceiptClientDependencies {
  apiBaseUrl: string;
  getUserId: () => string | null;
  getIdToken: () => Promise<string | null>;
  getAppCheckToken: () => Promise<string>;
  fetch: typeof globalThis.fetch;
}

interface ReceiptUploadResponse {
  objectKey: string;
  uploadedAt: string;
  mimeType: string;
  sizeBytes: number;
}

const ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const receiptId = () =>
  `receipt-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const requireIdentifier = (
  value: string,
  label: string
) => {
  if (!ID_PATTERN.test(value)) {
    throw new Error(
      `${label} is not valid for receipt storage`
    );
  }
};

const receiptExtension = (
  receipt: ReceiptAttachment
): string => {
  const extension =
    MIME_EXTENSION[receipt.mimeType];

  if (!extension) {
    throw new Error(
      'Unsupported receipt image type'
    );
  }

  return extension;
};

const receiptErrorMessage = async (
  response: Response
): Promise<string> => {
  const payload = await response
    .json()
    .catch(() => null) as
      | {
          error?:
            | string
            | {
                message?: string;
              };
        }
      | null;

  if (
    payload?.error &&
    typeof payload.error === 'object'
  ) {
    return (
      payload.error.message ||
      `Receipt request failed (${response.status})`
    );
  }

  return (
    typeof payload?.error === 'string'
      ? payload.error
      : `Receipt request failed (${response.status})`
  );
};

export const createLocalReceiptAttachment = (
  asset: LocalReceiptInput
): ReceiptAttachment => {
  const id = receiptId();

  return {
    id,
    objectKey: '',
    fileName:
      asset.fileName ||
      `${id}.jpg`,
    mimeType:
      asset.mimeType ||
      'image/jpeg',
    sizeBytes:
      asset.fileSize ||
      0,
    uploadedAt: '',
    status:
      appConfig.apiBaseUrl
        ? 'local'
        : 'error',
    localUri: asset.uri,
    error:
      appConfig.apiBaseUrl
        ? undefined
        : 'Receipt upload backend is not configured yet.',
  };
};

export const createReceiptClient = (
  dependencies: ReceiptClientDependencies
) => {
  const authorizationHeaders =
    async () => {
      const [
        idToken,
        appCheckToken,
      ] = await Promise.all([
        dependencies.getIdToken(),
        dependencies.getAppCheckToken(),
      ]);

      if (!idToken) {
        throw new Error(
          'Sign in to upload receipts'
        );
      }

      if (!appCheckToken.trim()) {
        throw new Error(
          'Receipt App Check is unavailable'
        );
      }

      return {
        Authorization:
          `Bearer ${idToken}`,
        'X-Firebase-AppCheck':
          appCheckToken,
      };
    };

  const receiptUrl = (
    transactionId: string,
    receipt: ReceiptAttachment,
    includeExtension: boolean
  ) => {
    requireIdentifier(
      transactionId,
      'Transaction id'
    );
    requireIdentifier(
      receipt.id,
      'Receipt id'
    );

    const url = new URL(
      `${
        dependencies.apiBaseUrl
      }/receipts/${
        encodeURIComponent(
          transactionId
        )
      }/${
        encodeURIComponent(
          receipt.id
        )
      }`
    );

    if (includeExtension) {
      url.searchParams.set(
        'extension',
        receiptExtension(receipt)
      );
    }

    return url.toString();
  };

  return {
    upload: async (
      transactionId: string,
      receipt: ReceiptAttachment
    ): Promise<ReceiptAttachment> => {
      if (!dependencies.apiBaseUrl) {
        return {
          ...receipt,
          status: 'error',
          error:
            'Upload backend not configured',
        };
      }

      if (!receipt.localUri) {
        return {
          ...receipt,
          status: 'error',
          error:
            'No local file URI to upload',
        };
      }

      try {
        const headers =
          await authorizationHeaders();
        const blob = await dependencies
          .fetch(receipt.localUri)
          .then((response) =>
            response.blob()
          );
        const response =
          await dependencies.fetch(
            receiptUrl(
              transactionId,
              receipt,
              false
            ),
            {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type':
                  receipt.mimeType,
              },
              body: blob,
            }
          );

        if (!response.ok) {
          throw new Error(
            await receiptErrorMessage(
              response
            )
          );
        }

        const payload =
          await response.json() as
            ReceiptUploadResponse;
        const userId =
          dependencies.getUserId();
        const expectedPrefix =
          userId
            ? `receipts/${userId}/${transactionId}/${receipt.id}.`
            : null;

        if (
          !payload.objectKey ||
          (
            expectedPrefix &&
            !payload.objectKey.startsWith(
              expectedPrefix
            )
          )
        ) {
          throw new Error(
            'Receipt storage returned an invalid object key'
          );
        }

        return {
          ...receipt,
          objectKey:
            payload.objectKey,
          uploadedAt:
            payload.uploadedAt,
          mimeType:
            payload.mimeType,
          sizeBytes:
            payload.sizeBytes,
          status: 'uploaded',
          localUri: undefined,
          error: undefined,
        };
      } catch (error) {
        return {
          ...receipt,
          status: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Upload failed',
        };
      }
    },

    download: async (
      transactionId: string,
      receipt: ReceiptAttachment
    ): Promise<Blob> => {
      const headers =
        await authorizationHeaders();
      const response =
        await dependencies.fetch(
          receiptUrl(
            transactionId,
            receipt,
            true
          ),
          {
            method: 'GET',
            headers,
          }
        );

      if (!response.ok) {
        throw new Error(
          await receiptErrorMessage(
            response
          )
        );
      }

      return response.blob();
    },

    delete: async (
      transactionId: string,
      receipt: ReceiptAttachment
    ): Promise<void> => {
      const headers =
        await authorizationHeaders();
      const response =
        await dependencies.fetch(
          receiptUrl(
            transactionId,
            receipt,
            true
          ),
          {
            method: 'DELETE',
            headers,
          }
        );

      if (!response.ok) {
        throw new Error(
          await receiptErrorMessage(
            response
          )
        );
      }
    },
  };
};

const defaultReceiptClient =
  createReceiptClient({
    apiBaseUrl:
      appConfig.apiBaseUrl,
    getUserId: () =>
      auth?.currentUser?.uid ??
      null,
    getIdToken: async () =>
      auth?.currentUser?.getIdToken() ??
      null,
    getAppCheckToken:
      getRemoteAppCheckToken,
    fetch: globalThis.fetch.bind(
      globalThis
    ),
  });

export const receiptUploadConfigured = () =>
  !!appConfig.apiBaseUrl &&
  getPlanAppCheckAvailability() ===
    'available';

export const uploadReceiptToWorker = (
  transactionId: string,
  receipt: ReceiptAttachment
) =>
  defaultReceiptClient.upload(
    transactionId,
    receipt
  );

export const downloadReceiptFromWorker = (
  transactionId: string,
  receipt: ReceiptAttachment
) =>
  defaultReceiptClient.download(
    transactionId,
    receipt
  );

export const deleteReceiptFromWorker = (
  transactionId: string,
  receipt: ReceiptAttachment
) =>
  defaultReceiptClient.delete(
    transactionId,
    receipt
  );

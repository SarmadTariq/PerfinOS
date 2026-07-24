import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock(
  '../../src/services/configService',
  () => ({
    appConfig: {
      apiBaseUrl: '',
    },
  })
);

vi.mock(
  '../../src/services/firebaseService',
  () => ({
    auth: null,
    getPlanAppCheckAvailability:
      () => 'not_configured',
    getRemoteAppCheckToken:
      async () => '',
  })
);

import type {
  ReceiptAttachment,
} from '../../src/models/finance';
import {
  createReceiptClient,
} from '../../src/services/receiptService';

const localReceipt = (): ReceiptAttachment => ({
  id: 'receipt-1',
  objectKey: '',
  fileName: 'display-name.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 3,
  uploadedAt: '',
  status: 'local',
  localUri: 'file:///private/receipt.jpg',
});

describe('receipt client', () => {
  it('uses canonical ids plus Auth and App Check without sending an object key', async () => {
    const fetchMock = vi.fn(
      async (
        input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        if (
          String(input).startsWith(
            'file://'
          )
        ) {
          return new Response(
            new Blob([
              new Uint8Array([
                1,
                2,
                3,
              ]),
            ], {
              type: 'image/jpeg',
            })
          );
        }

        expect(String(input)).toBe(
          'https://api.perfin.test/receipts/tx-1/receipt-1'
        );
        const headers =
          new Headers(init?.headers);
        expect(
          headers.get('Authorization')
        ).toBe('Bearer id-token');
        expect(
          headers.get(
            'X-Firebase-AppCheck'
          )
        ).toBe('app-check-token');
        expect(
          headers.has('X-Object-Key')
        ).toBe(false);

        return new Response(
          JSON.stringify({
            objectKey:
              'receipts/user-1/tx-1/receipt-1.jpg',
            uploadedAt:
              '2026-07-24T00:00:00.000Z',
            mimeType:
              'image/jpeg',
            sizeBytes: 3,
          }),
          {
            status: 201,
            headers: {
              'Content-Type':
                'application/json',
            },
          }
        );
      }
    );
    const client =
      createReceiptClient({
        apiBaseUrl:
          'https://api.perfin.test',
        getUserId: () => 'user-1',
        getIdToken: async () =>
          'id-token',
        getAppCheckToken: async () =>
          'app-check-token',
        fetch:
          fetchMock as typeof fetch,
      });

    await expect(
      client.upload(
        'tx-1',
        localReceipt()
      )
    ).resolves.toEqual({
      id: 'receipt-1',
      objectKey:
        'receipts/user-1/tx-1/receipt-1.jpg',
      fileName: 'display-name.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 3,
      uploadedAt:
        '2026-07-24T00:00:00.000Z',
      status: 'uploaded',
      localUri: undefined,
      error: undefined,
    });
  });

  it('fails closed when App Check is unavailable', async () => {
    const fetchMock = vi.fn();
    const client =
      createReceiptClient({
        apiBaseUrl:
          'https://api.perfin.test',
        getUserId: () => 'user-1',
        getIdToken: async () =>
          'id-token',
        getAppCheckToken: async () => {
          throw new Error(
            'App Check unavailable'
          );
        },
        fetch:
          fetchMock as typeof fetch,
      });

    await expect(
      client.upload(
        'tx-1',
        localReceipt()
      )
    ).resolves.toMatchObject({
      status: 'error',
      error:
        'App Check unavailable',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('derives delete paths from transaction, receipt, and MIME metadata', async () => {
    const fetchMock = vi.fn(
      async (
        input: RequestInfo | URL,
        init?: RequestInit
      ) => {
        expect(String(input)).toBe(
          'https://api.perfin.test/receipts/tx-1/receipt-1?extension=jpg'
        );
        expect(init?.method).toBe(
          'DELETE'
        );
        return new Response(null, {
          status: 204,
        });
      }
    );
    const client =
      createReceiptClient({
        apiBaseUrl:
          'https://api.perfin.test',
        getUserId: () => 'user-1',
        getIdToken: async () =>
          'id-token',
        getAppCheckToken: async () =>
          'app-check-token',
        fetch:
          fetchMock as typeof fetch,
      });

    await expect(
      client.delete('tx-1', {
        ...localReceipt(),
        objectKey:
          'receipts/user-1/tx-1/receipt-1.jpg',
        status: 'uploaded',
        localUri: undefined,
      })
    ).resolves.toBeUndefined();
  });
});

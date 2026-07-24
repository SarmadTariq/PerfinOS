import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type {
  Env,
} from '../src/env';
import {
  canonicalReceiptObjectKey,
  createReceiptGateway,
  type ReceiptGatewayDependencies,
} from '../src/receipt/gateway';

const origin =
  'https://app.perfin.test';

const createR2 = () => {
  const values =
    new Map<
      string,
      {
        body: ArrayBuffer;
        contentType: string;
      }
    >();
  const put = vi.fn(
    async (
      key: string,
      body: ArrayBuffer,
      options?: {
        httpMetadata?: {
          contentType?: string;
        };
      }
    ) => {
      values.set(key, {
        body,
        contentType:
          options?.httpMetadata
            ?.contentType ??
          'application/octet-stream',
      });
    }
  );
  const get = vi.fn(
    async (key: string) => {
      const value =
        values.get(key);

      if (!value) return null;

      return {
        body: value.body,
        httpMetadata: {
          contentType:
            value.contentType,
        },
      };
    }
  );
  const deleteObject = vi.fn(
    async (key: string) => {
      values.delete(key);
    }
  );

  return {
    binding: {
      put,
      get,
      delete: deleteObject,
    } as unknown as R2Bucket,
    deleteObject,
    get,
    put,
    values,
  };
};

const dependencies = (
  uid = 'user-a'
): ReceiptGatewayDependencies => ({
  verifyIdToken: vi.fn(
    async () => ({ uid })
  ),
  verifyAppCheckToken: vi.fn(
    async () => ({
      appId: 'app-a',
    })
  ),
  now: () =>
    new Date(
      '2026-07-24T00:00:00.000Z'
    ),
});

const request = ({
  method = 'POST',
  transactionId = 'tx-1',
  receiptId = 'receipt-1',
  authorization = 'Bearer auth-token',
  appCheck = 'app-check-token',
  contentType = 'image/jpeg',
  extension,
  body = new Uint8Array([1, 2, 3]),
}: {
  method?: string;
  transactionId?: string;
  receiptId?: string;
  authorization?: string | null;
  appCheck?: string | null;
  contentType?: string;
  extension?: string;
  body?: BodyInit | null;
} = {}) => {
  const headers =
    new Headers({
      Origin: origin,
      'Content-Type':
        contentType,
    });

  if (authorization) {
    headers.set(
      'Authorization',
      authorization
    );
  }

  if (appCheck) {
    headers.set(
      'X-Firebase-AppCheck',
      appCheck
    );
  }

  const url =
    new URL(
      `https://worker.test/receipts/${transactionId}/${receiptId}`
    );

  if (extension) {
    url.searchParams.set(
      'extension',
      extension
    );
  }

  return new Request(url, {
    method,
    headers,
    body:
      method === 'POST'
        ? body
        : undefined,
  });
};

const envWith = (
  receipts: R2Bucket
) => ({
  RECEIPTS: receipts,
  ALLOWED_ORIGINS: origin,
} as Env);

describe('receipt gateway', () => {
  it('requires Firebase Auth before App Check and storage', async () => {
    const r2 = createR2();
    const deps = dependencies();
    const gateway =
      createReceiptGateway(deps);
    const response = await gateway(
      request({
        authorization: null,
      }),
      envWith(r2.binding)
    );

    expect(response?.status).toBe(401);
    expect(
      deps.verifyIdToken
    ).not.toHaveBeenCalled();
    expect(
      deps.verifyAppCheckToken
    ).not.toHaveBeenCalled();
    expect(r2.put).not.toHaveBeenCalled();
  });

  it('requires App Check before storage access', async () => {
    const r2 = createR2();
    const deps = dependencies();
    const gateway =
      createReceiptGateway(deps);
    const response = await gateway(
      request({
        appCheck: null,
      }),
      envWith(r2.binding)
    );

    expect(response?.status).toBe(401);
    expect(
      deps.verifyIdToken
    ).toHaveBeenCalledOnce();
    expect(r2.put).not.toHaveBeenCalled();
  });

  it('validates identifiers before constructing an object key', async () => {
    const r2 = createR2();
    const response =
      await createReceiptGateway(
        dependencies()
      )(
        request({
          transactionId: 'bad$id',
        }),
        envWith(r2.binding)
      );

    expect(response?.status).toBe(400);
    expect(r2.put).not.toHaveBeenCalled();
  });

  it('constructs the canonical upload key and ignores display filenames', async () => {
    const r2 = createR2();
    const response =
      await createReceiptGateway(
        dependencies()
      )(
        request(),
        envWith(r2.binding)
      );

    expect(response?.status).toBe(201);
    expect(r2.put).toHaveBeenCalledWith(
      'receipts/user-a/tx-1/receipt-1.jpg',
      expect.any(ArrayBuffer),
      {
        httpMetadata: {
          contentType:
            'image/jpeg',
        },
      }
    );
    await expect(
      response?.json()
    ).resolves.toEqual({
      objectKey:
        'receipts/user-a/tx-1/receipt-1.jpg',
      uploadedAt:
        '2026-07-24T00:00:00.000Z',
      mimeType: 'image/jpeg',
      sizeBytes: 3,
    });
  });

  it('derives download and delete keys from the authenticated uid', async () => {
    const r2 = createR2();
    r2.values.set(
      'receipts/user-a/tx-1/receipt-1.jpg',
      {
        body:
          new Uint8Array([9])
            .buffer,
        contentType:
          'image/jpeg',
      }
    );
    const userBGateway =
      createReceiptGateway(
        dependencies('user-b')
      );
    const download =
      await userBGateway(
        request({
          method: 'GET',
          extension: 'jpg',
        }),
        envWith(r2.binding)
      );

    expect(download?.status).toBe(404);
    expect(r2.get).toHaveBeenCalledWith(
      'receipts/user-b/tx-1/receipt-1.jpg'
    );

    const deletion =
      await userBGateway(
        request({
          method: 'DELETE',
          extension: 'jpg',
        }),
        envWith(r2.binding)
      );
    expect(deletion?.status).toBe(204);
    expect(
      r2.deleteObject
    ).toHaveBeenCalledWith(
      'receipts/user-b/tx-1/receipt-1.jpg'
    );
    expect(
      r2.values.has(
        'receipts/user-a/tx-1/receipt-1.jpg'
      )
    ).toBe(true);
  });

  it('serves and idempotently deletes only the canonical owned object', async () => {
    const r2 = createR2();
    const key =
      canonicalReceiptObjectKey({
        uid: 'user-a',
        transactionId: 'tx-1',
        receiptId: 'receipt-1',
        extension: 'png',
      });
    r2.values.set(key, {
      body:
        new Uint8Array([4, 5])
          .buffer,
      contentType: 'image/png',
    });
    const gateway =
      createReceiptGateway(
        dependencies()
      );
    const download =
      await gateway(
        request({
          method: 'GET',
          extension: 'png',
        }),
        envWith(r2.binding)
      );

    expect(download?.status).toBe(200);
    expect(
      download?.headers.get(
        'Content-Type'
      )
    ).toBe('image/png');

    const deletion =
      await gateway(
        request({
          method: 'DELETE',
          extension: 'png',
        }),
        envWith(r2.binding)
      );
    expect(deletion?.status).toBe(204);
    expect(r2.values.has(key)).toBe(false);
  });

  it('advertises App Check and never advertises X-Object-Key', async () => {
    const r2 = createR2();
    const response =
      await createReceiptGateway(
        dependencies()
      )(
        request({
          method: 'OPTIONS',
          body: null,
        }),
        envWith(r2.binding)
      );
    const allowed =
      response?.headers.get(
        'Access-Control-Allow-Headers'
      );

    expect(response?.status).toBe(204);
    expect(allowed).toContain(
      'X-Firebase-AppCheck'
    );
    expect(allowed).not.toContain(
      'X-Object-Key'
    );
  });
});

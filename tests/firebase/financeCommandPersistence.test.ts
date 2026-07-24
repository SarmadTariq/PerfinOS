import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type {
  AppData,
  ReceiptAttachment,
  Transaction,
} from '../../src/models/finance';
import { createEmptyAppData } from '../../src/services/initialData';

const PROJECT_ID = 'demo-perfin-os';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;

let testEnvironment: RulesTestEnvironment;
let migrationRepository:
  typeof import('../../src/services/firebase/migrationRepository');
let commandRepository:
  typeof import('../../src/services/firebase/financeCommandRepository');

const makeTransaction = (id: string): Transaction => ({
  id,
  userId: 'alice',
  type: 'expense',
  amount: 25,
  categoryId: 'cat-food',
  categoryName: 'Food & Dining',
  merchant: 'Test Merchant',
  date: '2026-07-24',
  notes: '',
  location: {
    name: 'Test',
    formattedAddress: 'Test',
    latitude: 43.65,
    longitude: -79.38,
    address: 'Test',
    source: 'imported',
  },
  paymentMethod: 'Test',
  isRecurring: false,
  receipts: [],
  updateCount: 0,
  createdAt: '2026-07-24T00:00:00.000Z',
  updatedAt: '2026-07-24T00:00:00.000Z',
});

const initialWorkspace = (): AppData =>
  createEmptyAppData({
    userId: 'alice',
    name: 'Alice',
    email: 'alice@example.invalid',
    isGuest: false,
  });

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: FIRESTORE_HOST,
      port: FIRESTORE_PORT,
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  });

  const repositoryFirestore = testEnvironment
    .authenticatedContext('alice')
    .firestore();

  vi.resetModules();
  vi.doMock('../../src/services/firebase/client', () => ({
    app: null,
    auth: null,
    db: repositoryFirestore,
    firebaseConfig: { projectId: PROJECT_ID },
    firebaseConfigured: true,
  }));

  migrationRepository = await import(
    '../../src/services/firebase/migrationRepository'
  );
  commandRepository = await import(
    '../../src/services/firebase/financeCommandRepository'
  );
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

afterAll(async () => {
  await testEnvironment.cleanup();
  vi.doUnmock('../../src/services/firebase/client');
});

describe('focused finance commands', () => {
  it('writes only the changed entity and increments workspace metadata once', async () => {
    const current = initialWorkspace();
    await migrationRepository.initializeFinanceWorkspace('alice', current);
    const transaction = makeTransaction('tx-1');
    const next = {
      ...current,
      transactions: [transaction],
    };

    const meta = await commandRepository.persistFinanceWorkspaceMutation({
      userId: 'alice',
      current,
      next,
      expectedRevision: 0,
      mutationId: 'finance:test-add',
    });
    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();

    expect(meta).toMatchObject({
      revision: 1,
      lastMutationId: 'finance:test-add',
    });
    expect(
      (
        await getDoc(
          doc(aliceDb, 'users', 'alice', 'transactions', 'tx-1')
        )
      ).data()
    ).toEqual(transaction);
    expect(
      (
        await getDoc(
          doc(aliceDb, 'users', 'alice', 'private', 'appData')
        )
      ).exists()
    ).toBe(false);
  });

  it('updates profile and preferences in one logical revision', async () => {
    const current = initialWorkspace();
    await migrationRepository.initializeFinanceWorkspace('alice', current);
    const next: AppData = {
      ...current,
      onboarded: true,
      user: {
        ...current.user,
        name: 'Alice Updated',
        currency: 'CAD',
        monthlyIncome: 5200,
        monthlyBudget: 3200,
      },
    };

    const meta = await commandRepository.persistFinanceWorkspaceMutation({
      userId: 'alice',
      current,
      next,
      expectedRevision: 0,
      mutationId: 'finance:test-onboarding',
    });
    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();

    expect(meta.revision).toBe(1);
    expect(
      (
        await getDoc(
          doc(aliceDb, 'users', 'alice', 'profile', 'main')
        )
      ).data()
    ).toMatchObject({
      id: 'alice',
      name: 'Alice Updated',
    });
    expect(
      (
        await getDoc(
          doc(aliceDb, 'users', 'alice', 'private', 'preferences')
        )
      ).data()
    ).toMatchObject({
      currency: 'CAD',
      monthlyIncome: 5200,
      monthlyBudget: 3200,
      onboarded: true,
    });
  });

  it('rejects a stale workspace revision without writing its target', async () => {
    const current = initialWorkspace();
    await migrationRepository.initializeFinanceWorkspace('alice', current);
    const firstTransaction = makeTransaction('tx-first');
    const firstNext = {
      ...current,
      transactions: [firstTransaction],
    };
    await commandRepository.persistFinanceWorkspaceMutation({
      userId: 'alice',
      current,
      next: firstNext,
      expectedRevision: 0,
      mutationId: 'finance:first',
    });

    const staleTransaction = makeTransaction('tx-stale');
    await expect(
      commandRepository.persistFinanceWorkspaceMutation({
        userId: 'alice',
        current,
        next: {
          ...current,
          transactions: [staleTransaction],
        },
        expectedRevision: 0,
        mutationId: 'finance:stale',
      })
    ).rejects.toThrow(
      'Finance workspace changed before the command was saved'
    );

    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    expect(
      (
        await getDoc(
          doc(aliceDb, 'users', 'alice', 'transactions', 'tx-stale')
        )
      ).exists()
    ).toBe(false);
    expect(
      (
        await getDoc(
          doc(aliceDb, 'users', 'alice', 'private', 'workspaceMeta')
        )
      ).data()
    ).toMatchObject({
      revision: 1,
      lastMutationId: 'finance:first',
    });
  });

  it('allows only canonical uploaded receipt metadata owned by the transaction user', async () => {
    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    await migrationRepository.initializeFinanceWorkspace(
      'alice',
      initialWorkspace()
    );
    const transaction = makeTransaction('tx-receipt');
    const receipt: ReceiptAttachment = {
      id: 'receipt-1',
      objectKey: 'receipts/alice/tx-receipt/receipt-1.jpg',
      fileName: 'receipt.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 512,
      uploadedAt: '2026-07-24T00:00:00.000Z',
      status: 'uploaded',
    };
    const writeWithRevision = (
      nextTransaction: Transaction,
      revision: number,
      mutationId: string
    ) => {
      const batch = writeBatch(aliceDb);
      batch.set(
        doc(
          aliceDb,
          'users',
          'alice',
          'transactions',
          nextTransaction.id
        ),
        nextTransaction
      );
      batch.update(
        doc(
          aliceDb,
          'users',
          'alice',
          'private',
          'workspaceMeta'
        ),
        {
          schemaVersion: 1,
          revision,
          lastMutationId: mutationId,
          updatedAt:
            '2026-07-24T00:00:00.000Z',
        }
      );
      return batch.commit();
    };

    await assertSucceeds(
      writeWithRevision(
        {
          ...transaction,
          receipts: [receipt],
        },
        1,
        'finance:valid-receipt'
      )
    );

    await assertFails(
      writeWithRevision(
        {
          ...makeTransaction('tx-local-uri'),
          receipts: [{
            ...receipt,
            id: 'receipt-local',
            objectKey: 'receipts/alice/tx-local-uri/receipt-local.jpg',
            localUri: 'file:///private/receipt.jpg',
          }],
        },
        2,
        'finance:invalid-local-uri'
      )
    );

    await assertFails(
      writeWithRevision(
        {
          ...makeTransaction('tx-foreign'),
          receipts: [{
            ...receipt,
            id: 'receipt-foreign',
            objectKey: 'receipts/bob/tx-foreign/receipt-foreign.jpg',
          }],
        },
        2,
        'finance:invalid-foreign'
      )
    );

    await assertFails(
      writeWithRevision(
        {
          ...makeTransaction('tx-pending'),
          receipts: [{
            ...receipt,
            id: 'receipt-pending',
            objectKey: 'receipts/alice/tx-pending/receipt-pending.jpg',
            status: 'local',
          }],
        },
        2,
        'finance:invalid-pending'
      )
    );
  });

  it('rules reject a completed-workspace entity write without its revision increment', async () => {
    const aliceDb =
      testEnvironment
        .authenticatedContext('alice')
        .firestore();
    await migrationRepository.initializeFinanceWorkspace(
      'alice',
      initialWorkspace()
    );

    await assertFails(
      setDoc(
        doc(
          aliceDb,
          'users',
          'alice',
          'transactions',
          'tx-no-revision'
        ),
        makeTransaction(
          'tx-no-revision'
        )
      )
    );

    expect(
      (
        await getDoc(
          doc(
            aliceDb,
            'users',
            'alice',
            'private',
            'workspaceMeta'
          )
        )
      ).data()?.revision
    ).toBe(0);
  });

  it('rules keep entitlement writes backend-only', async () => {
    const aliceDb =
      testEnvironment
        .authenticatedContext('alice')
        .firestore();

    await assertFails(
      setDoc(
        doc(
          aliceDb,
          'users',
          'alice',
          'private',
          'entitlement'
        ),
        {
          plan:
            'premium_placeholder',
          features: {
            cloudSync: true,
            receiptUploads: true,
            aiReports: true,
            aiPlanning: true,
            accountRecovery: true,
          },
          createdAt:
            '2026-07-24T00:00:00.000Z',
          updatedAt:
            '2026-07-24T00:00:00.000Z',
        }
      )
    );
  });
});

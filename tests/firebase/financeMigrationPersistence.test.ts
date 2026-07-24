import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
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
import type { AppData, Transaction } from '../../src/models/finance';
import { createEmptyAppData } from '../../src/services/initialData';

const PROJECT_ID = 'demo-perfin-os';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;

let testEnvironment: RulesTestEnvironment;
let repository: typeof import('../../src/services/firebase/migrationRepository');

const transaction = (id: string, amount = 42): Transaction => ({
  id,
  userId: 'alice',
  type: 'expense',
  amount,
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

const legacyWorkspace = (
  overrides: Partial<AppData> = {}
): AppData => ({
  ...createEmptyAppData({
    userId: 'alice',
    name: 'Alice',
    email: 'alice@example.invalid',
    isGuest: false,
  }),
  ...overrides,
});

const seedLegacy = async (workspace: AppData) => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), 'users', 'alice', 'private', 'appData'),
      workspace
    );
  });
};

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

  repository = await import('../../src/services/firebase/migrationRepository');
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

afterAll(async () => {
  await testEnvironment.cleanup();
  vi.doUnmock('../../src/services/firebase/client');
});

describe('legacy finance workspace migration', () => {
  it('copies missing targets, verifies them, and leaves the legacy blob unchanged', async () => {
    const legacy = legacyWorkspace({
      transactions: [transaction('tx-1')],
    });
    await seedLegacy(legacy);

    const result = await repository.migrateLegacyAppData('alice');
    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();

    expect(result.status).toBe('completed');
    expect(result.sourceCounts).toEqual(result.targetCounts);
    expect(result.sourceChecksum).toBe(result.targetChecksum);
    expect(
      (
        await getDoc(
          doc(aliceDb, 'users', 'alice', 'transactions', 'tx-1')
        )
      ).data()
    ).toEqual(transaction('tx-1'));
    expect(
      (
        await getDoc(
          doc(aliceDb, 'users', 'alice', 'private', 'appData')
        )
      ).data()
    ).toEqual(legacy);
    expect(
      (
        await getDoc(
          doc(aliceDb, 'users', 'alice', 'private', 'entitlement')
        )
      ).exists()
    ).toBe(false);
  });

  it('marks valid empty entity collections authoritative', async () => {
    await seedLegacy(
      legacyWorkspace({
        transactions: [],
        categories: [],
        budgets: [],
        savingsGoals: [],
        recurringExpenses: [],
        reports: [],
      })
    );

    const result = await repository.migrateLegacyAppData('alice');
    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();

    expect(result.status).toBe('completed');
    expect(result.targetCounts).toMatchObject({
      transactions: 0,
      categories: 0,
      budgets: 0,
      savingsGoals: 0,
      recurringExpenses: 0,
      reports: 0,
    });

    for (const collectionName of [
      'transactions',
      'categories',
      'budgets',
      'savingsGoals',
      'recurringExpenses',
      'reports',
    ]) {
      expect(
        (
          await getDocs(
            collection(aliceDb, 'users', 'alice', collectionName)
          )
        ).empty
      ).toBe(true);
    }
  });

  it('records a mismatch and never overwrites or partially copies targets', async () => {
    await seedLegacy(
      legacyWorkspace({
        transactions: [
          transaction('tx-conflict', 42),
          transaction('tx-missing', 19),
        ],
      })
    );
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(
          context.firestore(),
          'users',
          'alice',
          'transactions',
          'tx-conflict'
        ),
        transaction('tx-conflict', 99)
      );
    });

    const result = await repository.migrateLegacyAppData('alice');
    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();

    expect(result).toMatchObject({
      status: 'failed',
      failureCode: 'target_conflicts',
      conflicts: [
        {
          collection: 'transactions',
          entityId: 'tx-conflict',
          reason: 'existing_document_mismatch',
        },
      ],
    });
    expect(
      (
        await getDoc(
          doc(aliceDb, 'users', 'alice', 'transactions', 'tx-conflict')
        )
      ).data()
    ).toEqual(transaction('tx-conflict', 99));
    expect(
      (
        await getDoc(
          doc(aliceDb, 'users', 'alice', 'transactions', 'tx-missing')
        )
      ).exists()
    ).toBe(false);
  });

  it('converges when two migration attempts run together', async () => {
    await seedLegacy(
      legacyWorkspace({
        transactions: Array.from({ length: 12 }, (_, index) =>
          transaction(`tx-${index}`)
        ),
      })
    );

    const [first, second] = await Promise.all([
      repository.migrateLegacyAppData('alice'),
      repository.migrateLegacyAppData('alice'),
    ]);
    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const finalState = (
      await getDoc(
        doc(aliceDb, 'users', 'alice', 'private', 'migration')
      )
    ).data();

    expect([first.status, second.status]).toContain('completed');
    expect(finalState).toMatchObject({
      status: 'completed',
      failureCode: null,
    });
    expect(
      (
        await getDocs(
          collection(aliceDb, 'users', 'alice', 'transactions')
        )
      ).size
    ).toBe(12);
  });
});

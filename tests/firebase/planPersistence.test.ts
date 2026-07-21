import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
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
  FinancialPlan,
  PlanVersion,
} from '../../src/models/planning';

const PROJECT_ID = 'demo-perfin-os';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;

let testEnvironment: RulesTestEnvironment;
let repository:
  typeof import(
    '../../src/services/firebase/planRepository'
  );

const makePlan = (
  id: string,
  overrides: Partial<FinancialPlan> = {}
): FinancialPlan => ({
  id,
  userId: 'alice',
  title: `Plan ${id}`,
  currency: 'CAD',
  horizon: '7_days',
  startDate: '2026-07-21',
  endDate: '2026-07-27',
  status: 'draft',
  currentVersionId: `${id}-v1`,
  versionCount: 1,
  replacedPlanId: null,
  createdAt: '2026-07-21T12:00:00.000Z',
  updatedAt: '2026-07-21T12:00:00.000Z',
  activatedAt: null,
  completedAt: null,
  archivedAt: null,
  ...overrides,
});

const makeVersion = (
  plan: FinancialPlan,
  versionNumber = 1,
  overrides: Partial<PlanVersion> = {}
): PlanVersion => ({
  id: `${plan.id}-v${versionNumber}`,
  userId: plan.userId,
  planId: plan.id,
  versionNumber,
  createdAt:
    versionNumber === 1
      ? plan.createdAt
      : '2026-07-22T12:00:00.000Z',
  createdBy: 'user',
  sourceRevision: `revision-${versionNumber}`,
  summary: `Version ${versionNumber}`,
  assumptions: [],
  allocations: [],
  commitments: [],
  recommendations: [],
  actionProposals: [],
  validation: {
    schemaVersion: 1,
    state: 'valid',
    validatedAt:
      '2026-07-21T12:00:00.000Z',
    errors: [],
    warnings: [],
  },
  ...overrides,
});

beforeAll(async () => {
  testEnvironment =
    await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: FIRESTORE_HOST,
        port: FIRESTORE_PORT,
        rules: readFileSync(
          resolve(
            process.cwd(),
            'firestore.rules'
          ),
          'utf8'
        ),
      },
    });

  const repositoryFirestore =
    testEnvironment
      .authenticatedContext('alice')
      .firestore();

  vi.resetModules();

  vi.doMock(
    '../../src/services/firebase/client',
    () => ({
      app: null,
      auth: null,
      db: repositoryFirestore,
      firebaseConfig: {
        projectId: PROJECT_ID,
      },
      firebaseConfigured: true,
    })
  );

  repository = await import(
    '../../src/services/firebase/planRepository'
  );
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

afterAll(async () => {
  await testEnvironment.cleanup();

  vi.doUnmock(
    '../../src/services/firebase/client'
  );
});

describe('existing Firebase ownership rules', () => {
  it('preserves owner access to current entity collections', async () => {
    const aliceDb =
      testEnvironment
        .authenticatedContext('alice')
        .firestore();

    const bobDb =
      testEnvironment
        .authenticatedContext('bob')
        .firestore();

    const collections = [
      'transactions',
      'categories',
      'budgets',
      'savingsGoals',
      'recurringExpenses',
      'reports',
    ];

    for (const collectionName of collections) {
      const aliceReference = doc(
        aliceDb,
        'users',
        'alice',
        collectionName,
        'record-1'
      );

      await assertSucceeds(
        setDoc(aliceReference, {
          id: 'record-1',
          value: collectionName,
        })
      );

      await assertFails(
        getDoc(
          doc(
            bobDb,
            'users',
            'alice',
            collectionName,
            'record-1'
          )
        )
      );
    }
  });

  it('preserves owner access to legacy AppData', async () => {
    const aliceDb =
      testEnvironment
        .authenticatedContext('alice')
        .firestore();

    const bobDb =
      testEnvironment
        .authenticatedContext('bob')
        .firestore();

    const reference = doc(
      aliceDb,
      'users',
      'alice',
      'private',
      'appData'
    );

    await assertSucceeds(
      setDoc(reference, {
        preserved: true,
      })
    );

    await assertFails(
      getDoc(
        doc(
          bobDb,
          'users',
          'alice',
          'private',
          'appData'
        )
      )
    );
  });
});

describe('Plan repository persistence', () => {
  it('requires new plans to begin as drafts', async () => {
    const activePlan = makePlan(
      'active-on-create',
      {
        status: 'active',
        activatedAt:
          '2026-07-21T13:00:00.000Z',
      }
    );

    await expect(
      repository.createPlan('alice', {
        plan: activePlan,
        initialVersion:
          makeVersion(activePlan),
      })
    ).rejects.toThrow(
      'A new Plan must begin as draft'
    );
  });

  it('creates and reads a Plan with its initial version', async () => {
    const plan = makePlan('plan-1');
    const version = makeVersion(plan);

    await repository.createPlan('alice', {
      plan,
      initialVersion: version,
    });

    await expect(
      repository.getPlan(
        'alice',
        plan.id
      )
    ).resolves.toEqual(plan);

    await expect(
      repository.listPlanVersions(
        'alice',
        plan.id
      )
    ).resolves.toEqual([version]);
  });

  it('creates sequential immutable versions', async () => {
    const plan = makePlan('versioned-plan');
    const firstVersion = makeVersion(plan);

    await repository.createPlan('alice', {
      plan,
      initialVersion: firstVersion,
    });

    const secondVersion = makeVersion(
      plan,
      2
    );

    const result =
      await repository.createPlanVersion(
        'alice',
        plan.id,
        secondVersion
      );

    expect(result.plan).toMatchObject({
      currentVersionId:
        secondVersion.id,
      versionCount: 2,
    });

    await expect(
      repository.createPlanVersion(
        'alice',
        plan.id,
        secondVersion
      )
    ).rejects.toThrow(
      'Plan versions are immutable and cannot be overwritten'
    );
  });

  it('detects overlaps and supports explicit replacement', async () => {
    const firstPlan = makePlan(
      'first-plan'
    );

    const secondPlan = makePlan(
      'second-plan',
      {
        startDate: '2026-07-25',
        endDate: '2026-07-31',
      }
    );

    await repository.createPlan('alice', {
      plan: firstPlan,
      initialVersion:
        makeVersion(firstPlan),
    });

    await repository.createPlan('alice', {
      plan: secondPlan,
      initialVersion:
        makeVersion(secondPlan),
    });

    await repository.updatePlanLifecycle(
      'alice',
      firstPlan.id,
      {
        status: 'active',
        occurredAt:
          '2026-07-21T13:00:00.000Z',
        replacedPlanId: null,
      }
    );

    await expect(
      repository.updatePlanLifecycle(
        'alice',
        secondPlan.id,
        {
          status: 'active',
          occurredAt:
            '2026-07-22T13:00:00.000Z',
          replacedPlanId: null,
        }
      )
    ).rejects.toThrow(
      'An active Plan already overlaps this date range'
    );

    await repository.updatePlanLifecycle(
      'alice',
      secondPlan.id,
      {
        status: 'active',
        occurredAt:
          '2026-07-22T13:00:00.000Z',
        replacedPlanId: firstPlan.id,
      }
    );

    await expect(
      repository.getPlan(
        'alice',
        firstPlan.id
      )
    ).resolves.toMatchObject({
      status: 'archived',
      archivedAt:
        '2026-07-22T13:00:00.000Z',
    });

    await expect(
      repository.getPlan(
        'alice',
        secondPlan.id
      )
    ).resolves.toMatchObject({
      status: 'active',
      replacedPlanId: firstPlan.id,
    });

    const aliceDb =
      testEnvironment
        .authenticatedContext('alice')
        .firestore();

    const releasedReservation =
      await getDoc(
        doc(
          aliceDb,
          'users',
          'alice',
          'planReservations',
          '2026-07-21'
        )
      );

    expect(
      releasedReservation.exists()
    ).toBe(false);

    const replacementReservation =
      await getDoc(
        doc(
          aliceDb,
          'users',
          'alice',
          'planReservations',
          '2026-07-25'
        )
      );

    expect(
      replacementReservation.data()
    ).toMatchObject({
      planId: secondPlan.id,
      userId: 'alice',
    });
  });
});

describe('Plan ownership and immutability rules', () => {
  it('prevents another user from reading a Plan', async () => {
    const plan = makePlan('private-plan');

    await repository.createPlan('alice', {
      plan,
      initialVersion:
        makeVersion(plan),
    });

    const bobDb =
      testEnvironment
        .authenticatedContext('bob')
        .firestore();

    await assertFails(
      getDoc(
        doc(
          bobDb,
          'users',
          'alice',
          'plans',
          plan.id
        )
      )
    );
  });

  it('prevents unauthenticated Plan access', async () => {
    const plan = makePlan(
      'unauthenticated-plan'
    );

    await repository.createPlan('alice', {
      plan,
      initialVersion:
        makeVersion(plan),
    });

    const publicDb =
      testEnvironment
        .unauthenticatedContext()
        .firestore();

    await assertFails(
      getDoc(
        doc(
          publicDb,
          'users',
          'alice',
          'plans',
          plan.id
        )
      )
    );
  });

  it('prevents version updates and deletion', async () => {
    const plan = makePlan(
      'immutable-plan'
    );

    const version = makeVersion(plan);

    await repository.createPlan('alice', {
      plan,
      initialVersion: version,
    });

    const aliceDb =
      testEnvironment
        .authenticatedContext('alice')
        .firestore();

    const versionReference = doc(
      aliceDb,
      'users',
      'alice',
      'plans',
      plan.id,
      'versions',
      version.id
    );

    await assertFails(
      updateDoc(versionReference, {
        summary: 'Mutated summary',
      })
    );

    await assertFails(
      deleteDoc(versionReference)
    );
  });

  it('prevents cross-user reservation writes', async () => {
    const bobDb =
      testEnvironment
        .authenticatedContext('bob')
        .firestore();

    await assertFails(
      setDoc(
        doc(
          bobDb,
          'users',
          'alice',
          'planReservations',
          '2026-07-21'
        ),
        {
          dateKey: '2026-07-21',
          userId: 'alice',
          planId: 'forged-plan',
          startDate: '2026-07-21',
          endDate: '2026-07-27',
          createdAt:
            '2026-07-21T12:00:00.000Z',
        }
      )
    );
  });
});

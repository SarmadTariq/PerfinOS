import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
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
import type { AppData } from '../../src/models/finance';
import type {
  FinancialPlan,
  PlanActionProposal,
  PlanVersion,
} from '../../src/models/planning';
import {
  buildPlanActionPreview,
  type PlanActionSelection,
} from '../../src/planning/planActionApplication';
import {
  buildPlanEvidenceSnapshot,
} from '../../src/planning/planEvidence';
import {
  planEvidenceHorizonForSavedPlan,
} from '../../src/planning/planWorkspace';

const PROJECT_ID = 'demo-perfin-os';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;
const now = '2026-07-23T12:00:00.000Z';

let testEnvironment: RulesTestEnvironment;
let repository:
  typeof import('../../src/services/firebase/planActionRepository');

const data = (): AppData => ({
  user: {
    id: 'alice',
    name: 'Alice',
    email: 'alice@example.test',
    phone: '',
    currency: 'CAD',
    monthlyIncome: 4_000,
    monthlyBudget: 2_000,
    createdAt: now,
  },
  entitlement: {
    plan: 'free',
    isGuest: false,
    features: {
      cloudSync: true,
      receiptUploads: true,
      aiReports: true,
      aiPlanning: true,
      accountRecovery: true,
    },
    createdAt: now,
    updatedAt: now,
  },
  onboarded: true,
  transactions: [
    {
      id: 'transaction-sensitive',
      userId: 'alice',
      type: 'expense',
      amount: 20,
      categoryId: 'cat-food',
      categoryName: 'Food',
      merchant: 'Synthetic merchant',
      date: '2026-07-05',
      notes: 'Synthetic note',
      location: {
        name: 'Synthetic area',
        formattedAddress: 'Synthetic address',
        latitude: 0,
        longitude: 0,
        address: 'Synthetic address',
        source: 'imported',
      },
      paymentMethod: 'Synthetic card',
      isRecurring: false,
      receipts: [
        {
          id: 'receipt-sensitive',
          objectKey: 'synthetic/key',
          fileName: 'synthetic.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 10,
          uploadedAt: now,
          status: 'uploaded',
        },
      ],
      updateCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ],
  categories: [
    {
      id: 'cat-food',
      name: 'Food',
      type: 'expense',
      color: '#000000',
      icon: 'food',
      monthlyBudget: 500,
      isDefault: true,
    },
    {
      id: 'cat-other',
      name: 'Other',
      type: 'expense',
      color: '#111111',
      icon: 'dots-horizontal',
      monthlyBudget: 300,
      isDefault: true,
    },
  ],
  budgets: [
    {
      id: 'budget-2026-07',
      userId: 'alice',
      month: '2026-07',
      totalBudget: 2_000,
      categoryBudgets: {
        'cat-food': 500,
        'cat-other': 300,
      },
      createdAt: now,
      updatedAt: now,
    },
  ],
  savingsGoals: [
    {
      id: 'goal-emergency',
      userId: 'alice',
      name: 'Emergency fund',
      targetAmount: 10_000,
      currentAmount: 2_000,
      targetDate: '2027-07-01',
      createdAt: now,
      updatedAt: now,
    },
  ],
  recurringExpenses: [],
  reports: [],
});

const plan = (): FinancialPlan => ({
  id: 'plan-1',
  userId: 'alice',
  title: 'July Plan',
  currency: 'CAD',
  horizon: 'monthly',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
  status: 'active',
  currentVersionId: 'plan-1-v1',
  versionCount: 1,
  replacedPlanId: null,
  createdAt: now,
  updatedAt: now,
  activatedAt: now,
  completedAt: null,
  archivedAt: null,
});

const revisionFor = (
  currentPlan: FinancialPlan,
  currentData: AppData
): string =>
  buildPlanEvidenceSnapshot({
    user: currentData.user,
    horizon: planEvidenceHorizonForSavedPlan(currentPlan),
    transactions: currentData.transactions,
    categories: currentData.categories,
    budgets: currentData.budgets,
    savingsGoals: currentData.savingsGoals,
    recurringExpenses: currentData.recurringExpenses,
  }).baselineRevision;

const proposal = (
  overrides: Partial<PlanActionProposal> = {}
): PlanActionProposal => ({
  id: 'proposal-budget',
  schemaVersion: 2,
  type: 'budget_adjustment',
  title: 'Set July budget',
  description: 'Use the reviewed monthly limit.',
  targetEntityId: null,
  proposedAmount: 2_250,
  effectiveDate: '2026-07-01',
  evidenceRefs: ['budget.current'],
  requiresConfirmation: true,
  executionState: 'proposal_only',
  ...overrides,
});

const version = (
  currentPlan: FinancialPlan,
  currentData: AppData,
  proposals: PlanActionProposal[]
): PlanVersion => ({
  id: 'plan-1-v1',
  userId: 'alice',
  planId: 'plan-1',
  versionNumber: 1,
  createdAt: now,
  createdBy: 'ai_assisted',
  sourceRevision: revisionFor(currentPlan, currentData),
  evidenceSummary: null,
  generation: null,
  summary: 'Review proposals.',
  assumptions: [],
  allocations: [],
  commitments: [],
  recommendations: [],
  actionProposals: proposals,
  actionProposalIds: proposals.map((candidate) => candidate.id),
  actionProposalApplications: Object.fromEntries(
    proposals.map((candidate) => [
      candidate.id,
      {
        schemaVersion: 2,
        type: candidate.type,
        targetEntityId: candidate.targetEntityId,
        proposedAmount: candidate.proposedAmount,
        effectiveMonth: (
          candidate.effectiveDate ||
          currentPlan.startDate
        ).slice(0, 7),
      },
    ])
  ),
  validation: {
    schemaVersion: 1,
    state: 'valid',
    validatedAt: now,
    errors: [],
    warnings: [],
  },
});

const seed = async (proposals: PlanActionProposal[]) => {
  const currentData = data();
  const currentPlan = plan();
  const currentVersion = version(currentPlan, currentData, proposals);

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await Promise.all([
      setDoc(
        doc(firestore, 'users', 'alice', 'plans', currentPlan.id),
        currentPlan
      ),
      setDoc(
        doc(
          firestore,
          'users',
          'alice',
          'plans',
          currentPlan.id,
          'versions',
          currentVersion.id
        ),
        currentVersion
      ),
      setDoc(
        doc(firestore, 'users', 'alice', 'private', 'appData'),
        currentData
      ),
      setDoc(
        doc(
          firestore,
          'users',
          'alice',
          'budgets',
          currentData.budgets[0].id
        ),
        currentData.budgets[0]
      ),
      setDoc(
        doc(
          firestore,
          'users',
          'alice',
          'savingsGoals',
          currentData.savingsGoals[0].id
        ),
        currentData.savingsGoals[0]
      ),
      ...currentData.categories.map((category) =>
        setDoc(
          doc(
            firestore,
            'users',
            'alice',
            'categories',
            category.id
          ),
          category
        )
      ),
    ]);
  });

  return {
    currentData,
    currentPlan,
    currentVersion,
  };
};

const apply = async ({
  currentData,
  currentPlan,
  currentVersion,
  currentProposal,
  selection,
  applicationId,
}: {
  currentData: AppData;
  currentPlan: FinancialPlan;
  currentVersion: PlanVersion;
  currentProposal: PlanActionProposal;
  selection: PlanActionSelection;
  applicationId: string;
}) => {
  const state = await repository.getPlanActionState(
    'alice',
    currentPlan.id
  );
  const preview = buildPlanActionPreview({
    userId: 'alice',
    plan: currentPlan,
    version: currentVersion,
    proposal: currentProposal,
    data: currentData,
    selection,
    acceptedEvidenceRevision:
      state?.sourceVersionId === currentVersion.id
        ? state.acceptedEvidenceRevision
        : null,
  });
  expect(preview.blocked).toBe(false);
  return repository.applyPlanAction({
    userId: 'alice',
    planId: currentPlan.id,
    sourceVersionId: currentVersion.id,
    proposalId: currentProposal.id,
    applicationId,
    selection,
    confirmedPreviewRevision: preview.previewRevision,
    confirmedPreviewFingerprint: preview.previewFingerprint,
    confirmedEvidenceRevision: preview.currentEvidenceRevision,
    confirmed: true,
    occurredAt: '2026-07-23T13:00:00.000Z',
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
  repository = await import(
    '../../src/services/firebase/planActionRepository'
  );
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

afterAll(async () => {
  await testEnvironment.cleanup();
  vi.doUnmock('../../src/services/firebase/client');
});

describe('Plan action transaction', () => {
  it('atomically updates a total budget without mutating history or sensitive records', async () => {
    const totalProposal = proposal();
    const seeded = await seed([totalProposal]);
    const originalVersion = structuredClone(seeded.currentVersion);
    const originalTransactions = structuredClone(seeded.currentData.transactions);

    await apply({
      ...seeded,
      currentProposal: totalProposal,
      selection: { actionType: 'total_budget_update' },
      applicationId: 'application-total',
    });

    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const budgetSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'budgets', 'budget-2026-07')
    );
    const appDataSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'private', 'appData')
    );

    expect(budgetSnapshot.data()).toMatchObject({
      totalBudget: 2_250,
      categoryBudgets: {
        'cat-food': 500,
        'cat-other': 300,
      },
    });
    expect(
      (appDataSnapshot.data() as AppData).budgets[0]
    ).toMatchObject({
      totalBudget: 2_250,
      categoryBudgets: {
        'cat-food': 500,
        'cat-other': 300,
      },
    });
    await expect(
      repository.listPlanActionResults('alice', 'plan-1')
    ).resolves.toMatchObject([
      {
        status: 'success',
        actionType: 'total_budget_update',
        targetId: 'budget-2026-07',
        beforeValueMinor: 200_000,
        proposedValueMinor: 225_000,
        currency: 'CAD',
        retryable: false,
      },
    ]);
    const versionSnapshot = await getDoc(
      doc(
        aliceDb,
        'users',
        'alice',
        'plans',
        'plan-1',
        'versions',
        'plan-1-v1'
      )
    );
    expect(versionSnapshot.data()).toEqual(originalVersion);
    expect((appDataSnapshot.data() as AppData).transactions).toEqual(
      originalTransactions
    );
  });

  it('atomically updates one category budget and preserves unrelated allocations', async () => {
    const categoryProposal = proposal({
      id: 'proposal-category',
      targetEntityId: 'cat-food',
      proposedAmount: 625,
    });
    const seeded = await seed([categoryProposal]);
    const originalVersion = structuredClone(seeded.currentVersion);

    await apply({
      ...seeded,
      currentProposal: categoryProposal,
      selection: {
        actionType: 'category_budget_update',
        categoryId: 'cat-food',
      },
      applicationId: 'application-category',
    });

    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const budgetSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'budgets', 'budget-2026-07')
    );
    const appDataSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'private', 'appData')
    );
    expect(budgetSnapshot.data()).toMatchObject({
      totalBudget: 2_000,
      categoryBudgets: {
        'cat-food': 625,
        'cat-other': 300,
      },
    });
    expect((appDataSnapshot.data() as AppData).budgets[0]).toMatchObject({
      totalBudget: 2_000,
      categoryBudgets: {
        'cat-food': 625,
        'cat-other': 300,
      },
    });
    const versionSnapshot = await getDoc(
      doc(
        aliceDb,
        'users',
        'alice',
        'plans',
        'plan-1',
        'versions',
        'plan-1-v1'
      )
    );
    expect(versionSnapshot.data()).toEqual(originalVersion);
  });

  it('uses the category default when the monthly budget has no override', async () => {
    const categoryProposal = proposal({
      id: 'proposal-category-fallback',
      targetEntityId: 'cat-food',
      proposedAmount: 625,
    });
    const seeded = await seed([categoryProposal]);
    const fallbackData = structuredClone(seeded.currentData);
    delete fallbackData.budgets[0].categoryBudgets['cat-food'];
    const fallbackVersion = version(
      seeded.currentPlan,
      fallbackData,
      [categoryProposal]
    );

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(
          doc(firestore, 'users', 'alice', 'private', 'appData'),
          fallbackData
        ),
        setDoc(
          doc(
            firestore,
            'users',
            'alice',
            'budgets',
            fallbackData.budgets[0].id
          ),
          fallbackData.budgets[0]
        ),
        setDoc(
          doc(
            firestore,
            'users',
            'alice',
            'plans',
            'plan-1',
            'versions',
            fallbackVersion.id
          ),
          fallbackVersion
        ),
      ]);
    });

    const result = await apply({
      currentData: fallbackData,
      currentPlan: seeded.currentPlan,
      currentVersion: fallbackVersion,
      currentProposal: categoryProposal,
      selection: {
        actionType: 'category_budget_update',
        categoryId: 'cat-food',
      },
      applicationId: 'application-category-fallback',
    });

    expect(result).toMatchObject({
      legacyEntityIndex: 0,
      beforeValueMajor: 500,
      changeValueMajor: 125,
      proposedValueMajor: 625,
    });
    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const budgetSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'budgets', 'budget-2026-07')
    );
    const appDataSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'private', 'appData')
    );
    expect(budgetSnapshot.data()?.categoryBudgets).toEqual({
      'cat-food': 625,
      'cat-other': 300,
    });
    expect(
      (appDataSnapshot.data() as AppData).budgets[0].categoryBudgets
    ).toEqual({
      'cat-food': 625,
      'cat-other': 300,
    });
  });

  it('applies two proposals in sequence without mutating their immutable source version', async () => {
    const totalProposal = proposal();
    const categoryProposal = proposal({
      id: 'proposal-category-sequence',
      targetEntityId: 'cat-food',
      proposedAmount: 625,
    });
    const seeded = await seed([totalProposal, categoryProposal]);
    const originalVersion = structuredClone(seeded.currentVersion);

    await apply({
      ...seeded,
      currentProposal: totalProposal,
      selection: { actionType: 'total_budget_update' },
      applicationId: 'application-sequence-total',
    });

    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const afterFirstSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'private', 'appData')
    );
    const afterFirst = afterFirstSnapshot.data() as AppData;
    await apply({
      currentData: afterFirst,
      currentPlan: seeded.currentPlan,
      currentVersion: seeded.currentVersion,
      currentProposal: categoryProposal,
      selection: {
        actionType: 'category_budget_update',
        categoryId: 'cat-food',
      },
      applicationId: 'application-sequence-category',
    });

    const versionSnapshot = await getDoc(
      doc(
        aliceDb,
        'users',
        'alice',
        'plans',
        'plan-1',
        'versions',
        'plan-1-v1'
      )
    );
    const finalDataSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'private', 'appData')
    );
    const state = await repository.getPlanActionState('alice', 'plan-1');
    expect(versionSnapshot.data()).toEqual(originalVersion);
    expect((finalDataSnapshot.data() as AppData).budgets[0]).toMatchObject({
      totalBudget: 2_250,
      categoryBudgets: {
        'cat-food': 625,
        'cat-other': 300,
      },
    });
    expect(state).toMatchObject({
      sourceVersionId: 'plan-1-v1',
      appliedProposalIds: [
        'proposal-budget',
        'proposal-category-sequence',
      ],
      lastApplicationId: 'application-sequence-category',
    });
    await expect(
      repository.listPlanActionResults('alice', 'plan-1')
    ).resolves.toHaveLength(2);
  });

  it('rolls action state forward when a new immutable version becomes current', async () => {
    const firstProposal = proposal();
    const seeded = await seed([firstProposal]);
    const originalVersion = structuredClone(seeded.currentVersion);
    await apply({
      ...seeded,
      currentProposal: firstProposal,
      selection: { actionType: 'total_budget_update' },
      applicationId: 'application-v1',
    });

    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const currentDataSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'private', 'appData')
    );
    const currentData = currentDataSnapshot.data() as AppData;
    const nextPlan: FinancialPlan = {
      ...seeded.currentPlan,
      currentVersionId: 'plan-1-v2',
      versionCount: 2,
      updatedAt: '2026-07-23T14:00:00.000Z',
    };
    const nextProposal = proposal({
      id: 'proposal-v2',
      proposedAmount: 2_400,
    });
    const nextVersion = version(
      nextPlan,
      currentData,
      [nextProposal]
    );
    nextVersion.id = 'plan-1-v2';
    nextVersion.versionNumber = 2;
    nextVersion.createdAt = '2026-07-23T14:00:00.000Z';

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(
          doc(firestore, 'users', 'alice', 'plans', 'plan-1'),
          nextPlan
        ),
        setDoc(
          doc(
            firestore,
            'users',
            'alice',
            'plans',
            'plan-1',
            'versions',
            nextVersion.id
          ),
          nextVersion
        ),
      ]);
    });

    await apply({
      currentData,
      currentPlan: nextPlan,
      currentVersion: nextVersion,
      currentProposal: nextProposal,
      selection: { actionType: 'total_budget_update' },
      applicationId: 'application-v2',
    });

    const state = await repository.getPlanActionState('alice', 'plan-1');
    expect(state).toMatchObject({
      sourceVersionId: 'plan-1-v2',
      appliedProposalIds: ['proposal-v2'],
      lastApplicationId: 'application-v2',
    });
    const firstVersionSnapshot = await getDoc(
      doc(
        aliceDb,
        'users',
        'alice',
        'plans',
        'plan-1',
        'versions',
        'plan-1-v1'
      )
    );
    expect(firstVersionSnapshot.data()).toEqual(originalVersion);
  });

  it('blocks divergent unrelated budget and savings mirror fields', async () => {
    const budgetProposal = proposal();
    const budgetSeed = await seed([budgetProposal]);
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(
        doc(
          context.firestore(),
          'users',
          'alice',
          'budgets',
          'budget-2026-07'
        ),
        { 'categoryBudgets.cat-other': 999 }
      );
    });
    await expect(
      apply({
        ...budgetSeed,
        currentProposal: budgetProposal,
        selection: { actionType: 'total_budget_update' },
        applicationId: 'application-divergent-budget',
      })
    ).rejects.toThrow('workspace mirror disagree');

    await testEnvironment.clearFirestore();
    const savingsProposal = proposal({
      id: 'proposal-divergent-savings',
      type: 'savings_contribution',
      proposedAmount: 500,
    });
    const savingsSeed = await seed([savingsProposal]);
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(
        doc(
          context.firestore(),
          'users',
          'alice',
          'savingsGoals',
          'goal-emergency'
        ),
        { name: 'Divergent entity name' }
      );
    });
    await expect(
      apply({
        ...savingsSeed,
        currentProposal: savingsProposal,
        selection: {
          actionType: 'savings_goal_update',
          goalId: 'goal-emergency',
        },
        applicationId: 'application-divergent-savings',
      })
    ).rejects.toThrow('workspace mirror disagree');
    await expect(
      repository.listPlanActionResults('alice', 'plan-1')
    ).resolves.toEqual([]);

    await testEnvironment.clearFirestore();
    const categoryProposal = proposal({
      id: 'proposal-divergent-category',
      targetEntityId: 'cat-food',
      proposedAmount: 625,
    });
    const categorySeed = await seed([categoryProposal]);
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(
        doc(
          context.firestore(),
          'users',
          'alice',
          'categories',
          'cat-food'
        ),
        { monthlyBudget: 525 }
      );
    });
    await expect(
      apply({
        ...categorySeed,
        currentProposal: categoryProposal,
        selection: {
          actionType: 'category_budget_update',
          categoryId: 'cat-food',
        },
        applicationId: 'application-divergent-category',
      })
    ).rejects.toThrow('category entity and workspace mirror disagree');
    await expect(
      repository.listPlanActionResults('alice', 'plan-1')
    ).resolves.toEqual([]);
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await deleteDoc(
        doc(
          context.firestore(),
          'users',
          'alice',
          'categories',
          'cat-food'
        )
      );
    });
    await expect(
      apply({
        ...categorySeed,
        currentProposal: categoryProposal,
        selection: {
          actionType: 'category_budget_update',
          categoryId: 'cat-food',
        },
        applicationId: 'application-missing-category',
      })
    ).rejects.toThrow('category entity no longer exists');
  });

  it('creates and updates savings goals with absolute reviewed values', async () => {
    const createProposal = proposal({
      id: 'proposal-create',
      type: 'savings_contribution',
      proposedAmount: 500,
    });
    const seeded = await seed([createProposal]);
    const selection: PlanActionSelection = {
      actionType: 'savings_goal_create',
      goalId: 'goal-proposal-create',
      goalName: 'Travel fund',
      targetAmountMinor: 200_000,
      targetDate: '2027-01-01',
    };
    await apply({
      ...seeded,
      currentProposal: createProposal,
      selection,
      applicationId: 'application-create',
    });

    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const createdSnapshot = await getDoc(
      doc(
        aliceDb,
        'users',
        'alice',
        'savingsGoals',
        'goal-proposal-create'
      )
    );
    expect(createdSnapshot.data()).toMatchObject({
      name: 'Travel fund',
      targetAmount: 2_000,
      currentAmount: 500,
    });

    await testEnvironment.clearFirestore();
    const updateProposal = proposal({
      id: 'proposal-update',
      type: 'savings_contribution',
      proposedAmount: 2_500,
    });
    const updateSeed = await seed([updateProposal]);
    await apply({
      ...updateSeed,
      currentProposal: updateProposal,
      selection: {
        actionType: 'savings_goal_update',
        goalId: 'goal-emergency',
      },
      applicationId: 'application-update',
    });
    const updatedSnapshot = await getDoc(
      doc(
        aliceDb,
        'users',
        'alice',
        'savingsGoals',
        'goal-emergency'
      )
    );
    expect(updatedSnapshot.data()).toMatchObject({
      currentAmount: 4_500,
      targetAmount: 10_000,
    });
  });

  it('returns duplicate applications once and rejects id collisions', async () => {
    const currentProposal = proposal();
    const seeded = await seed([currentProposal]);
    const selection: PlanActionSelection = {
      actionType: 'total_budget_update',
    };
    const preview = buildPlanActionPreview({
      userId: 'alice',
      plan: seeded.currentPlan,
      version: seeded.currentVersion,
      proposal: currentProposal,
      data: seeded.currentData,
      selection,
    });
    const request = {
      userId: 'alice',
      planId: seeded.currentPlan.id,
      sourceVersionId: seeded.currentVersion.id,
      proposalId: currentProposal.id,
      applicationId: 'application-once',
      selection,
      confirmedPreviewRevision: preview.previewRevision,
      confirmedPreviewFingerprint: preview.previewFingerprint,
      confirmedEvidenceRevision: preview.currentEvidenceRevision,
      confirmed: true as const,
      occurredAt: '2026-07-23T13:00:00.000Z',
    };
    const first = await repository.applyPlanAction(request);
    const duplicate = await repository.applyPlanAction(request);
    expect(duplicate).toEqual(first);
    await expect(
      repository.applyPlanAction({
        ...request,
        selection: {
          actionType: 'category_budget_update',
          categoryId: 'cat-food',
        },
      })
    ).rejects.toThrow('application id is already bound');
    await expect(
      repository.applyPlanAction({
        ...request,
        applicationId: 'application-same-proposal-new-id',
      })
    ).rejects.toThrow(
      'already has a successful application'
    );

    await expect(
      repository.applyPlanAction({
        ...request,
        proposalId: 'proposal-other',
      })
    ).rejects.toThrow();
    await expect(
      repository.listPlanActionResults('alice', 'plan-1')
    ).resolves.toHaveLength(1);
  });

  it('rejects late outcomes after success and binds outcome duplicates exactly', async () => {
    const currentProposal = proposal();
    const seeded = await seed([currentProposal]);
    await apply({
      ...seeded,
      currentProposal,
      selection: { actionType: 'total_budget_update' },
      applicationId: 'application-success-before-cancel',
    });

    await expect(
      repository.recordPlanActionOutcome({
        userId: 'alice',
        planId: 'plan-1',
        sourceVersionId: seeded.currentVersion.id,
        proposalId: currentProposal.id,
        applicationId: 'application-late-cancel',
        selection: { actionType: 'total_budget_update' },
        status: 'canceled',
        occurredAt: '2026-07-23T14:00:00.000Z',
      })
    ).rejects.toThrow('already has a successful application');

    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const [successfulResult] =
      await repository.listPlanActionResults('alice', 'plan-1');
    await assertFails(
      setDoc(
        doc(
          aliceDb,
          'users',
          'alice',
          'plans',
          'plan-1',
          'actionResults',
          'direct-late-cancel'
        ),
        {
          ...successfulResult,
          id: 'direct-late-cancel',
          status: 'canceled',
          failureCode: null,
          appliedAt: serverTimestamp(),
        }
      )
    );

    await testEnvironment.clearFirestore();
    const outcomeSeed = await seed([currentProposal]);
    const outcomeRequest = {
      userId: 'alice',
      planId: 'plan-1',
      sourceVersionId: outcomeSeed.currentVersion.id,
      proposalId: currentProposal.id,
      applicationId: 'application-outcome-once',
      selection: {
        actionType: 'total_budget_update' as const,
      },
      status: 'canceled' as const,
      occurredAt: '2026-07-23T14:00:00.000Z',
    };
    const first = await repository.recordPlanActionOutcome(outcomeRequest);
    await expect(
      repository.recordPlanActionOutcome(outcomeRequest)
    ).resolves.toEqual(first);
    await expect(
      repository.recordPlanActionOutcome({
        ...outcomeRequest,
        selection: {
          actionType: 'category_budget_update',
          categoryId: 'cat-food',
        },
      })
    ).rejects.toThrow('application id is already bound');
  });

  it('leaves entity, app data, and results unchanged when the current value is stale', async () => {
    const currentProposal = proposal();
    const seeded = await seed([currentProposal]);
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(
        doc(
          context.firestore(),
          'users',
          'alice',
          'budgets',
          'budget-2026-07'
        ),
        { totalBudget: 2_100 }
      );
    });

    await expect(
      apply({
        ...seeded,
        currentProposal,
        selection: { actionType: 'total_budget_update' },
        applicationId: 'application-stale',
      })
    ).rejects.toThrow('workspace mirror disagree');

    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const appDataSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'private', 'appData')
    );
    expect((appDataSnapshot.data() as AppData).budgets[0].totalBudget).toBe(
      2_000
    );
    await expect(
      repository.listPlanActionResults('alice', 'plan-1')
    ).resolves.toEqual([]);
  });

  it('keeps action results owner-only and immutable', async () => {
    const currentProposal = proposal();
    const seeded = await seed([currentProposal]);
    await apply({
      ...seeded,
      currentProposal,
      selection: { actionType: 'total_budget_update' },
      applicationId: 'application-rules',
    });

    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const bobDb = testEnvironment.authenticatedContext('bob').firestore();
    const aliceResult = doc(
      aliceDb,
      'users',
      'alice',
      'plans',
      'plan-1',
      'actionResults',
      'application-rules'
    );
    await assertFails(updateDoc(aliceResult, { status: 'blocked' }));
    await assertFails(deleteDoc(aliceResult));
    await assertFails(
      getDoc(
        doc(
          bobDb,
          'users',
          'alice',
          'plans',
          'plan-1',
          'actionResults',
          'application-rules'
        )
      )
    );
  });

  it('records cancellation without mutating financial entities', async () => {
    const currentProposal = proposal();
    const seeded = await seed([currentProposal]);
    const originalVersion = structuredClone(seeded.currentVersion);
    const originalTransactions = structuredClone(seeded.currentData.transactions);
    const selection: PlanActionSelection = {
      actionType: 'total_budget_update',
    };
    await repository.recordPlanActionOutcome({
      userId: 'alice',
      planId: seeded.currentPlan.id,
      sourceVersionId: seeded.currentVersion.id,
      proposalId: currentProposal.id,
      applicationId: 'application-canceled',
      selection,
      status: 'canceled',
      occurredAt: '2026-07-23T13:00:00.000Z',
    });

    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const budgetSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'budgets', 'budget-2026-07')
    );
    const appDataSnapshot = await getDoc(
      doc(aliceDb, 'users', 'alice', 'private', 'appData')
    );
    expect(budgetSnapshot.data()).toMatchObject({ totalBudget: 2_000 });
    expect((appDataSnapshot.data() as AppData).budgets[0].totalBudget).toBe(
      2_000
    );
    expect((appDataSnapshot.data() as AppData).transactions).toEqual(
      originalTransactions
    );
    const versionSnapshot = await getDoc(
      doc(
        aliceDb,
        'users',
        'alice',
        'plans',
        'plan-1',
        'versions',
        'plan-1-v1'
      )
    );
    expect(versionSnapshot.data()).toEqual(originalVersion);
    await expect(
      repository.listPlanActionResults('alice', 'plan-1')
    ).resolves.toMatchObject([{ status: 'canceled' }]);
    await expect(
      apply({
        ...seeded,
        currentProposal,
        selection,
        applicationId: 'application-canceled',
      })
    ).rejects.toThrow(
      'already bound to a different action or outcome'
    );
  });

  it('requires runtime confirmation and reconstructs a blocked stale outcome', async () => {
    const currentProposal = proposal();
    const seeded = await seed([currentProposal]);
    const selection: PlanActionSelection = {
      actionType: 'total_budget_update',
    };
    const preview = buildPlanActionPreview({
      userId: 'alice',
      plan: seeded.currentPlan,
      version: seeded.currentVersion,
      proposal: currentProposal,
      data: seeded.currentData,
      selection,
    });
    await expect(
      repository.applyPlanAction({
        userId: 'alice',
        planId: seeded.currentPlan.id,
        sourceVersionId: seeded.currentVersion.id,
        proposalId: currentProposal.id,
        applicationId: 'application-unconfirmed',
        selection,
        confirmedPreviewRevision: preview.previewRevision,
        confirmedPreviewFingerprint: preview.previewFingerprint,
        confirmedEvidenceRevision: preview.currentEvidenceRevision,
        confirmed: false,
        occurredAt: '2026-07-23T13:00:00.000Z',
      } as unknown as Parameters<typeof repository.applyPlanAction>[0])
    ).rejects.toThrow('Explicit confirmation is required');

    const changedData = {
      ...seeded.currentData,
      budgets: [
        {
          ...seeded.currentData.budgets[0],
          totalBudget: 2_100,
        },
      ],
    };
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await Promise.all([
        setDoc(
          doc(firestore, 'users', 'alice', 'private', 'appData'),
          changedData
        ),
        setDoc(
          doc(
            firestore,
            'users',
            'alice',
            'budgets',
            'budget-2026-07'
          ),
          changedData.budgets[0]
        ),
      ]);
    });
    const blocked = await repository.recordPlanActionOutcome({
      userId: 'alice',
      planId: seeded.currentPlan.id,
      sourceVersionId: seeded.currentVersion.id,
      proposalId: currentProposal.id,
      applicationId: 'application-blocked',
      selection,
      status: 'blocked',
      occurredAt: '2026-07-23T13:00:00.000Z',
    });
    expect(blocked).toMatchObject({
      status: 'blocked',
      failureCode: 'stale_evidence',
      retryable: false,
    });
    await expect(
      repository.getPlanActionState('alice', 'plan-1')
    ).resolves.toBeNull();
  });

  it('rules reject forged success without a finance write or known proposal', async () => {
    const currentProposal = proposal();
    const seeded = await seed([currentProposal]);
    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const resultPath = (
      id: string
    ) => doc(
      aliceDb,
      'users',
      'alice',
      'plans',
      'plan-1',
      'actionResults',
      id
    );
    const statePath = doc(
      aliceDb,
      'users',
      'alice',
      'plans',
      'plan-1',
      'actionState',
      'current'
    );
    const forgedResult = (
      id: string,
      proposalId: string
    ) => ({
      schemaVersion: 1,
      id,
      userId: 'alice',
      planId: 'plan-1',
      sourceVersionId: seeded.currentVersion.id,
      proposalId,
      previewFingerprint: 'forged-preview',
      selectionDigest: 'forged-selection',
      actionType: 'total_budget_update',
      targetKind: 'budget',
      targetId: 'budget-2026-07',
      financeDocumentId: 'budget-2026-07',
      targetMonth: '2026-07',
      legacyEntityIndex: 0,
      status: 'success',
      failureCode: null,
      retryable: false,
      currency: 'CAD',
      beforeValueMinor: 200_000,
      beforeValueMajor: 2_000,
      changeValueMinor: 25_000,
      changeValueMajor: 250,
      proposedValueMinor: 225_000,
      proposedValueMajor: 2_250,
      confirmedEvidenceRevision: seeded.currentVersion.sourceRevision,
      postEvidenceRevision: 'forged-post-revision',
      previewRevision: 'forged-revision',
      appliedAt: serverTimestamp(),
    });
    const forgedState = (
      applicationId: string,
      proposalId: string
    ) => ({
      schemaVersion: 1,
      id: 'current',
      userId: 'alice',
      planId: 'plan-1',
      sourceVersionId: seeded.currentVersion.id,
      acceptedEvidenceRevision: 'forged-post-revision',
      appliedProposalIds: [proposalId],
      lastApplicationId: applicationId,
      updatedAt: serverTimestamp(),
    });

    const missingWrite = writeBatch(aliceDb);
    missingWrite.set(
      resultPath('forged-missing-write'),
      forgedResult('forged-missing-write', currentProposal.id)
    );
    missingWrite.set(
      statePath,
      forgedState('forged-missing-write', currentProposal.id)
    );
    await assertFails(missingWrite.commit());

    const omittedLegacyMirror = writeBatch(aliceDb);
    omittedLegacyMirror.update(
      doc(
        aliceDb,
        'users',
        'alice',
        'budgets',
        'budget-2026-07'
      ),
      { totalBudget: 2_250 }
    );
    omittedLegacyMirror.set(
      resultPath('forged-omitted-legacy'),
      forgedResult('forged-omitted-legacy', currentProposal.id)
    );
    omittedLegacyMirror.set(
      statePath,
      forgedState('forged-omitted-legacy', currentProposal.id)
    );
    await assertFails(omittedLegacyMirror.commit());

    const mismatchedData = structuredClone(seeded.currentData);
    mismatchedData.budgets[0].totalBudget = 2_300;
    const mismatchedProposal = writeBatch(aliceDb);
    mismatchedProposal.set(
      doc(
        aliceDb,
        'users',
        'alice',
        'budgets',
        'budget-2026-07'
      ),
      mismatchedData.budgets[0]
    );
    mismatchedProposal.set(
      doc(aliceDb, 'users', 'alice', 'private', 'appData'),
      mismatchedData
    );
    mismatchedProposal.set(
      resultPath('forged-proposal-amount'),
      {
        ...forgedResult(
          'forged-proposal-amount',
          currentProposal.id
        ),
        changeValueMinor: 30_000,
        changeValueMajor: 300,
        proposedValueMinor: 230_000,
        proposedValueMajor: 2_300,
      }
    );
    mismatchedProposal.set(
      statePath,
      forgedState('forged-proposal-amount', currentProposal.id)
    );
    await assertFails(mismatchedProposal.commit());

    const wrongMonthData = structuredClone(seeded.currentData);
    wrongMonthData.budgets[0] = {
      ...wrongMonthData.budgets[0],
      month: '2026-08',
      totalBudget: 2_250,
    };
    const wrongMonth = writeBatch(aliceDb);
    wrongMonth.set(
      doc(
        aliceDb,
        'users',
        'alice',
        'budgets',
        'budget-2026-07'
      ),
      wrongMonthData.budgets[0]
    );
    wrongMonth.set(
      doc(aliceDb, 'users', 'alice', 'private', 'appData'),
      wrongMonthData
    );
    wrongMonth.set(
      resultPath('forged-wrong-month'),
      {
        ...forgedResult(
          'forged-wrong-month',
          currentProposal.id
        ),
        targetMonth: '2026-08',
      }
    );
    wrongMonth.set(
      statePath,
      forgedState('forged-wrong-month', currentProposal.id)
    );
    await assertFails(wrongMonth.commit());

    const unknownProposal = writeBatch(aliceDb);
    unknownProposal.update(
      doc(
        aliceDb,
        'users',
        'alice',
        'budgets',
        'budget-2026-07'
      ),
      { totalBudget: 2_250 }
    );
    unknownProposal.set(
      resultPath('forged-unknown-proposal'),
      forgedResult('forged-unknown-proposal', 'unknown-proposal')
    );
    unknownProposal.set(
      statePath,
      forgedState('forged-unknown-proposal', 'unknown-proposal')
    );
    await assertFails(unknownProposal.commit());
  });

  it('rules reject a forged no-op success even when proposal metadata matches', async () => {
    const noOpProposal = proposal({ proposedAmount: 2_000 });
    const seeded = await seed([noOpProposal]);
    const aliceDb = testEnvironment.authenticatedContext('alice').firestore();
    const batch = writeBatch(aliceDb);
    batch.set(
      doc(
        aliceDb,
        'users',
        'alice',
        'plans',
        'plan-1',
        'actionResults',
        'forged-no-op'
      ),
      {
        schemaVersion: 1,
        id: 'forged-no-op',
        userId: 'alice',
        planId: 'plan-1',
        sourceVersionId: seeded.currentVersion.id,
        proposalId: noOpProposal.id,
        previewFingerprint: 'forged-preview',
        selectionDigest: 'forged-selection',
        actionType: 'total_budget_update',
        targetKind: 'budget',
        targetId: 'budget-2026-07',
        financeDocumentId: 'budget-2026-07',
        targetMonth: '2026-07',
        legacyEntityIndex: 0,
        status: 'success',
        failureCode: null,
        retryable: false,
        currency: 'CAD',
        beforeValueMinor: 200_000,
        beforeValueMajor: 2_000,
        changeValueMinor: 0,
        changeValueMajor: 0,
        proposedValueMinor: 200_000,
        proposedValueMajor: 2_000,
        confirmedEvidenceRevision: seeded.currentVersion.sourceRevision,
        postEvidenceRevision: 'forged-post-revision',
        previewRevision: 'forged-revision',
        appliedAt: serverTimestamp(),
      }
    );
    batch.set(
      doc(
        aliceDb,
        'users',
        'alice',
        'plans',
        'plan-1',
        'actionState',
        'current'
      ),
      {
        schemaVersion: 1,
        id: 'current',
        userId: 'alice',
        planId: 'plan-1',
        sourceVersionId: seeded.currentVersion.id,
        acceptedEvidenceRevision: 'forged-post-revision',
        appliedProposalIds: [noOpProposal.id],
        lastApplicationId: 'forged-no-op',
        updatedAt: serverTimestamp(),
      }
    );

    await assertFails(batch.commit());
  });
});

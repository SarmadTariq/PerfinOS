import { describe, expect, it } from 'vitest';
import type { AppData } from '../../src/models/finance';
import type {
  FinancialPlan,
  PlanActionProposal,
  PlanVersion,
} from '../../src/models/planning';
import {
  buildPlanEvidenceSnapshot,
} from '../../src/planning/planEvidence';
import {
  buildPlanActionPreview,
  isPlanActionProposalSupported,
  workspaceRevisionToken,
} from '../../src/planning/planActionApplication';
import {
  planEvidenceHorizonForSavedPlan,
} from '../../src/planning/planWorkspace';

const now = '2026-07-23T12:00:00.000Z';

const data = (
  overrides: Partial<AppData> = {}
): AppData => ({
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
  transactions: [],
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
  ],
  budgets: [
    {
      id: 'budget-2026-07',
      userId: 'alice',
      month: '2026-07',
      totalBudget: 2_000,
      categoryBudgets: {
        'cat-food': 500,
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
  ...overrides,
});

const plan = (
  overrides: Partial<FinancialPlan> = {}
): FinancialPlan => ({
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
  ...overrides,
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

const version = (
  currentPlan: FinancialPlan,
  currentData: AppData,
  overrides: Partial<PlanVersion> = {}
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
  summary: 'Review the proposed changes.',
  assumptions: [],
  allocations: [],
  commitments: [],
  recommendations: [],
  actionProposals: [],
  validation: {
    schemaVersion: 1,
    state: 'valid',
    validatedAt: now,
    errors: [],
    warnings: [],
  },
  ...overrides,
});

const proposal = (
  overrides: Partial<PlanActionProposal> = {}
): PlanActionProposal => ({
  id: 'proposal-1',
  schemaVersion: 2,
  type: 'budget_adjustment',
  title: 'Set July budget',
  description: 'Keep monthly spending within the reviewed limit.',
  targetEntityId: null,
  proposedAmount: 2_250,
  effectiveDate: '2026-07-01',
  evidenceRefs: ['budget.current'],
  requiresConfirmation: true,
  executionState: 'proposal_only',
  ...overrides,
});

const previewInput = (
  overrides: Partial<Parameters<typeof buildPlanActionPreview>[0]> = {}
) => {
  const currentPlan = overrides.plan || plan();
  const currentData = overrides.data || data();
  return {
    userId:
      overrides.userId === undefined
        ? 'alice'
        : overrides.userId,
    plan: currentPlan,
    data: currentData,
    version:
      overrides.version ||
      version(currentPlan, currentData),
    proposal: overrides.proposal || proposal(),
    workspaceRevision: overrides.workspaceRevision,
    acceptedEvidenceRevision:
      overrides.acceptedEvidenceRevision,
    selection:
      overrides.selection || {
        actionType: 'total_budget_update' as const,
      },
  };
};

describe('Plan action preview', () => {
  it('previews an exact total-budget update with bounded evidence', () => {
    const result = buildPlanActionPreview(previewInput());

    expect(result).toMatchObject({
      actionType: 'total_budget_update',
      targetKind: 'budget',
      targetId: 'budget-2026-07',
      targetMonth: '2026-07',
      currentValueMinor: 200_000,
      proposedValueMinor: 225_000,
      currency: 'CAD',
      evidenceRefs: ['budget.current'],
      blocked: false,
      stale: false,
      failureCode: null,
    });
    expect(result.previewFingerprint).toHaveLength(16);
  });

  it('previews a category-budget update without changing unrelated categories', () => {
    const result = buildPlanActionPreview(
      previewInput({
        selection: {
          actionType: 'category_budget_update',
          categoryId: 'cat-food',
        },
        proposal: proposal({
          targetEntityId: 'cat-food',
          proposedAmount: 625,
        }),
      })
    );

    expect(result).toMatchObject({
      actionType: 'category_budget_update',
      targetKind: 'category_budget',
      targetId: 'cat-food',
      currentValueMinor: 50_000,
      proposedValueMinor: 62_500,
      blocked: false,
    });
  });

  it('previews savings-goal creation and update as absolute values', () => {
    const savingsProposal = proposal({
      type: 'savings_contribution',
      proposedAmount: 2_500,
      evidenceRefs: ['savings.progress'],
    });
    const created = buildPlanActionPreview(
      previewInput({
        proposal: savingsProposal,
        selection: {
          actionType: 'savings_goal_create',
          goalId: 'goal-proposal-1',
          goalName: 'Travel fund',
          targetAmountMinor: 500_000,
          targetDate: '2027-01-01',
        },
      })
    );
    const updated = buildPlanActionPreview(
      previewInput({
        proposal: savingsProposal,
        selection: {
          actionType: 'savings_goal_update',
          goalId: 'goal-emergency',
        },
      })
    );

    expect(created).toMatchObject({
      actionType: 'savings_goal_create',
      targetId: 'goal-proposal-1',
      currentValueMinor: null,
      changeValueMinor: 250_000,
      proposedValueMinor: 250_000,
      blocked: false,
    });
    expect(updated).toMatchObject({
      actionType: 'savings_goal_update',
      targetId: 'goal-emergency',
      currentValueMinor: 200_000,
      changeValueMinor: 250_000,
      proposedValueMinor: 450_000,
      blocked: false,
    });
  });

  it.each([
    ['missing auth', { userId: null }, 'authentication_required'],
    [
      'inactive Plan',
      { plan: plan({ status: 'draft' }) },
      'inactive_plan',
    ],
    [
      'historical version',
      { plan: plan({ currentVersionId: 'plan-1-v2' }) },
      'historical_version',
    ],
    [
      'wrong currency',
      { data: data({ user: { ...data().user, currency: 'USD' } }) },
      'currency_mismatch',
    ],
  ])('blocks %s', (_label, overrides, failureCode) => {
    const result = buildPlanActionPreview(
      previewInput(
        overrides as Partial<Parameters<typeof buildPlanActionPreview>[0]>
      )
    );
    expect(result).toMatchObject({
      blocked: true,
      failureCode,
    });
  });

  it('blocks stale evidence and deleted or unauthorized targets', () => {
    const currentPlan = plan();
    const originalData = data();
    const originalVersion = version(currentPlan, originalData);
    const changedData = data({
      budgets: [
        {
          ...originalData.budgets[0],
          totalBudget: 2_100,
        },
      ],
    });

    expect(
      buildPlanActionPreview(
        previewInput({
          data: changedData,
          version: originalVersion,
        })
      )
    ).toMatchObject({
      blocked: true,
      stale: true,
      failureCode: 'stale_evidence',
    });

    expect(
      buildPlanActionPreview(
        previewInput({
          data: data({ budgets: [] }),
        })
      )
    ).toMatchObject({
      blocked: true,
      failureCode: 'target_missing',
    });

    const unauthorizedData = data({
      budgets: [{ ...data().budgets[0], userId: 'bob' }],
    });
    expect(
      buildPlanActionPreview(
        previewInput({
          data: unauthorizedData,
          version: version(currentPlan, unauthorizedData),
        })
      )
    ).toMatchObject({
      blocked: true,
      failureCode: 'target_unauthorized',
    });
  });

  it('keeps recurring and custom proposals non-mutating', () => {
    expect(
      isPlanActionProposalSupported(
        proposal({ type: 'recurring_review' })
      )
    ).toBe(false);
    expect(
      isPlanActionProposalSupported(
        proposal({ type: 'custom' })
      )
    ).toBe(false);
    expect(
      isPlanActionProposalSupported(
        proposal({ schemaVersion: 1 })
      )
    ).toBe(false);
    expect(
      buildPlanActionPreview(
        previewInput({
          proposal: proposal({ schemaVersion: 1 }),
        })
      )
    ).toMatchObject({
      blocked: true,
      failureCode: 'unsupported_action',
    });
  });

  it('blocks proposal target redirection', () => {
    expect(
      buildPlanActionPreview(
        previewInput({
          proposal: proposal({ targetEntityId: 'cat-food' }),
          selection: { actionType: 'total_budget_update' },
        })
      )
    ).toMatchObject({
      blocked: true,
      failureCode: 'invalid_request',
    });

    const extraCategoryData = data({
      categories: [
        ...data().categories,
        {
          ...data().categories[0],
          id: 'cat-other',
          name: 'Other',
        },
      ],
    });
    expect(
      buildPlanActionPreview(
        previewInput({
          data: extraCategoryData,
          version: version(plan(), extraCategoryData),
          proposal: proposal({ targetEntityId: 'cat-food' }),
          selection: {
            actionType: 'category_budget_update',
            categoryId: 'cat-other',
          },
        })
      )
    ).toMatchObject({
      blocked: true,
      failureCode: 'target_unauthorized',
    });

    expect(
      buildPlanActionPreview(
        previewInput({
          proposal: proposal({
            type: 'savings_contribution',
            targetEntityId: 'goal-emergency',
          }),
          selection: {
            actionType: 'savings_goal_create',
            goalId: 'goal-new',
            goalName: 'New goal',
            targetAmountMinor: 500_000,
            targetDate: '2027-01-01',
          },
        })
      )
    ).toMatchObject({
      blocked: true,
      failureCode: 'invalid_request',
    });
  });

  it.each([
    ['negative value', -1, 'amount_out_of_bounds'],
    ['non-finite value', Number.POSITIVE_INFINITY, 'amount_out_of_bounds'],
    ['unsafe value', Number.MAX_SAFE_INTEGER, 'amount_out_of_bounds'],
  ])('blocks %s', (_label, proposedAmount, failureCode) => {
    expect(
      buildPlanActionPreview(
        previewInput({
          proposal: proposal({ proposedAmount }),
        })
      )
    ).toMatchObject({
      blocked: true,
      failureCode,
    });
  });

  it('blocks budget and savings actions that would make no change', () => {
    expect(
      buildPlanActionPreview(
        previewInput({
          proposal: proposal({ proposedAmount: 2_000 }),
        })
      )
    ).toMatchObject({
      blocked: true,
      failureCode: 'current_value_changed',
    });
    expect(
      buildPlanActionPreview(
        previewInput({
          proposal: proposal({
            type: 'savings_contribution',
            proposedAmount: 0,
          }),
          selection: {
            actionType: 'savings_goal_update',
            goalId: 'goal-emergency',
          },
        })
      )
    ).toMatchObject({
      blocked: true,
      failureCode: 'current_value_changed',
    });
  });

  it.each([
    [
      'blank name',
      {
        actionType: 'savings_goal_create' as const,
        goalId: 'goal-new',
        goalName: ' ',
        targetAmountMinor: 500_000,
        targetDate: '2027-01-01',
      },
      'invalid_request',
    ],
    [
      'invalid date',
      {
        actionType: 'savings_goal_create' as const,
        goalId: 'goal-new',
        goalName: 'New goal',
        targetAmountMinor: 500_000,
        targetDate: 'next year',
      },
      'invalid_request',
    ],
    [
      'target below balance',
      {
        actionType: 'savings_goal_create' as const,
        goalId: 'goal-new',
        goalName: 'New goal',
        targetAmountMinor: 100_000,
        targetDate: '2027-01-01',
      },
      'amount_out_of_bounds',
    ],
  ])('blocks savings creation with %s', (_label, selection, failureCode) => {
    expect(
      buildPlanActionPreview(
        previewInput({
          proposal: proposal({
            type: 'savings_contribution',
            proposedAmount: 2_500,
          }),
          selection,
        })
      )
    ).toMatchObject({
      blocked: true,
      failureCode,
    });
  });

  it('produces a stable idempotency fingerprint and detects selection changes', () => {
    const first = buildPlanActionPreview(previewInput());
    const duplicate = buildPlanActionPreview(previewInput());
    const different = buildPlanActionPreview(
      previewInput({
        selection: {
          actionType: 'category_budget_update',
          categoryId: 'cat-food',
        },
      })
    );

    expect(duplicate.previewFingerprint).toBe(first.previewFingerprint);
    expect(different.previewFingerprint).not.toBe(first.previewFingerprint);
  });

  it('uses workspace revision as the action concurrency token', () => {
    const currentPlan = plan();
    const currentData = data();
    const currentVersion = version(currentPlan, currentData, {
      workspaceRevision: 7,
    });
    const preview = buildPlanActionPreview(
      previewInput({
        plan: currentPlan,
        data: currentData,
        version: currentVersion,
        workspaceRevision: 7,
      })
    );

    expect(preview).toMatchObject({
      blocked: false,
      workspaceRevision: 7,
      currentEvidenceRevision: workspaceRevisionToken(7),
    });
  });

  it('blocks the same evidence content after the workspace revision changes', () => {
    const currentPlan = plan();
    const currentData = data();
    const currentVersion = version(currentPlan, currentData, {
      workspaceRevision: 7,
    });

    expect(
      buildPlanActionPreview(
        previewInput({
          plan: currentPlan,
          data: currentData,
          version: currentVersion,
          workspaceRevision: 8,
        })
      )
    ).toMatchObject({
      blocked: true,
      stale: true,
      failureCode: 'stale_evidence',
    });
  });

  it('does not use whole-workspace content equality as the revision token', () => {
    const currentPlan = plan();
    const currentData = data({
      transactions: [
        {
          ...data().transactions[0],
          notes: 'Descriptive evidence changed',
        },
      ],
    });
    const currentVersion = version(currentPlan, data(), {
      workspaceRevision: 7,
    });

    expect(
      buildPlanActionPreview(
        previewInput({
          plan: currentPlan,
          data: currentData,
          version: currentVersion,
          workspaceRevision: 7,
        })
      )
    ).toMatchObject({
      blocked: false,
      currentEvidenceRevision: workspaceRevisionToken(7),
    });
  });

  it('keeps legacy versions without workspace revision evidence read-only', () => {
    const currentPlan = plan();
    const currentData = data();
    const legacyVersion = version(currentPlan, currentData);

    expect(
      buildPlanActionPreview(
        previewInput({
          plan: currentPlan,
          data: currentData,
          version: legacyVersion,
          workspaceRevision: 0,
        })
      )
    ).toMatchObject({
      blocked: true,
      failureCode: 'stale_evidence',
    });
  });
});

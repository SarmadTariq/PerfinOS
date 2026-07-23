import { describe, expect, it, vi } from 'vitest';
import type {
  FinancialPlan,
  PlanVersion,
} from '../../src/models/planning';
import type { PlanEvidenceSnapshot } from '../../src/planning/planEvidence.types';
import {
  comparePlanEvidence,
  findOverlappingActivePlans,
  planEvidenceHorizonForSavedPlan,
  summarizePlanEvidence,
} from '../../src/planning/planWorkspace';
import {
  resolvePlanEvidencePeriod,
} from '../../src/planning/planEvidence';
import {
  PlanWorkspaceError,
  applyPlanLifecycleChange,
  createManualPlanRevision,
  duplicatePlan,
  loadPlanDetail,
  loadSavedPlans,
  type PlanWorkspaceRepository,
} from '../../src/services/plan/planWorkspaceService';

const plan = (
  overrides: Partial<FinancialPlan> = {}
): FinancialPlan => ({
  id: 'plan-1',
  userId: 'alice',
  title: 'July spending Plan',
  currency: 'CAD',
  horizon: '7_days',
  startDate: '2026-07-21',
  endDate: '2026-07-27',
  status: 'draft',
  currentVersionId: 'plan-1-v1',
  versionCount: 1,
  replacedPlanId: null,
  createdAt: '2026-07-21T12:00:00.000Z',
  updatedAt: '2026-07-21T12:00:00.000Z',
  activatedAt: null,
  completedAt: null,
  archivedAt: null,
  ...overrides,
});

const evidence = (
  overrides: Partial<PlanEvidenceSnapshot> = {}
): PlanEvidenceSnapshot => ({
  schemaVersion: 1,
  baselineRevision: `pe1-${'a'.repeat(32)}`,
  period: {
    kind: '7_days',
    startDate: '2026-07-21',
    endDate: '2026-07-27',
    monthKey: null,
    dayCount: 7,
    isCompleteCalendarMonth: false,
  },
  currency: 'CAD',
  currencyFractionDigits: 2,
  totals: {
    recordedIncomeMinor: 120_000,
    expectedIncome: {
      amountMinor: null,
      basis: 'unavailable_short_horizon',
    },
    recordedExpensesMinor: 42_000,
    netCashFlowMinor: 78_000,
    projectedRecurringCommitmentsMinor: 12_000,
    unmatchedRecurringCommitmentsMinor: 2_000,
    availableAfterCommitmentsMinor: 66_000,
    budgetTotalMinor: 80_000,
    horizonBudgetSpendMinor: 42_000,
  },
  categories: [],
  recurring: [],
  savings: {
    goalCount: 1,
    targetMinor: 200_000,
    savedMinor: 50_000,
    remainingMinor: 150_000,
    completionPercent: 25,
  },
  locations: [],
  coverage: {
    status: 'complete',
    transactionCount: 8,
    incomeTransactionCount: 2,
    expenseTransactionCount: 6,
    locationEligibleTransactionCount: 0,
    warnings: [],
  },
  ...overrides,
});

const version = (
  sourceEvidence = evidence(),
  overrides: Partial<PlanVersion> = {}
): PlanVersion => ({
  id: 'plan-1-v1',
  userId: 'alice',
  planId: 'plan-1',
  versionNumber: 1,
  createdAt: '2026-07-21T12:00:00.000Z',
  createdBy: 'ai_assisted',
  sourceRevision: sourceEvidence.baselineRevision,
  evidenceSummary: summarizePlanEvidence(sourceEvidence),
  generation: {
    modelId: 'gemini-test-model',
    promptVersion: 'plan-prompt-v1',
    responseSchemaVersion: 'plan-response-v1',
    outputSchemaVersion: 1,
    attemptCount: 1,
    generatedAt: '2026-07-21T11:59:00.000Z',
  },
  summary: 'Keep flexible spending below the weekly limit.',
  assumptions: [],
  allocations: [],
  commitments: [],
  recommendations: [],
  actionProposals: [],
  validation: {
    schemaVersion: 1,
    state: 'valid',
    validatedAt: '2026-07-21T12:00:00.000Z',
    errors: [],
    warnings: [],
  },
  ...overrides,
});

const repository = (
  overrides: Partial<PlanWorkspaceRepository> = {}
): PlanWorkspaceRepository => ({
  listPlans: vi.fn(async () => [plan()]),
  getPlan: vi.fn(async () => plan()),
  listPlanVersions: vi.fn(async () => [version()]),
  createPlan: vi.fn(async (_userId, input) => ({
    plan: input.plan,
    version: input.initialVersion,
  })),
  createPlanVersion: vi.fn(async (_userId, _planId, nextVersion) => ({
    plan: plan({
      currentVersionId: nextVersion.id,
      versionCount: nextVersion.versionNumber,
      updatedAt: nextVersion.createdAt,
    }),
    version: nextVersion,
  })),
  updatePlanLifecycle: vi.fn(async (_userId, _planId, input) =>
    plan({
      status: input.status,
      replacedPlanId: input.replacedPlanId,
      updatedAt: input.occurredAt,
    })
  ),
  ...overrides,
});

describe('Plan evidence comparison', () => {
  it('stores only an aggregated deterministic evidence summary', () => {
    expect(summarizePlanEvidence(evidence())).toEqual(
      expect.objectContaining({
      schemaVersion: 1,
      baselineRevision: `pe1-${'a'.repeat(32)}`,
      periodStartDate: '2026-07-21',
      periodEndDate: '2026-07-27',
      currency: 'CAD',
      currencyFractionDigits: 2,
      coverageStatus: 'complete',
      transactionCount: 8,
      recordedIncomeMinor: 120_000,
      recordedExpensesMinor: 42_000,
      netCashFlowMinor: 78_000,
      projectedRecurringCommitmentsMinor: 12_000,
      budgetTotalMinor: 80_000,
      savingsRemainingMinor: 150_000,
      componentRevisions:
        expect.objectContaining({
          expectedIncome:
            expect.stringMatching(
              /^pe1-/
            ),
          categories:
            expect.stringMatching(
              /^pe1-/
            ),
          recurring:
            expect.stringMatching(
              /^pe1-/
            ),
          savings:
            expect.stringMatching(
              /^pe1-/
            ),
          locations:
            expect.stringMatching(
              /^pe1-/
            ),
          coverage:
            expect.stringMatching(
              /^pe1-/
            ),
        }),
      })
    );
  });

  it('rebuilds evidence for the saved Plan period', () => {
    const savedPlan = plan({
      startDate: '2026-07-21',
      endDate: '2026-07-27',
      horizon: '7_days',
    });

    expect(
      resolvePlanEvidencePeriod(
        planEvidenceHorizonForSavedPlan(
          savedPlan
        )
      )
    ).toMatchObject({
      startDate: savedPlan.startDate,
      endDate: savedPlan.endDate,
    });
  });

  it('describes material deterministic changes without raw records', () => {
    const savedEvidence = evidence();
    const currentEvidence = evidence({
      baselineRevision: `pe1-${'b'.repeat(32)}`,
      totals: {
        ...savedEvidence.totals,
        recordedExpensesMinor: 47_500,
        netCashFlowMinor: 72_500,
      },
      coverage: {
        ...savedEvidence.coverage,
        transactionCount: 9,
      },
    });

    const comparison = comparePlanEvidence(
      summarizePlanEvidence(savedEvidence),
      currentEvidence
    );

    expect(comparison.isStale).toBe(true);
    expect(comparison.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'recordedExpensesMinor',
          differenceMinor: 5_500,
        }),
        expect.objectContaining({
          field: 'transactionCount',
          previousValue: 8,
          currentValue: 9,
        }),
      ])
    );
  });

  it('reports changed evidence sections even when headline totals match', () => {
    const savedEvidence = evidence();
    const currentEvidence = evidence({
      baselineRevision: `pe1-${'c'.repeat(32)}`,
      categories: [
        {
          categoryId:
            'category-synthetic',
          categoryName:
            'Synthetic category',
          transactionCount: 1,
          spendMinor: 4_200,
          budgetMinor: null,
          remainingMinor: null,
        },
      ],
    });

    expect(
      comparePlanEvidence(
        summarizePlanEvidence(
          savedEvidence
        ),
        currentEvidence
      ).changes
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'categorySignals',
          label: 'Category signals',
        }),
      ])
    );
  });

  it('reports changed currency metadata', () => {
    const savedEvidence = evidence();
    const currentEvidence = evidence({
      baselineRevision: `pe1-${'d'.repeat(32)}`,
      currency: 'USD',
    });

    expect(
      comparePlanEvidence(
        summarizePlanEvidence(
          savedEvidence
        ),
        currentEvidence
      ).changes
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'currency',
          previousValue: 'CAD',
          currentValue: 'USD',
        }),
      ])
    );
  });
});

describe('Plan workspace lifecycle service', () => {
  it('sorts active Plans before newer drafts and archived Plans', async () => {
    const active = plan({
      id: 'active-plan',
      status: 'active',
      updatedAt: '2026-07-20T12:00:00.000Z',
    });
    const draft = plan({
      id: 'draft-plan',
      updatedAt: '2026-07-23T12:00:00.000Z',
    });
    const archived = plan({
      id: 'archived-plan',
      status: 'archived',
      updatedAt: '2026-07-24T12:00:00.000Z',
    });

    await expect(
      loadSavedPlans(
        'alice',
        repository({
          listPlans: vi.fn(async () => [
            archived,
            draft,
            active,
          ]),
        })
      )
    ).resolves.toEqual([
      active,
      draft,
      archived,
    ]);
  });

  it('loads saved Plan detail without any provider dependency', async () => {
    await expect(
      loadPlanDetail('alice', 'plan-1', repository())
    ).resolves.toEqual({
      plan: plan(),
      versions: [version()],
    });
  });

  it('loads a legacy immutable version without an evidence summary', async () => {
    const legacyVersion = version(
      evidence(),
      {
        evidenceSummary: undefined,
        generation: null,
      }
    );

    await expect(
      loadPlanDetail(
        'alice',
        'plan-1',
        repository({
          listPlanVersions: vi.fn(
            async () => [
              legacyVersion,
            ]
          ),
        })
      )
    ).resolves.toEqual({
      plan: plan(),
      versions: [legacyVersion],
    });
  });

  it('creates a monotonic immutable manual revision', async () => {
    const store = repository();
    const result = await createManualPlanRevision(
      {
        userId: 'alice',
        plan: plan(),
        currentVersion: version(),
        summary: 'Reviewed manually while the provider was unavailable.',
        versionId: 'plan-1-v2',
        occurredAt: '2026-07-23T14:00:00.000Z',
      },
      store
    );

    expect(store.createPlanVersion).toHaveBeenCalledWith(
      'alice',
      'plan-1',
      expect.objectContaining({
        id: 'plan-1-v2',
        versionNumber: 2,
        createdBy: 'user',
        generation: null,
        summary: 'Reviewed manually while the provider was unavailable.',
        sourceRevision:
          `pe1-${'a'.repeat(32)}`,
        evidenceSummary:
          version().evidenceSummary,
      })
    );
    expect(result.version.versionNumber).toBe(2);
  });

  it('revises a legacy version without relabeling its saved evidence', async () => {
    const store = repository();

    await createManualPlanRevision(
      {
        userId: 'alice',
        plan: plan(),
        currentVersion: version(
          evidence(),
          {
            evidenceSummary:
              undefined,
          }
        ),
        summary:
          'Reviewed from a legacy saved version.',
        versionId: 'plan-1-v2',
        occurredAt:
          '2026-07-23T14:00:00.000Z',
      },
      store
    );

    expect(
      store.createPlanVersion
    ).toHaveBeenCalledWith(
      'alice',
      'plan-1',
      expect.objectContaining({
        sourceRevision:
          `pe1-${'a'.repeat(32)}`,
        evidenceSummary: null,
      })
    );
  });

  it('duplicates a Plan as a new draft with immutable version 1', async () => {
    const store = repository();

    await duplicatePlan(
      {
        userId: 'alice',
        sourcePlan: plan({ status: 'active' }),
        sourceVersion: version(),
        planId: 'plan-copy',
        versionId: 'plan-copy-v1',
        occurredAt: '2026-07-23T15:00:00.000Z',
      },
      store
    );

    expect(store.createPlan).toHaveBeenCalledWith(
      'alice',
      expect.objectContaining({
        plan: expect.objectContaining({
          id: 'plan-copy',
          title: 'July spending Plan copy',
          status: 'draft',
          versionCount: 1,
          replacedPlanId: null,
          activatedAt: null,
        }),
        initialVersion: expect.objectContaining({
          id: 'plan-copy-v1',
          planId: 'plan-copy',
          versionNumber: 1,
          createdBy: 'user',
        }),
      })
    );
  });

  it('requires explicit confirmation for lifecycle changes', async () => {
    await expect(
      applyPlanLifecycleChange(
        {
          userId: 'alice',
          plan: plan(),
          currentVersion: version(),
          currentEvidence: evidence(),
          status: 'active',
          confirmed: false,
          occurredAt: '2026-07-23T16:00:00.000Z',
          replacementPlanId: null,
        },
        repository()
      )
    ).rejects.toMatchObject({
      code: 'confirmation_required',
    });
  });

  it('blocks activation when deterministic evidence is stale', async () => {
    await expect(
      applyPlanLifecycleChange(
        {
          userId: 'alice',
          plan: plan(),
          currentVersion: version(),
          currentEvidence: evidence({
            baselineRevision: `pe1-${'b'.repeat(32)}`,
          }),
          status: 'active',
          confirmed: true,
          occurredAt: '2026-07-23T16:00:00.000Z',
          replacementPlanId: null,
        },
        repository()
      )
    ).rejects.toBeInstanceOf(PlanWorkspaceError);
  });

  it('detects overlap and requires the exact active replacement', async () => {
    const active = plan({
      id: 'active-plan',
      status: 'active',
      startDate: '2026-07-25',
      endDate: '2026-07-31',
    });
    const store = repository({
      listPlans: vi.fn(async () => [plan(), active]),
    });

    expect(findOverlappingActivePlans([plan(), active], plan())).toEqual([
      active,
    ]);

    await expect(
      applyPlanLifecycleChange(
        {
          userId: 'alice',
          plan: plan(),
          currentVersion: version(),
          currentEvidence: evidence(),
          status: 'active',
          confirmed: true,
          occurredAt: '2026-07-23T16:00:00.000Z',
          replacementPlanId: null,
        },
        store
      )
    ).rejects.toMatchObject({
      code: 'overlapping_active_plan',
    });

    await applyPlanLifecycleChange(
      {
        userId: 'alice',
        plan: plan(),
        currentVersion: version(),
        currentEvidence: evidence(),
        status: 'active',
        confirmed: true,
        occurredAt: '2026-07-23T16:00:00.000Z',
        replacementPlanId: 'active-plan',
      },
      store
    );

    expect(store.updatePlanLifecycle).toHaveBeenCalledWith(
      'alice',
      'plan-1',
      {
        status: 'active',
        occurredAt: '2026-07-23T16:00:00.000Z',
        replacedPlanId: 'active-plan',
        expectedCurrentVersionId:
          'plan-1-v1',
      }
    );
  });

  it('blocks activation when more than one active Plan overlaps', async () => {
    const activeOne = plan({
      id: 'active-one',
      status: 'active',
      startDate: '2026-07-20',
      endDate: '2026-07-24',
    });
    const activeTwo = plan({
      id: 'active-two',
      status: 'active',
      startDate: '2026-07-25',
      endDate: '2026-07-30',
    });

    await expect(
      applyPlanLifecycleChange(
        {
          userId: 'alice',
          plan: plan(),
          currentVersion: version(),
          currentEvidence: evidence(),
          status: 'active',
          confirmed: true,
          occurredAt:
            '2026-07-23T16:00:00.000Z',
          replacementPlanId: null,
        },
        repository({
          listPlans: vi.fn(
            async () => [
              activeOne,
              activeTwo,
            ]
          ),
        })
      )
    ).rejects.toMatchObject({
      code: 'overlapping_active_plan',
      message:
        'More than one active Plan overlaps this period and must be resolved separately',
    });
  });
});

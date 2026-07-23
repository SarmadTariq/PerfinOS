import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  PlanEvidenceSnapshot,
} from '../../src/planning/planEvidence.types';

import {
  buildInitialPlanRecords,
  createEditablePlanDraft,
} from '../../src/planning/planDraftAdapter';

import {
  saveGeneratedPlanDraft,
  type PlanDraftResponse,
} from '../../src/services/plan';

const baselineRevision =
  `pe1-${'a'.repeat(32)}`;

const evidence:
  PlanEvidenceSnapshot = {
    schemaVersion:
      1,

    baselineRevision,

    period: {
      kind:
        'current_month',

      startDate:
        '2026-07-01',

      endDate:
        '2026-07-23',

      monthKey:
        '2026-07',

      dayCount:
        23,

      isCompleteCalendarMonth:
        false,
    },

    currency:
      'CAD',

    currencyFractionDigits:
      2,

    totals: {
      recordedIncomeMinor:
        300_000,

      expectedIncome: {
        amountMinor:
          400_000,

        basis:
          'profile_monthly_income',
      },

      recordedExpensesMinor:
        100_000,

      netCashFlowMinor:
        200_000,

      projectedRecurringCommitmentsMinor:
        25_000,

      unmatchedRecurringCommitmentsMinor:
        25_000,

      availableAfterCommitmentsMinor:
        175_000,

      budgetTotalMinor:
        250_000,

      horizonBudgetSpendMinor:
        100_000,
    },

    categories: [],

    recurring: [],

    savings: {
      goalCount:
        0,

      targetMinor:
        0,

      savedMinor:
        0,

      remainingMinor:
        0,

      completionPercent:
        0,
    },

    locations: [],

    coverage: {
      status:
        'complete',

      transactionCount:
        3,

      incomeTransactionCount:
        1,

      expenseTransactionCount:
        2,

      locationEligibleTransactionCount:
        0,

      warnings: [],
    },
  };

const response:
  PlanDraftResponse = {
    schemaVersion:
      1,

    action:
      'turn',

    sessionId:
      '123e4567-e89b-42d3-a456-426614174000',

    baselineRevision,

    result: {
      schemaVersion:
        1,

      action:
        'turn',

      baselineRevision,

      currency:
        'CAD',

      periodKind:
        'current_month',

      summary:
        'Original summary',

      observations: [
        {
          id:
            'observation-1',

          statement:
            'Recorded income exceeds recorded expenses.',

          evidenceRefs: [
            'totals.recordedIncomeMinor',
          ],
        },
      ],

      allocations: [
        {
          id:
            'allocation-1',

          label:
            'Flexible spending',

          categoryId:
            null,

          amountMinor:
            50_000,

          period:
            'plan',

          evidenceRefs: [
            'totals.availableAfterCommitmentsMinor',
          ],
        },
      ],

      commitments: [],

      recommendations: [
        {
          id:
            'recommendation-1',

          title:
            'Review flexible spending',

          description:
            'Compare it weekly.',

          priority:
            'medium',

          evidenceRefs: [
            'totals.recordedExpensesMinor',
          ],
        },
      ],

      actionProposals: [
        {
          id:
            'proposal-1',

          type:
            'recurring_review',

          title:
            'Review recurring items',

          description:
            'Review the current recurring list.',

          targetEntityId:
            null,

          proposedAmountMinor:
            null,

          effectiveDate:
            null,

          requiresConfirmation:
            true,

          executionState:
            'proposal_only',

          evidenceRefs: [
            'coverage.transactionCount',
          ],
        },
      ],

      warnings: [],
    },

    generation: {
      modelId:
        'gemini-test-model',

      promptVersion:
        'plan-prompt-v1',

      responseSchemaVersion:
        'plan-response-v1',

      outputSchemaVersion:
        1,

      attemptCount:
        1,

      generatedAt:
        '2026-07-23T16:00:00.000Z',
    },

    validationState:
      'valid',
  };

describe(
  'PF-210 Plan draft adapter',
  () => {
    it(
      'creates an independently editable copy',
      () => {
        const editable =
          createEditablePlanDraft(
            response
          );

        expect(editable)
          .not.toBe(
            response.result
          );

        expect(
          editable
            .recommendations[0]
        ).not.toBe(
          response
            .result
            .recommendations[0]
        );
      }
    );

    it(
      'creates draft-only Plan records with generation provenance',
      () => {
        const editable =
          createEditablePlanDraft(
            response
          );

        const records =
          buildInitialPlanRecords({
            userId:
              'alice',

            primaryGoal:
              'Reduce flexible spending',

            evidence,

            response,

            draft: {
              ...editable,

              summary:
                'Manually reviewed summary',
            },

            planId:
              'plan-1',

            versionId:
              'version-1',

            createdAt:
              '2026-07-23T17:00:00.000Z',
          });

        expect(records.plan)
          .toMatchObject({
            id:
              'plan-1',

            userId:
              'alice',

            status:
              'draft',

            horizon:
              'monthly',

            currentVersionId:
              'version-1',

            versionCount:
              1,

            activatedAt:
              null,
          });

        expect(records.version)
          .toMatchObject({
            id:
              'version-1',

            versionNumber:
              1,

            createdBy:
              'ai_assisted',

            summary:
              'Manually reviewed summary',

            sourceRevision:
              baselineRevision,

            generation: {
              modelId:
                'gemini-test-model',

              promptVersion:
                'plan-prompt-v1',

              responseSchemaVersion:
                'plan-response-v1',

              outputSchemaVersion:
                1,
            },

            actionProposals: [
              {
                requiresConfirmation:
                  true,

                executionState:
                  'proposal_only',
              },
            ],
          });
      }
    );

    it(
      'rejects stale evidence before persistence',
      () => {
        const editable =
          createEditablePlanDraft(
            response
          );

        expect(() =>
          buildInitialPlanRecords({
            userId:
              'alice',

            primaryGoal:
              'Reduce flexible spending',

            evidence: {
              ...evidence,

              baselineRevision:
                `pe1-${'b'.repeat(32)}`,
            },

            response,

            draft:
              editable,

            planId:
              'plan-1',

            versionId:
              'version-1',

            createdAt:
              '2026-07-23T17:00:00.000Z',
          })
        ).toThrow(
          'Draft evidence is stale or invalid'
        );
      }
    );

    it(
      'persists through createPlan without lifecycle activation',
      async () => {
        const editable =
          createEditablePlanDraft(
            response
          );

        const createPlanRecord =
          vi.fn(
            async (
              _userId,
              input
            ) => ({
              plan:
                input.plan,

              version:
                input
                  .initialVersion,
            })
          );

        const result =
          await saveGeneratedPlanDraft(
            {
              userId:
                'alice',

              primaryGoal:
                'Reduce flexible spending',

              evidence,

              response,

              draft:
                editable,
            },
            {
              now:
                () =>
                  new Date(
                    '2026-07-23T17:00:00.000Z'
                  ),

              idFactory:
                (prefix) =>
                  prefix ===
                    'plan'
                    ? 'plan-1'
                    : 'version-1',

              createPlanRecord,
            }
          );

        expect(
          createPlanRecord
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          createPlanRecord
        ).toHaveBeenCalledWith(
          'alice',
          expect.objectContaining({
            plan:
              expect.objectContaining({
                status:
                  'draft',

                activatedAt:
                  null,
              }),

            initialVersion:
              expect.objectContaining({
                versionNumber:
                  1,
              }),
          })
        );

        expect(
          result.plan.status
        ).toBe('draft');
      }
    );
  }
);

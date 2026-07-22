import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PLAN_OUTPUT_SCHEMA_VERSION,
  PLAN_PROMPT_VERSION,
  PLAN_RESPONSE_SCHEMA_VERSION,
  type PlanStructuredActionProposal,
  type PlanStructuredOutput,
} from '../src/plan/outputContracts';

import {
  PLAN_GEMINI_RESPONSE_FORMAT,
  PLAN_STRUCTURED_OUTPUT_JSON_SCHEMA,
} from '../src/plan/outputSchema';

const schema =
  PLAN_STRUCTURED_OUTPUT_JSON_SCHEMA;

describe(
  'PF-209 structured Plan output contract',
  () => {
    it(
      'uses explicit contract versions',
      () => {
        expect(
          PLAN_OUTPUT_SCHEMA_VERSION
        ).toBe(1);

        expect(
          PLAN_PROMPT_VERSION
        ).toBe(
          'plan-prompt-v1'
        );

        expect(
          PLAN_RESPONSE_SCHEMA_VERSION
        ).toBe(
          'plan-response-v1'
        );
      }
    );

    it(
      'configures JSON structured output',
      () => {
        expect(
          PLAN_GEMINI_RESPONSE_FORMAT
            .text
            .mimeType
        ).toBe(
          'application/json'
        );

        expect(
          PLAN_GEMINI_RESPONSE_FORMAT
            .text
            .schema
        ).toBe(schema);
      }
    );

    it(
      'requires all top-level output fields',
      () => {
        expect(
          [...schema.required]
            .sort()
        ).toEqual([
          'action',
          'actionProposals',
          'allocations',
          'baselineRevision',
          'commitments',
          'currency',
          'observations',
          'periodKind',
          'recommendations',
          'schemaVersion',
          'summary',
          'warnings',
        ]);
      }
    );

    it(
      'allows only proposal-safe action types',
      () => {
        const actionProposal =
          schema
            .properties
            .actionProposals
            .items;

        expect(
          actionProposal
            .properties
            .type
            .enum
        ).toEqual([
          'budget_adjustment',
          'savings_contribution',
          'recurring_review',
        ]);

        expect(
          actionProposal
            .properties
            .type
            .enum
        ).not.toContain(
          'custom'
        );
      }
    );

    it(
      'requires confirmation and proposal-only execution',
      () => {
        const properties =
          schema
            .properties
            .actionProposals
            .items
            .properties;

        expect(
          properties
            .requiresConfirmation
            .enum
        ).toEqual([
          true,
        ]);

        expect(
          properties
            .executionState
            .enum
        ).toEqual([
          'proposal_only',
        ]);
      }
    );

    it(
      'uses integer minor units for generated money',
      () => {
        const properties =
          schema.properties;

        expect(
          properties
            .allocations
            .items
            .properties
            .amountMinor
            .type
        ).toBe(
          'integer'
        );

        expect(
          properties
            .commitments
            .items
            .properties
            .amountMinor
            .type
        ).toEqual([
          'integer',
          'null',
        ]);

        expect(
          properties
            .actionProposals
            .items
            .properties
            .proposedAmountMinor
            .type
        ).toEqual([
          'integer',
          'null',
        ]);
      }
    );

    it(
      'requires evidence references on every generated claim type',
      () => {
        const properties =
          schema.properties;

        [
          properties
            .observations
            .items,
          properties
            .allocations
            .items,
          properties
            .commitments
            .items,
          properties
            .recommendations
            .items,
          properties
            .actionProposals
            .items,
          properties
            .warnings
            .items,
        ].forEach(
          (item) => {
            expect(
              item.required
            ).toContain(
              'evidenceRefs'
            );

            expect(
              item
                .properties
                .evidenceRefs
                .minItems
            ).toBe(1);
          }
        );
      }
    );

    it(
      'does not expose sensitive or persistence-owned fields',
      () => {
        const serialized =
          JSON.stringify(
            schema
          );

        [
          '"userId"',
          '"email"',
          '"merchant"',
          '"paymentMethod"',
          '"notes"',
          '"receipts"',
          '"latitude"',
          '"longitude"',
          '"formattedAddress"',
          '"placeId"',
          '"transactions"',
          '"rawTransactions"',
          '"createdAt"',
          '"updatedAt"',
          '"validationState"',
          '"execute"',
          '"executed"',
        ].forEach(
          (field) => {
            expect(
              serialized
            ).not.toContain(
              field
            );
          }
        );
      }
    );

    it(
      'keeps server-owned metadata outside model output',
      () => {
        const serialized =
          JSON.stringify(
            schema
          );

        expect(
          serialized
        ).not.toContain(
          '"modelId"'
        );

        expect(
          serialized
        ).not.toContain(
          '"promptVersion"'
        );

        expect(
          serialized
        ).not.toContain(
          '"responseSchemaVersion"'
        );

        expect(
          serialized
        ).not.toContain(
          '"generatedAt"'
        );
      }
    );

    it(
      'typechecks a representative structured result',
      () => {
        const proposal:
          PlanStructuredActionProposal = {
          id:
            'proposal-1',
          type:
            'budget_adjustment',
          title:
            'Review dining budget',
          description:
            'Consider reducing the planned dining allocation.',
          targetEntityId:
            'dining',
          proposedAmountMinor:
            25_000,
          effectiveDate:
            null,
          requiresConfirmation:
            true,
          executionState:
            'proposal_only',
          evidenceRefs: [
            'categories.dining.spendMinor',
          ],
        };

        const output:
          PlanStructuredOutput = {
          schemaVersion: 1,
          action:
            'generate',
          baselineRevision:
            `pe1-${'a'.repeat(32)}`,
          currency:
            'CAD',
          periodKind:
            'current_month',
          summary:
            'A planning summary.',
          observations: [
            {
              id:
                'observation-1',
              statement:
                'Dining spending is above the current pace.',
              evidenceRefs: [
                'categories.dining.spendMinor',
              ],
            },
          ],
          allocations: [],
          commitments: [],
          recommendations: [],
          actionProposals: [
            proposal,
          ],
          warnings: [],
        };

        expect(
          output
            .actionProposals[0]
            .executionState
        ).toBe(
          'proposal_only'
        );
      }
    );
  }
);

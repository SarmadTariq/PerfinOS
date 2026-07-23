import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PlanOutputValidationError,
  validatePlanProviderResult,
} from '../src/plan/outputValidation';

import {
  baselineRevision,
  sessionId,
  validPlanEvidence,
  validPlanProviderResult,
  validPlanStructuredOutput,
} from './plan-fixtures';

const clone = <
  Value,
>(
  value: Value
): Value =>
  JSON.parse(
    JSON.stringify(value)
  ) as Value;

const request = {
  schemaVersion: 1 as const,
  sessionId,
  baselineRevision,
  evidence:
    validPlanEvidence,
};

const validate = (
  candidate: unknown,
  overrides:
    Record<
      string,
      unknown
    > = {}
) =>
  validatePlanProviderResult({
    action:
      'generate',

    request,

    result: {
      ...validPlanProviderResult,
      ...overrides,

      text:
        JSON.stringify(
          candidate
        ),

      candidate,
    },
  });

describe(
  'PF-209 Plan output validation',
  () => {
    it(
      'normalizes a valid structured result',
      () => {
        const validated =
          validate(
            validPlanStructuredOutput
          );

        expect(validated)
          .toMatchObject({
            validationState:
              'valid',

            output: {
              schemaVersion: 1,
              action:
                'generate',
              baselineRevision,
              currency:
                'CAD',
            },

            metadata: {
              modelId:
                'gemini-test-model',
              promptVersion:
                'plan-prompt-v1',
              responseSchemaVersion:
                'plan-response-v1',
            },
          });
      }
    );

    it(
      'rejects stale evidence revisions',
      () => {
        const candidate =
          clone(
            validPlanStructuredOutput
          );

        candidate.baselineRevision =
          `pe1-${'b'.repeat(32)}`;

        expect(() =>
          validate(candidate)
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );

    it(
      'rejects an action mismatch',
      () => {
        const candidate =
          clone(
            validPlanStructuredOutput
          );

        candidate.action =
          'revise';

        expect(() =>
          validate(candidate)
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );

    it(
      'rejects unknown evidence references',
      () => {
        const candidate =
          clone(
            validPlanStructuredOutput
          );

        candidate
          .observations[0]
          .evidenceRefs = [
            'transactions[0].merchant',
          ];

        expect(() =>
          validate(candidate)
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );

    it(
      'rejects duplicate response-local identifiers',
      () => {
        const candidate =
          clone(
            validPlanStructuredOutput
          );

        candidate
          .recommendations[0]
          .id =
          candidate
            .observations[0]
            .id;

        expect(() =>
          validate(candidate)
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );

    it(
      'rejects allocations above available evidence',
      () => {
        const candidate =
          clone(
            validPlanStructuredOutput
          );

        candidate
          .allocations[0]
          .amountMinor =
          validPlanEvidence
            .totals
            .availableAfterCommitmentsMinor +
          1;

        expect(() =>
          validate(candidate)
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );

    it(
      'rejects commitments above projected recurring evidence',
      () => {
        const candidate =
          clone(
            validPlanStructuredOutput
          );

        candidate
          .commitments[0]
          .amountMinor =
          validPlanEvidence
            .totals
            .projectedRecurringCommitmentsMinor +
          1;

        expect(() =>
          validate(candidate)
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );

    it(
      'rejects automatic or executed action claims',
      () => {
        const candidate =
          clone(
            validPlanStructuredOutput
          );

        candidate.summary =
          'PerFin has applied the budget change.';

        expect(() =>
          validate(candidate)
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );

    it(
      'rejects first-person executed action claims',
      () => {
        const candidate =
          clone(
            validPlanStructuredOutput
          );

        candidate.summary =
          'We have saved the updated budget.';

        expect(() =>
          validate(candidate)
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );

    it(
      'rejects proposal execution-state changes',
      () => {
        const candidate =
          clone(
            validPlanStructuredOutput
          ) as unknown as {
          actionProposals:
            Array<
              Record<
                string,
                unknown
              >
            >;
        };

        candidate
          .actionProposals[0]
          .executionState =
          'executed';

        expect(() =>
          validate(candidate)
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );

    it(
      'accepts a null budget target as an explicit total-budget proposal',
      () => {
        const candidate =
          clone(
            validPlanStructuredOutput
          );

        candidate
          .actionProposals[0]
          .targetEntityId =
          null;

        expect(() =>
          validate(candidate)
        ).not.toThrow();
      }
    );

    it(
      'rejects dates outside the evidence period',
      () => {
        const candidate =
          clone(
            validPlanStructuredOutput
          );

        candidate
          .commitments[0]
          .dueDate =
          '2026-08-01';

        expect(() =>
          validate(candidate)
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );

    it(
      'rejects server-metadata mismatches',
      () => {
        expect(() =>
          validate(
            validPlanStructuredOutput,
            {
              metadata: {
                ...validPlanProviderResult
                  .metadata,

                promptVersion:
                  'model-owned-version',
              },
            }
          )
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );

    it(
      'rejects candidate and raw-text disagreement',
      () => {
        expect(() =>
          validatePlanProviderResult({
            action:
              'generate',

            request,

            result: {
              ...validPlanProviderResult,

              text:
                JSON.stringify({
                  different:
                    true,
                }),
            },
          })
        ).toThrow(
          PlanOutputValidationError
        );
      }
    );
  }
);

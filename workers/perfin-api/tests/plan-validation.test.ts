import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PlanRequestValidationError,
  validatePlanActionRequest,
} from '../src/plan/validation';

import {
  baselineRevision,
  sessionId,
  validPlanEvidence,
} from './plan-fixtures';

describe(
  'PF-208 Plan request validation',
  () => {
    it(
      'accepts the session contract',
      () => {
        expect(
          validatePlanActionRequest(
            'session',
            {
              schemaVersion: 1,
              evidence:
                validPlanEvidence,
            }
          )
        ).toMatchObject({
          schemaVersion: 1,
          evidence: {
            baselineRevision,
          },
        });
      }
    );

    it(
      'accepts the turn contract',
      () => {
        expect(
          validatePlanActionRequest(
            'turn',
            {
              schemaVersion: 1,
              sessionId,
              baselineRevision,
              message:
                '  Help me reduce discretionary spending.  ',
              evidence:
                validPlanEvidence,
            }
          )
        ).toMatchObject({
          schemaVersion: 1,
          sessionId,
          baselineRevision,
          message:
            'Help me reduce discretionary spending.',
        });
      }
    );

    it(
      'accepts the generate contract',
      () => {
        expect(
          validatePlanActionRequest(
            'generate',
            {
              schemaVersion: 1,
              sessionId,
              baselineRevision,
              evidence:
                validPlanEvidence,
            }
          )
        ).toMatchObject({
          schemaVersion: 1,
          sessionId,
          baselineRevision,
        });
      }
    );

    it(
      'accepts the revise contract',
      () => {
        expect(
          validatePlanActionRequest(
            'revise',
            {
              schemaVersion: 1,
              sessionId,
              baselineRevision,
              instruction:
                '  Reduce restaurant spending.  ',
              evidence:
                validPlanEvidence,
            }
          )
        ).toMatchObject({
          schemaVersion: 1,
          sessionId,
          baselineRevision,
          instruction:
            'Reduce restaurant spending.',
        });
      }
    );

    it(
      'rejects an unsupported request version',
      () => {
        expect(() =>
          validatePlanActionRequest(
            'session',
            {
              schemaVersion: 2,
              evidence:
                validPlanEvidence,
            }
          )
        ).toThrow(
          PlanRequestValidationError
        );
      }
    );

    it(
      'rejects unknown request fields',
      () => {
        expect(() =>
          validatePlanActionRequest(
            'generate',
            {
              schemaVersion: 1,
              sessionId,
              baselineRevision,
              evidence:
                validPlanEvidence,
              rawPayload: {
                private: true,
              },
            }
          )
        ).toThrow(
          PlanRequestValidationError
        );
      }
    );

    it(
      'rejects prohibited fields inside evidence',
      () => {
        expect(() =>
          validatePlanActionRequest(
            'session',
            {
              schemaVersion: 1,
              evidence: {
                ...validPlanEvidence,
                merchant:
                  'Private Merchant',
              },
            }
          )
        ).toThrow(
          PlanRequestValidationError
        );
      }
    );

    it(
      'rejects a baseline revision mismatch',
      () => {
        expect(() =>
          validatePlanActionRequest(
            'generate',
            {
              schemaVersion: 1,
              sessionId,
              baselineRevision:
                `pe1-${'b'.repeat(32)}`,
              evidence:
                validPlanEvidence,
            }
          )
        ).toThrow(
          PlanRequestValidationError
        );
      }
    );

    it(
      'rejects an arbitrary warning message',
      () => {
        expect(() =>
          validatePlanActionRequest(
            'session',
            {
              schemaVersion: 1,
              evidence: {
                ...validPlanEvidence,
                coverage: {
                  ...validPlanEvidence
                    .coverage,
                  status:
                    'partial',
                  warnings: [
                    {
                      code:
                        'NO_BUDGET',
                      message:
                        'Private user-created warning',
                    },
                  ],
                },
              },
            }
          )
        ).toThrow(
          PlanRequestValidationError
        );
      }
    );

    it(
      'rejects oversized user messages without echoing them',
      () => {
        const privateText =
          `private-${'x'.repeat(2_100)}`;

        try {
          validatePlanActionRequest(
            'turn',
            {
              schemaVersion: 1,
              sessionId,
              baselineRevision,
              message:
                privateText,
              evidence:
                validPlanEvidence,
            }
          );

          throw new Error(
            'Expected validation failure'
          );
        } catch (error) {
          expect(
            error
          ).toBeInstanceOf(
            PlanRequestValidationError
          );

          expect(
            String(error)
          ).not.toContain(
            privateText
          );
        }
      }
    );
  }
);

import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  PLAN_CREATION_STEPS,
} from '../../src/planning/planCreationFlow';

import {
  PLAN_CREATION_STEP_PRESENTATION,
  planAIGuardCopy,
  planGenerationStatusCopy,
} from '../../src/planning/planCreationPresentation';

describe(
  'PF-210 Plan creation presentation',
  () => {
    it(
      'defines presentation content for every creation step',
      () => {
        expect(
          Object.keys(
            PLAN_CREATION_STEP_PRESENTATION
          )
        ).toEqual([
          ...PLAN_CREATION_STEPS,
        ]);

        PLAN_CREATION_STEPS
          .forEach(
            (step) => {
              const presentation =
                PLAN_CREATION_STEP_PRESENTATION[
                  step
                ];

              expect(
                presentation.title
              ).not.toHaveLength(0);

              expect(
                presentation.description
              ).not.toHaveLength(0);
            }
          );
      }
    );

    it(
      'explains every AI guard condition',
      () => {
        [
          'account_required',
          'horizon_required',
          'context_review_required',
          'data_use_required',
          'goal_required',
          'generation_in_progress',
        ].forEach(
          (reason) => {
            expect(
              planAIGuardCopy(
                reason as Parameters<
                  typeof planAIGuardCopy
                >[0]
              )
            ).toBeTruthy();
          }
        );
      }
    );

    it(
      'keeps failure states recoverable and honest',
      () => {
        expect(
          planGenerationStatusCopy(
            'rate_limited'
          )
        ).toContain(
          'remain available'
        );

        expect(
          planGenerationStatusCopy(
            'validation_failed'
          )
        ).toContain(
          'Nothing was saved or applied'
        );

        expect(
          planGenerationStatusCopy(
            'unavailable'
          )
        ).toContain(
          'Existing saved Plans remain available'
        );
      }
    );

    it(
      'contains no legacy planning product name',
      () => {
        const serialized =
          JSON.stringify(
            PLAN_CREATION_STEP_PRESENTATION
          );

        expect(
          serialized
            .toLowerCase()
        ).not.toContain(
          'plannerchat'
        );
      }
    );
  }
);

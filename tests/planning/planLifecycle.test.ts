import {
  describe,
  expect,
  it,
} from 'vitest';
import type { FinancialPlan } from '../../src/models/planning';
import {
  assertPlanStatusTransition,
  planDateKeys,
  transitionPlanLifecycle,
} from '../../src/services/firebase/planLifecycle';

const plan = (
  overrides: Partial<FinancialPlan> = {}
): FinancialPlan => ({
  id: 'plan-1',
  userId: 'alice',
  title: 'Weekly Plan',
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

describe('Plan lifecycle', () => {
  it('creates an inclusive seven-day reservation range', () => {
    expect(
      planDateKeys(
        '2026-07-21',
        '2026-07-27'
      )
    ).toEqual([
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
      '2026-07-27',
    ]);
  });

  it('rejects reversed date ranges', () => {
    expect(() =>
      planDateKeys(
        '2026-07-27',
        '2026-07-21'
      )
    ).toThrow(
      'Plan end date cannot precede its start date'
    );
  });

  it('rejects ranges longer than 31 days', () => {
    expect(() =>
      planDateKeys(
        '2026-07-01',
        '2026-08-01'
      )
    ).toThrow(
      'A Plan cannot reserve more than 31 days'
    );
  });

  it('allows draft activation', () => {
    expect(() =>
      assertPlanStatusTransition(
        'draft',
        'active'
      )
    ).not.toThrow();
  });

  it.each([
    ['draft', 'active'],
    ['draft', 'archived'],
    ['active', 'completed'],
    ['active', 'archived'],
    ['completed', 'archived'],
  ] as const)(
    'allows %s to %s',
    (currentStatus, targetStatus) => {
      expect(() =>
        assertPlanStatusTransition(
          currentStatus,
          targetStatus
        )
      ).not.toThrow();
    }
  );

  it.each([
    ['active', 'active'],
    ['completed', 'active'],
    ['completed', 'completed'],
    ['archived', 'active'],
    ['archived', 'completed'],
    ['archived', 'archived'],
  ] as const)(
    'rejects %s to %s',
    (currentStatus, targetStatus) => {
      expect(() =>
        assertPlanStatusTransition(
          currentStatus,
          targetStatus
        )
      ).toThrow(
        `Cannot transition Plan from ${currentStatus} to ${targetStatus}`
      );
    }
  );

  it('prevents archived Plan reactivation', () => {
    expect(() =>
      assertPlanStatusTransition(
        'archived',
        'active'
      )
    ).toThrow(
      'Cannot transition Plan from archived to active'
    );
  });

  it('records activation metadata', () => {
    const occurredAt =
      '2026-07-21T14:00:00.000Z';

    expect(
      transitionPlanLifecycle(
        plan(),
        'active',
        occurredAt,
        null
      )
    ).toMatchObject({
      status: 'active',
      updatedAt: occurredAt,
      activatedAt: occurredAt,
      completedAt: null,
      archivedAt: null,
    });
  });

  it('records archive metadata', () => {
    const occurredAt =
      '2026-07-22T14:00:00.000Z';

    expect(
      transitionPlanLifecycle(
        plan({
          status: 'active',
          activatedAt:
            '2026-07-21T14:00:00.000Z',
        }),
        'archived',
        occurredAt,
        null
      )
    ).toMatchObject({
      status: 'archived',
      updatedAt: occurredAt,
      archivedAt: occurredAt,
    });
  });
});

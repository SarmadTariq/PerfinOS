import {
  describe,
  expect,
  it,
} from 'vitest';
import type {
  AppData,
  Transaction,
} from '../../src/models/finance';
import {
  buildInsightHierarchy,
  getInsightCoverageState,
  getPlanHandoffPresentation,
} from '../../src/insights';
import {
  createEmptyAppData,
} from '../../src/services/initialData';

const transaction = (
  overrides: Partial<Transaction> = {}
): Transaction => ({
  id: 'transaction-1',
  userId: 'user-1',
  type: 'expense',
  amount: 40,
  categoryId: 'cat-food',
  categoryName: 'Food & Dining',
  merchant: 'Market',
  date: '2026-07-10',
  notes: '',
  location: {
    name: 'Market',
    formattedAddress: 'Synthetic',
    address: 'Synthetic',
    latitude: 0,
    longitude: 0,
    source: 'imported',
  },
  paymentMethod: 'Cash',
  isRecurring: false,
  receipts: [],
  updateCount: 0,
  createdAt: '2026-07-10T00:00:00.000Z',
  updatedAt: '2026-07-10T00:00:00.000Z',
  ...overrides,
});

const data = (): AppData => ({
  ...createEmptyAppData({
    userId: 'user-1',
    isGuest: true,
  }),
  transactions: [
    transaction(),
    transaction({
      id: 'income-1',
      type: 'income',
      amount: 100,
      categoryId: 'cat-income',
      categoryName: 'Income',
    }),
  ],
});

const period = {
  label: 'This month',
  startDate: '2026-07-01',
  endDate: '2026-07-31',
};

describe('PF-199 insight hierarchy', () => {
  it('uses explicit period and deterministic labels without severity or risk claims', () => {
    const items = buildInsightHierarchy({
      data: data(),
      transactions: data().transactions,
      period,
      today: '2026-07-23',
    });

    expect(items.length).toBeLessThanOrEqual(5);
    expect(
      items.every(
        (item) =>
          item.source === 'deterministic' &&
          item.period.includes('2026-07-01') &&
          item.comparison.length > 0 &&
          item.whyItMatters.length > 0
      )
    ).toBe(true);
    expect(
      JSON.stringify(items)
    ).not.toMatch(/\brisk\b|\bseverity\b/i);
  });

  it('returns an empty state when no transactions support the period', () => {
    const input = {
      data: data(),
      transactions: [],
      period,
      today: '2026-07-23',
    };
    expect(getInsightCoverageState(input)).toBe('empty');
    expect(buildInsightHierarchy(input)).toEqual([]);
  });

  it('marks missing category references as partial and routes review to Categories', () => {
    const partial = transaction({
      categoryId: 'missing-category',
    });
    const input = {
      data: data(),
      transactions: [partial],
      period,
      today: '2026-07-23',
    };

    expect(getInsightCoverageState(input)).toBe('partial');
    expect(
      buildInsightHierarchy(input)
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          group: 'attention',
          destination: 'Categories',
        }),
      ])
    );
  });

  it('labels a completed period as historical rather than current', () => {
    expect(
      getInsightCoverageState({
        data: data(),
        transactions: data().transactions,
        period,
        today: '2026-08-10',
      })
    ).toBe('historical');
  });

  it('keeps the Plan handoff non-destructive for active and inactive workspaces', () => {
    expect(
      getPlanHandoffPresentation(true)
        .detail
    ).toContain(
      'does not replace'
    );
    expect(
      getPlanHandoffPresentation(false)
        .detail
    ).toContain(
      'explicit separate action'
    );
    expect(
      buildInsightHierarchy({
        data: data(),
        transactions: data().transactions,
        period,
        today: '2026-07-23',
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destination: 'Plan',
          evidence: expect.stringContaining('Activity period'),
          whyItMatters: expect.stringContaining('explicit confirmation'),
        }),
      ])
    );
  });
});

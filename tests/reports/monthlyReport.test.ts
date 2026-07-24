import { describe, expect, it } from 'vitest';
import { Budget, Category, SavingsGoal, Transaction } from '../../src/models/finance';
import {
  calculateMonthlySummary,
  generateMonthlyReport,
} from '../../src/repositories/AnalyticsRepository';
import {
  generateCanonicalMonthlyReport,
  parseMonthlyReportPeriod,
  reconcileMonthlyReportPeriod,
} from '../../src/reporting';

const category: Category = {
  id: 'groceries', name: 'Groceries', type: 'expense', color: '#000000', icon: 'basket', monthlyBudget: 500, isDefault: true,
};

const transaction = (overrides: Partial<Transaction>): Transaction => ({
  id: 'transaction-1', userId: 'user-1', type: 'expense', amount: 20, categoryId: 'groceries', categoryName: 'Groceries', merchant: 'Market',
  date: '2026-07-01', notes: '', location: { name: 'Market', formattedAddress: '', latitude: 0, longitude: 0, address: '', source: 'imported' },
  paymentMethod: 'Cash', isRecurring: false, receipts: [], updateCount: 0, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

const budget: Budget = { id: 'budget-1', userId: 'user-1', month: '2026-07', totalBudget: 400, categoryBudgets: {}, createdAt: '', updatedAt: '' };
const goals: SavingsGoal[] = [{ id: 'goal-1', userId: 'user-1', name: 'Buffer', targetAmount: 1000, currentAmount: 250, targetDate: '2026-12-31', createdAt: '', updatedAt: '' }];

describe('canonical monthly reporting', () => {
  it('parses only valid calendar month keys with inclusive boundaries and labels', () => {
    expect(parseMonthlyReportPeriod('2024-02')).toMatchObject({ startDate: '2024-02-01', endDate: '2024-02-29', label: 'February 2024', daysInPeriod: 29 });
    expect(parseMonthlyReportPeriod('2026-13')).toBeNull();
    expect(parseMonthlyReportPeriod('2026-7')).toBeNull();
  });

  it('reconciles exactly the report month using Activity-compatible inclusive dates', () => {
    const transactions = [
      transaction({ id: 'start', amount: 100, date: '2026-07-01', type: 'income' }),
      transaction({ id: 'end', amount: 40, date: '2026-07-31' }),
      transaction({ id: 'outside', amount: 999, date: '2026-08-01' }),
      transaction({ id: 'invalid', amount: 999, date: '2026-07-99' }),
    ];
    const reconciliation = reconcileMonthlyReportPeriod(transactions, '2026-07');
    const dashboardSummary = calculateMonthlySummary(transactions, '2026-07');

    expect(reconciliation).toMatchObject({ totalIncome: 100, totalExpense: 40, netCashFlow: 60, transactionCount: 2 });
    expect(dashboardSummary).toMatchObject({ income: 100, expenses: 40, netCashFlow: 60, transactionCount: 2 });
  });

  it('generates deterministic monthly reports with explicit source and partial coverage', () => {
    const report = generateCanonicalMonthlyReport({
      userId: 'user-1',
      transactions: [transaction({ amount: 100 }), transaction({ id: 'income', type: 'income', amount: 600, date: '2026-07-31' })],
      categories: [category], goals, budget, month: '2026-07', generatedAt: '2026-07-15T12:00:00.000Z', now: new Date('2026-07-15T12:00:00.000Z'),
    });

    expect(report).toMatchObject({
      id: 'report-2026-07', totalIncome: 600, totalExpense: 100, topCategory: 'Groceries', budgetStatus: 'healthy', savingsProgress: 25,
      periodStart: '2026-07-01', periodEnd: '2026-07-31', source: 'deterministic',
      coverage: { classification: 'partial', transactionCount: 2, observedDays: 2, daysInPeriod: 31 },
    });
  });

  it('classifies a period without transactions as empty', () => {
    const report = generateCanonicalMonthlyReport({ userId: 'user-1', transactions: [], categories: [category], goals, month: '2026-06', now: new Date('2026-07-15T00:00:00.000Z') });
    expect(report.coverage).toMatchObject({ classification: 'empty', transactionCount: 0, observedDays: 0 });
  });

  it('marks only invalid dates for the selected month as excluded', () => {
    const report = generateCanonicalMonthlyReport({
      userId: 'user-1',
      transactions: [
        transaction({ id: 'valid', date: '2026-07-15' }),
        transaction({ id: 'invalid-selected', date: '2026-07-99' }),
        transaction({ id: 'invalid-other', date: '2026-08-99' }),
      ],
      categories: [category],
      goals,
      month: '2026-07',
      now: new Date('2026-08-15T00:00:00.000Z'),
    });

    expect(report.coverage).toMatchObject({
      classification: 'partial',
      transactionCount: 1,
      excludedTransactionCount: 1,
    });
  });

  it('uses only expense category defaults as the budget fallback', () => {
    const incomeCategory: Category = {
      ...category,
      id: 'income',
      name: 'Income',
      type: 'income',
      monthlyBudget: 10000,
    };
    const report = generateCanonicalMonthlyReport({
      userId: 'user-1',
      transactions: [transaction({ amount: 600, date: '2026-06-15' })],
      categories: [category, incomeCategory],
      goals,
      month: '2026-06',
      now: new Date('2026-07-15T00:00:00.000Z'),
    });

    expect(report.budgetStatus).toBe('over budget');
  });

  it('honors an explicit zero budget instead of falling back to category defaults', () => {
    const report = generateCanonicalMonthlyReport({
      userId: 'user-1',
      transactions: [transaction({ amount: 1, date: '2026-06-15' })],
      categories: [category],
      goals,
      budget: { ...budget, totalBudget: 0 },
      month: '2026-06',
      now: new Date('2026-07-15T00:00:00.000Z'),
    });

    expect(report.budgetStatus).toBe('unbudgeted spending');
  });

  it('preserves the AnalyticsRepository public generator as a canonical-report delegate', () => {
    const report = generateMonthlyReport(
      'user-1',
      [transaction({ amount: 75, date: '2026-06-30' })],
      [category],
      goals,
      undefined,
      '2026-06'
    );

    expect(report).toMatchObject({
      id: 'report-2026-06',
      totalExpense: 75,
      source: 'deterministic',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
    });
  });
});

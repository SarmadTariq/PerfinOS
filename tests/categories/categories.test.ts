import { describe, expect, it } from 'vitest';
import { Budget, Category, Transaction } from '../../src/models/finance';
import {
  getCategoryRemovalDecision,
  getCategoryUsage,
  getTransactionCategoryOptions,
  isCategoryArchived,
  normalizeCategoryName,
  validateCategoryDraft,
} from '../../src/utils/categories';

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 'food',
  name: 'Food',
  type: 'expense',
  color: '#000000',
  icon: 'category',
  monthlyBudget: 100,
  isDefault: false,
  ...overrides,
});

const transaction = (categoryId = 'food'): Transaction => ({
  id: 'transaction-1',
  userId: 'user-1',
  type: 'expense',
  amount: 12,
  categoryId,
  categoryName: 'Food',
  merchant: 'Market',
  date: '2026-07-23',
  notes: '',
  location: { name: 'Market', formattedAddress: '1 Main St', latitude: 0, longitude: 0, address: '1 Main St', source: 'imported' },
  paymentMethod: 'Cash',
  isRecurring: false,
  receipts: [],
  updateCount: 0,
  createdAt: '2026-07-23T00:00:00.000Z',
  updatedAt: '2026-07-23T00:00:00.000Z',
});

const budget = (categoryBudgets: Record<string, number> = {}): Budget => ({
  id: 'budget-1',
  userId: 'user-1',
  month: '2026-07',
  totalBudget: 1000,
  categoryBudgets,
  createdAt: '2026-07-23T00:00:00.000Z',
  updatedAt: '2026-07-23T00:00:00.000Z',
});

describe('category domain helpers', () => {
  it('normalizes a valid draft and rejects blank, duplicate, and overlong names within a type', () => {
    expect(normalizeCategoryName('  Pet   care  ')).toBe('Pet care');
    expect(
      validateCategoryDraft(
        { ...category(), name: '  Pet   care  ' },
        [category({ id: 'income-pet', name: 'Pet Care', type: 'income' })]
      )
    ).toMatchObject({ name: 'Pet care' });

    expect(() => validateCategoryDraft({ ...category(), name: '   ' }, [])).toThrow('Category name is required');
    expect(() => validateCategoryDraft({ ...category(), name: 'food' }, [category()])).toThrow('already exists');
    expect(() => validateCategoryDraft({ ...category(), name: 'x'.repeat(49) }, [])).toThrow('48 characters');
  });

  it('reports transaction and budget references as independent usage facts', () => {
    expect(getCategoryUsage('food', [transaction()], [budget({ food: 0 })])).toEqual({
      inUse: true,
      budgetLinked: true,
    });
    expect(getCategoryUsage('food', [], [])).toEqual({ inUse: false, budgetLinked: false });
  });

  it('blocks default removal and archives custom categories instead of hard-deleting Plan history references', () => {
    expect(getCategoryRemovalDecision(category({ isDefault: true }), [], [])).toBe('blocked_default');
    expect(getCategoryRemovalDecision(category(), [transaction()], [])).toBe('archive');
    expect(getCategoryRemovalDecision(category(), [], [budget({ food: 25 })])).toBe('archive');
    expect(getCategoryRemovalDecision(category(), [], [])).toBe('archive');
  });

  it('hides archived categories for new transactions and retains the selected archived category for edits', () => {
    const archived = category({ id: 'archived-food', name: 'Old Food', isArchived: true, archivedAt: '2026-07-01T00:00:00.000Z' });
    const active = category({ id: 'active-food', name: 'Food' });

    expect(isCategoryArchived(archived)).toBe(true);
    expect(getTransactionCategoryOptions([archived, active], 'expense')).toEqual([active]);
    expect(getTransactionCategoryOptions([archived, active], 'expense', archived.id, true)).toEqual([archived, active]);
  });
});

import { Budget, Category, Transaction, TransactionType } from '../models/finance';
import { defaultCategories } from '../services/initialData';

export const categories: Category[] = defaultCategories;

export const getCategoryByKey = (key: string): Category =>
  categories.find((category) => category.id === key || category.name === key) || categories[1];

export const getCategoryIcon = (category: string): string =>
  categories.find((item) => item.id === category || item.name === category)?.icon || 'category';

export const getCategoryColor = (category: string): string =>
  categories.find((item) => item.id === category || item.name === category)?.color || '#64748B';

export const MAX_CATEGORY_NAME_LENGTH = 48;

export type CategoryRemovalDecision = 'archive' | 'delete' | 'blocked_default';

export type CategoryDraft = Pick<Category, 'name' | 'type' | 'color' | 'icon' | 'monthlyBudget'>;

export interface CategoryUsage {
  inUse: boolean;
  budgetLinked: boolean;
}

export const normalizeCategoryName = (value: string): string => value.trim().replace(/\s+/g, ' ');

export const isCategoryArchived = (category: Category): boolean => category.isArchived === true;

export const isDefaultCategory = (category: Category): boolean => category.isDefault === true;

export const validateCategoryName = (
  value: string,
  categoriesToCheck: Category[],
  type: TransactionType,
  excludeId?: string
): string => {
  const name = normalizeCategoryName(value);

  if (!name) throw new Error('Category name is required');
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    throw new Error(`Category name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer`);
  }

  const normalizedName = name.toLocaleLowerCase();
  const duplicate = categoriesToCheck.some(
    (category) =>
      category.id !== excludeId &&
      category.type === type &&
      normalizeCategoryName(category.name).toLocaleLowerCase() === normalizedName
  );

  if (duplicate) throw new Error('A category with this name already exists for this transaction type');

  return name;
};

export const validateCategoryDraft = (
  draft: CategoryDraft,
  categoriesToCheck: Category[],
  excludeId?: string
): CategoryDraft => {
  if (draft.type !== 'income' && draft.type !== 'expense') {
    throw new Error('Category type must be income or expense');
  }
  if (!Number.isFinite(draft.monthlyBudget) || draft.monthlyBudget < 0) {
    throw new Error('Budget amount cannot be negative');
  }

  return {
    ...draft,
    name: validateCategoryName(draft.name, categoriesToCheck, draft.type, excludeId),
  };
};

export const isCategoryInUse = (categoryId: string, transactions: Transaction[]): boolean =>
  transactions.some((transaction) => transaction.categoryId === categoryId);

export const isCategoryBudgetLinked = (categoryId: string, budgets: Budget[]): boolean =>
  budgets.some((budget) => Object.prototype.hasOwnProperty.call(budget.categoryBudgets, categoryId));

export const getCategoryUsage = (
  categoryId: string,
  transactions: Transaction[],
  budgets: Budget[]
): CategoryUsage => ({
  inUse: isCategoryInUse(categoryId, transactions),
  budgetLinked: isCategoryBudgetLinked(categoryId, budgets),
});

export const getCategoryRemovalDecision = (
  category: Category,
  _transactions: Transaction[],
  _budgets: Budget[]
): CategoryRemovalDecision => {
  if (isDefaultCategory(category)) return 'blocked_default';
  return 'archive';
};

/**
 * Active categories are available for new transactions. An edit keeps its
 * current archived category available so historical records remain editable.
 */
export const getTransactionCategoryOptions = (
  allCategories: Category[],
  type: TransactionType,
  selectedCategoryId?: string,
  includeSelectedArchived = false
): Category[] =>
  allCategories.filter(
    (category) =>
      category.type === type &&
      (!isCategoryArchived(category) || (includeSelectedArchived && category.id === selectedCategoryId))
  );

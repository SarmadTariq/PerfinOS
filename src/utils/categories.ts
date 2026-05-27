import { Category } from '../models/finance';
import { defaultCategories } from '../services/initialData';

export const categories: Category[] = defaultCategories;

export const getCategoryByKey = (key: string): Category =>
  categories.find((category) => category.id === key || category.name === key) || categories[1];

export const getCategoryIcon = (category: string): string =>
  categories.find((item) => item.id === category || item.name === category)?.icon || 'category';

export const getCategoryColor = (category: string): string =>
  categories.find((item) => item.id === category || item.name === category)?.color || '#64748B';

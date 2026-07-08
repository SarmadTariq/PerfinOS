import type { AppData } from '../../models/finance';
import {
  listUserEntities,
  replaceUserEntityCollection,
} from './entityRepository';

export type RemoteEntityCollections = Pick<
  AppData,
  | 'transactions'
  | 'categories'
  | 'budgets'
  | 'savingsGoals'
  | 'recurringExpenses'
  | 'reports'
>;

export const loadRemoteAppDataEntities = async (
  userId: string
): Promise<RemoteEntityCollections> => ({
  transactions: await listUserEntities(userId, 'transactions'),
  categories: await listUserEntities(userId, 'categories'),
  budgets: await listUserEntities(userId, 'budgets'),
  savingsGoals: await listUserEntities(userId, 'savingsGoals'),
  recurringExpenses: await listUserEntities(userId, 'recurringExpenses'),
  reports: await listUserEntities(userId, 'reports'),
});

export const saveRemoteAppDataEntities = async (
  userId: string,
  data: AppData
): Promise<void> => {
  await Promise.all([
    replaceUserEntityCollection(userId, 'transactions', data.transactions),
    replaceUserEntityCollection(userId, 'categories', data.categories),
    replaceUserEntityCollection(userId, 'budgets', data.budgets),
    replaceUserEntityCollection(userId, 'savingsGoals', data.savingsGoals),
    replaceUserEntityCollection(userId, 'recurringExpenses', data.recurringExpenses),
    replaceUserEntityCollection(userId, 'reports', data.reports),
  ]);
};

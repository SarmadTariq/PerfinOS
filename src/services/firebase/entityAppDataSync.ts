import type { AppData } from '../../models/finance';
import {
  listUserEntities,
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
): Promise<RemoteEntityCollections> => {
  const [
    transactions,
    categories,
    budgets,
    savingsGoals,
    recurringExpenses,
    reports,
  ] = await Promise.all([
    listUserEntities(userId, 'transactions'),
    listUserEntities(userId, 'categories'),
    listUserEntities(userId, 'budgets'),
    listUserEntities(userId, 'savingsGoals'),
    listUserEntities(userId, 'recurringExpenses'),
    listUserEntities(userId, 'reports'),
  ]);

  return {
    transactions,
    categories,
    budgets,
    savingsGoals,
    recurringExpenses,
    reports,
  };
};

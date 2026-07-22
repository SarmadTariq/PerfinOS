import { Budget } from "../../models/finance";
import {
  createUserEntity,
  deleteUserEntity,
  getUserEntity,
  listUserEntities,
  updateUserEntity,
  subscribeUserEntities
} from "./entityRepository";

export const createBudget = (
  userId: string,
  budget: Budget
) => createUserEntity(userId, "budgets", budget);

export const getBudget = (
  userId: string,
  budgetId: string
) => getUserEntity(userId, "budgets", budgetId);

export const listBudgets = (
  userId: string
) => listUserEntities(userId, "budgets");

export const updateBudget = (
  userId: string,
  budgetId: string,
  updates: Partial<Budget>
) => updateUserEntity(userId, "budgets", budgetId, updates);

export const deleteBudget = (
  userId: string,
  budgetId: string
) => deleteUserEntity(userId, "budgets", budgetId);

export const subscribeToBudgets = (
  userId: string,
  onData: (budgets: Budget[]) => void,
  onError?: (error: Error) => void
) => subscribeUserEntities(userId, "budgets", onData, onError);
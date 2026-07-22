import { RecurringExpense } from "../../models/finance";
import {
  createUserEntity,
  deleteUserEntity,
  getUserEntity,
  listUserEntities,
  updateUserEntity,
  subscribeUserEntities
} from "./entityRepository";

export const createRecurringExpense = (
  userId: string,
  recurringExpense: RecurringExpense
) => createUserEntity(userId, "recurringExpenses", recurringExpense);

export const getRecurringExpense = (
  userId: string,
  recurringExpenseId: string
) => getUserEntity(userId, "recurringExpenses", recurringExpenseId);

export const listRecurringExpenses = (
  userId: string
) => listUserEntities(userId, "recurringExpenses");

export const updateRecurringExpense = (
  userId: string,
  recurringExpenseId: string,
  updates: Partial<RecurringExpense>
) => updateUserEntity(userId, "recurringExpenses", recurringExpenseId, updates);

export const deleteRecurringExpense = (
  userId: string,
  recurringExpenseId: string
) => deleteUserEntity(userId, "recurringExpenses", recurringExpenseId);

export const subscribeToRecurringExpenses = (
  userId: string,
  onData: (recurringExpenses: RecurringExpense[]) => void,
  onError?: (error: Error) => void
) => subscribeUserEntities(userId, "recurringExpenses", onData, onError);
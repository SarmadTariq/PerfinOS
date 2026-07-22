import { SavingsGoal } from "../../models/finance";
import {
  createUserEntity,
  deleteUserEntity,
  getUserEntity,
  listUserEntities,
  updateUserEntity,
  subscribeUserEntities
} from "./entityRepository";

export const createSavingsGoal = (
  userId: string,
  savingsGoal: SavingsGoal
) => createUserEntity(userId, "savingsGoals", savingsGoal);

export const getSavingsGoal = (
  userId: string,
  savingsGoalId: string
) => getUserEntity(userId, "savingsGoals", savingsGoalId);

export const listSavingsGoals = (
  userId: string
) => listUserEntities(userId, "savingsGoals");

export const updateSavingsGoal = (
  userId: string,
  savingsGoalId: string,
  updates: Partial<SavingsGoal>
) => updateUserEntity(userId, "savingsGoals", savingsGoalId, updates);

export const deleteSavingsGoal = (
  userId: string,
  savingsGoalId: string
) => deleteUserEntity(userId, "savingsGoals", savingsGoalId);

export const subscribeToSavingsGoals = (
  userId: string,
  onData: (savingsGoals: SavingsGoal[]) => void,
  onError?: (error: Error) => void
) => subscribeUserEntities(userId, "savingsGoals", onData, onError);
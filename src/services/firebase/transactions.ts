import { Transaction } from "../../models/finance";
import {
  createUserEntity,
  deleteUserEntity,
  getUserEntity,
  listUserEntities,
  updateUserEntity,
  subscribeUserEntities
} from "./entityRepository";

export const createTransaction = (
  userId: string,
  transaction: Transaction
) => createUserEntity(userId, "transactions", transaction);

export const getTransaction = (
  userId: string,
  transactionId: string
) => getUserEntity(userId, "transactions", transactionId);

export const listTransactions = (
  userId: string
) => listUserEntities(userId, "transactions");

export const updateTransaction = (
  userId: string,
  transactionId: string,
  updates: Partial<Transaction>
) => updateUserEntity(userId, "transactions", transactionId, updates);

export const deleteTransaction = (
  userId: string,
  transactionId: string
) => deleteUserEntity(userId, "transactions", transactionId);

export const subscribeToTransactions = (
  userId: string,
  onData: (transactions: Transaction[]) => void,
  onError?: (error: Error) => void
) => subscribeUserEntities(userId, "transactions", onData, onError);
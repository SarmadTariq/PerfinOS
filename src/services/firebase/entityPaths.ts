import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  collection,
  doc,
} from 'firebase/firestore';
import { db } from './client';

export const ENTITY_COLLECTIONS = {
  transactions: 'transactions',
  categories: 'categories',
  budgets: 'budgets',
  savingsGoals: 'savingsGoals',
  recurringExpenses: 'recurringExpenses',
  reports: 'reports',
  profile: 'profile',
  entitlement: 'entitlement',
  appMeta: 'appMeta',
} as const;

export const SINGLETON_ENTITY_DOCUMENT_IDS = {
  profile: 'current',
  entitlement: 'current',
  appMeta: 'current',
} as const;

export type EntityCollectionKey = keyof typeof ENTITY_COLLECTIONS;
export type EntityCollectionName = (typeof ENTITY_COLLECTIONS)[EntityCollectionKey];

export type SingletonEntityKey = keyof typeof SINGLETON_ENTITY_DOCUMENT_IDS;
export type SingletonEntityDocumentId =
  (typeof SINGLETON_ENTITY_DOCUMENT_IDS)[SingletonEntityKey];

export const getUserRootPath = (userId: string) => `users/${userId}`;

export const getUserEntityCollectionPath = (
  userId: string,
  collectionName: EntityCollectionName
) => `${getUserRootPath(userId)}/${collectionName}`;

export const getUserEntityDocumentPath = (
  userId: string,
  collectionName: EntityCollectionName,
  documentId: string
) => `${getUserEntityCollectionPath(userId, collectionName)}/${documentId}`;

export const getUserEntityCollectionRef = (
  userId: string,
  collectionName: EntityCollectionName
): CollectionReference<DocumentData> => {
  if (!db) throw new Error('Firestore is not configured');
  return collection(db, 'users', userId, collectionName);
};

export const getUserEntityDocumentRef = (
  userId: string,
  collectionName: EntityCollectionName,
  documentId: string
): DocumentReference<DocumentData> => {
  if (!db) throw new Error('Firestore is not configured');
  return doc(db, 'users', userId, collectionName, documentId);
};

export const getTransactionsCollectionRef = (userId: string) =>
  getUserEntityCollectionRef(userId, ENTITY_COLLECTIONS.transactions);

export const getTransactionDocumentRef = (userId: string, transactionId: string) =>
  getUserEntityDocumentRef(userId, ENTITY_COLLECTIONS.transactions, transactionId);

export const getCategoriesCollectionRef = (userId: string) =>
  getUserEntityCollectionRef(userId, ENTITY_COLLECTIONS.categories);

export const getCategoryDocumentRef = (userId: string, categoryId: string) =>
  getUserEntityDocumentRef(userId, ENTITY_COLLECTIONS.categories, categoryId);

export const getBudgetsCollectionRef = (userId: string) =>
  getUserEntityCollectionRef(userId, ENTITY_COLLECTIONS.budgets);

export const getBudgetDocumentRef = (userId: string, budgetId: string) =>
  getUserEntityDocumentRef(userId, ENTITY_COLLECTIONS.budgets, budgetId);

export const getSavingsGoalsCollectionRef = (userId: string) =>
  getUserEntityCollectionRef(userId, ENTITY_COLLECTIONS.savingsGoals);

export const getSavingsGoalDocumentRef = (userId: string, goalId: string) =>
  getUserEntityDocumentRef(userId, ENTITY_COLLECTIONS.savingsGoals, goalId);

export const getRecurringExpensesCollectionRef = (userId: string) =>
  getUserEntityCollectionRef(userId, ENTITY_COLLECTIONS.recurringExpenses);

export const getRecurringExpenseDocumentRef = (
  userId: string,
  recurringExpenseId: string
) =>
  getUserEntityDocumentRef(
    userId,
    ENTITY_COLLECTIONS.recurringExpenses,
    recurringExpenseId
  );

export const getReportsCollectionRef = (userId: string) =>
  getUserEntityCollectionRef(userId, ENTITY_COLLECTIONS.reports);

export const getReportDocumentRef = (userId: string, reportId: string) =>
  getUserEntityDocumentRef(userId, ENTITY_COLLECTIONS.reports, reportId);

export const getProfileCollectionRef = (userId: string) =>
  getUserEntityCollectionRef(userId, ENTITY_COLLECTIONS.profile);

export const getProfileDocumentRef = (userId: string) =>
  getUserEntityDocumentRef(
    userId,
    ENTITY_COLLECTIONS.profile,
    SINGLETON_ENTITY_DOCUMENT_IDS.profile
  );

export const getEntitlementCollectionRef = (userId: string) =>
  getUserEntityCollectionRef(userId, ENTITY_COLLECTIONS.entitlement);

export const getEntitlementDocumentRef = (userId: string) =>
  getUserEntityDocumentRef(
    userId,
    ENTITY_COLLECTIONS.entitlement,
    SINGLETON_ENTITY_DOCUMENT_IDS.entitlement
  );

export const getAppMetaCollectionRef = (userId: string) =>
  getUserEntityCollectionRef(userId, ENTITY_COLLECTIONS.appMeta);

export const getAppMetaDocumentRef = (userId: string) =>
  getUserEntityDocumentRef(
    userId,
    ENTITY_COLLECTIONS.appMeta,
    SINGLETON_ENTITY_DOCUMENT_IDS.appMeta
  );

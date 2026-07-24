import type {
  Budget,
  Category,
  Entitlement,
  FinancePreferences,
  MigrationState,
  Profile,
  RecurringExpense,
  Report,
  SavingsGoal,
  Transaction,
  WorkspaceMeta,
} from '../../models/finance';
import type { FinancialPlan } from '../../models/planning';

export const FIRESTORE_ROOT_COLLECTIONS = {
  users: 'users',
} as const;

export const USER_PRIVATE_COLLECTION = 'private' as const;
export const LEGACY_APP_DATA_DOCUMENT = 'appData' as const;
export const USER_PROFILE_COLLECTION = 'profile' as const;
export const USER_PROFILE_DOCUMENT = 'main' as const;
export const PLAN_VERSIONS_COLLECTION = 'versions' as const;
export const PLAN_RESERVATIONS_COLLECTION = 'planReservations' as const;

export const USER_SINGLETON_DOCUMENTS = {
  profile: USER_PROFILE_DOCUMENT,
  preferences: 'preferences',
  entitlement: 'entitlement',
  migration: 'migration',
  workspaceMeta: 'workspaceMeta',
} as const;

export type UserSingletonKey = keyof typeof USER_SINGLETON_DOCUMENTS;

export interface UserSingletonMap {
  profile: Profile;
  preferences: FinancePreferences;
  entitlement: Entitlement;
  migration: MigrationState;
  workspaceMeta: WorkspaceMeta;
}

export type UserSingletonForKey<TSingleton extends UserSingletonKey> =
  UserSingletonMap[TSingleton];

export const USER_ENTITY_COLLECTIONS = {
  transactions: 'transactions',
  categories: 'categories',
  budgets: 'budgets',
  savingsGoals: 'savingsGoals',
  recurringExpenses: 'recurringExpenses',
  reports: 'reports',
  plans: 'plans',
} as const;

export type FirestoreRootCollectionKey = keyof typeof FIRESTORE_ROOT_COLLECTIONS;
export type FirestoreRootCollectionName =
  (typeof FIRESTORE_ROOT_COLLECTIONS)[FirestoreRootCollectionKey];

export type UserEntityCollectionKey = keyof typeof USER_ENTITY_COLLECTIONS;
export type MutableUserEntityCollectionKey = Exclude<
  UserEntityCollectionKey,
  'plans'
>;
export type UserEntityCollectionName =
  (typeof USER_ENTITY_COLLECTIONS)[UserEntityCollectionKey];

export interface UserEntityMap {
  transactions: Transaction;
  categories: Category;
  budgets: Budget;
  savingsGoals: SavingsGoal;
  recurringExpenses: RecurringExpense;
  reports: Report;
  plans: FinancialPlan;
}

export type UserEntityForCollection<TCollection extends UserEntityCollectionKey> =
  UserEntityMap[TCollection];

export interface FirestoreEntityDocument<TPayload> {
  id: string;
  data: TPayload;
}

export interface FirestoreEntityPathParts<TCollection extends UserEntityCollectionKey> {
  userId: string;
  collectionKey: TCollection;
  collectionName: UserEntityCollectionName;
  entityId?: string;
}

/**
 * Firebase Repository compatibility boundary.
 *
 * Repository consumers import Firebase capabilities from here while the SDK
 * implementation lives under src/services/firebase.
 *
 * This file should stay thin. Entity-specific repositories should be introduced
 * in later branches without expanding this compatibility layer with business logic.
 */

export {
  app,
  auth,
  db,
  firebaseConfig,
  firebaseConfigured,
  logoutRemote,
  sendRemotePasswordReset,
  signInRemote,
  signUpRemote,
  subscribeToAuth,
  getLegacyAppDataRef,
  legacyAppDataPath,
  ensureRemoteAppData,
  saveRemoteAppData,
  subscribeRemoteAppData,
  ENTITY_COLLECTIONS,
  SINGLETON_ENTITY_DOCUMENT_IDS,
  getAppMetaCollectionRef,
  getAppMetaDocumentRef,
  getBudgetDocumentRef,
  getBudgetsCollectionRef,
  getCategoriesCollectionRef,
  getCategoryDocumentRef,
  getEntitlementCollectionRef,
  getEntitlementDocumentRef,
  getProfileCollectionRef,
  getProfileDocumentRef,
  getRecurringExpenseDocumentRef,
  getRecurringExpensesCollectionRef,
  getReportDocumentRef,
  getReportsCollectionRef,
  getSavingsGoalDocumentRef,
  getSavingsGoalsCollectionRef,
  getTransactionDocumentRef,
  getTransactionsCollectionRef,
  getUserEntityCollectionPath,
  getUserEntityCollectionRef,
  getUserEntityDocumentPath,
  getUserEntityDocumentRef,
  getUserRootPath,
  createFirestoreWritePayload,
  serializeEntitiesForFirestore,
  serializeEntityForFirestore,
  serializeForFirestore,
  serializeNullableForFirestore,
  createEntityRepository,
  createUserEntity,
  deleteUserEntity,
  getUserEntity,
  listUserEntities,
  setUserEntity,
  updateUserEntity,
} from '../services/firebase';

export type {
  EntityCollectionKey,
  EntityCollectionName,
  SingletonEntityDocumentId,
  SingletonEntityKey,
  JsonPrimitive,
  JsonValue,
  EntityCreateInput,
  EntityId,
  EntityRecord,
  EntityRepository,
  EntityUpdateInput,
} from '../services/firebase';

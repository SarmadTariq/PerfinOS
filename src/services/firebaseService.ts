/**
 * Firebase service compatibility boundary.
 *
 * Current screens and FinanceContext can keep importing from this file while
 * Firebase internals move into focused modules under src/services/firebase.
 *
 * Do not add new Firebase SDK logic here. Add new Firebase code inside
 * src/services/firebase/* and re-export only when backward compatibility needs it.
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
} from './firebase';

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
} from './firebase';

export {
  app,
  auth,
  db,
  firebaseConfig,
  firebaseConfigured,
} from './client';

export {
  logoutRemote,
  sendRemotePasswordReset,
  signInRemote,
  signUpRemote,
  subscribeToAuth,
} from './auth';

export {
  getLegacyAppDataRef,
  legacyAppDataPath,
} from './paths';

export {
  ensureRemoteAppData,
  saveRemoteAppData,
  subscribeRemoteAppData,
} from './legacyAppDataStore';

export {
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
} from './entityPaths';

export type {
  EntityCollectionKey,
  EntityCollectionName,
  SingletonEntityDocumentId,
  SingletonEntityKey,
} from './entityPaths';

export {
  createFirestoreWritePayload,
  serializeEntitiesForFirestore,
  serializeEntityForFirestore,
  serializeForFirestore,
  serializeNullableForFirestore,
} from './serialization';

export type {
  JsonPrimitive,
  JsonValue,
} from './serialization';

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
  deleteRemoteIdentity,
  db,
  firebaseConfig,
  firebaseConfigured,
  getPlanAppCheckAvailability,
  getRemoteAppCheckToken,
  getRemoteIdToken,
  PlanAppCheckUnavailableError,
  logoutRemote,
  reauthenticateRemotePassword,
  sendRemotePasswordReset,
  signInRemote,
  signUpRemote,
  subscribeToAuth,
  supportedAuthProviders,
  getLegacyAppDataRef,
  legacyAppDataPath,
  ensureRemoteFinanceWorkspace,
  importFinanceWorkspace,
  subscribeRemoteFinanceWorkspace,
  createFinanceMutationId,
  persistFinanceWorkspaceMutation,
  FIRESTORE_ROOT_COLLECTIONS,
  LEGACY_APP_DATA_DOCUMENT,
  USER_ENTITY_COLLECTIONS,
  USER_PRIVATE_COLLECTION,
  getUserEntityCollectionRef,
  getUserEntityDocumentRef,
  legacyAppDataDocumentPath,
  userEntityCollectionName,
  userEntityCollectionPath,
  userEntityDocumentPath,
  userPrivatePath,
  userRootPath,
  deserializeUserEntities,
  deserializeUserEntity,
  fromJsonSafeValue,
  serializeUserEntities,
  serializeUserEntity,
  toJsonSafeValue,
  createUserEntity,
  deleteUserEntity,
  getUserEntity,
  listUserEntities,
  updateUserEntity,
  loadRemoteAppDataEntities,
} from './firebase';

export type {
  FirestoreEntityDocument,
  FirestoreEntityPathParts,
  FirestoreRootCollectionKey,
  FirestoreRootCollectionName,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  UserEntityCollectionKey,
  UserEntityCollectionName,
  UserEntityForCollection,
  UserEntityMap,
  RemoteEntityCollections,
  FinanceWorkspaceSnapshot,
  ReauthenticationErrorCode,
  ReauthenticationResult,
  SupportedAuthProvider,
} from './firebase';

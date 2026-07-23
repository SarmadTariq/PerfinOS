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
  getPlanAppCheckAvailability,
  getRemoteAppCheckToken,
  getRemoteIdToken,
  PlanAppCheckUnavailableError,
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
  replaceUserEntityCollection,
  updateUserEntity,
  loadRemoteAppDataEntities,
  saveRemoteAppDataEntities,
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
} from './firebase';

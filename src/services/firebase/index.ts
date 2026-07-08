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
  FIRESTORE_ROOT_COLLECTIONS,
  LEGACY_APP_DATA_DOCUMENT,
  USER_ENTITY_COLLECTIONS,
  USER_PRIVATE_COLLECTION,
} from './schema';

export type {
  FirestoreEntityDocument,
  FirestoreEntityPathParts,
  FirestoreRootCollectionKey,
  FirestoreRootCollectionName,
  UserEntityCollectionKey,
  UserEntityCollectionName,
  UserEntityForCollection,
  UserEntityMap,
} from './schema';

export {
  getUserEntityCollectionRef,
  getUserEntityDocumentRef,
  legacyAppDataDocumentPath,
  userEntityCollectionName,
  userEntityCollectionPath,
  userEntityDocumentPath,
  userPrivatePath,
  userRootPath,
} from './entityPaths';

export {
  deserializeUserEntities,
  deserializeUserEntity,
  fromJsonSafeValue,
  serializeUserEntities,
  serializeUserEntity,
  toJsonSafeValue,
} from './serializers';

export type {
  JsonObject,
  JsonPrimitive,
  JsonValue,
} from './serializers';

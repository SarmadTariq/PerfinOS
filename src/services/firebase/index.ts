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
  PLAN_VERSIONS_COLLECTION,
  USER_ENTITY_COLLECTIONS,
  USER_PRIVATE_COLLECTION,
} from './schema';

export type {
  FirestoreEntityDocument,
  FirestoreEntityPathParts,
  FirestoreRootCollectionKey,
  FirestoreRootCollectionName,
  MutableUserEntityCollectionKey,
  UserEntityCollectionKey,
  UserEntityCollectionName,
  UserEntityForCollection,
  UserEntityMap,
} from './schema';


export {
  getUserPlanDocumentRef,
  getUserPlansCollectionRef,
  getUserPlanVersionDocumentRef,
  getUserPlanVersionsCollectionRef,
  userPlanDocumentPath,
  userPlansCollectionPath,
  userPlanVersionDocumentPath,
  userPlanVersionsCollectionPath,
} from './planPaths';

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


export {
  createPlan,
  createPlanVersion,
  getPlan,
  getPlanVersion,
  listPlans,
  listPlanVersions,
} from './planRepository';

export type {
  CreatePlanInput,
  PlanVersionCreationResult,
} from './planRepository';

export {
  createUserEntity,
  deleteUserEntity,
  getUserEntity,
  listUserEntities,
  replaceUserEntityCollection,
  updateUserEntity,
} from './entityRepository';

export {
  loadRemoteAppDataEntities,
  saveRemoteAppDataEntities,
} from './entityAppDataSync';

export type {
  RemoteEntityCollections,
} from './entityAppDataSync';

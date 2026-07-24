export {
  app,
  auth,
  db,
  firebaseConfig,
  firebaseConfigured,
} from './client';

export {
  getRemoteIdToken,
  logoutRemote,
  sendRemotePasswordReset,
  signInRemote,
  signUpRemote,
  subscribeToAuth,
} from './auth';

export {
  getPlanAppCheckAvailability,
  getRemoteAppCheckToken,
  PlanAppCheckUnavailableError,
} from './appCheck';

export type {
  PlanAppCheckAvailability,
} from './appCheck';

export {
  getLegacyAppDataRef,
  legacyAppDataPath,
} from './paths';

export {
  FIRESTORE_ROOT_COLLECTIONS,
  LEGACY_APP_DATA_DOCUMENT,
  PLAN_RESERVATIONS_COLLECTION,
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
  userPlanReservationsCollectionPath,
  userPlanReservationDocumentPath,
  getUserPlanReservationsCollectionRef,
  getUserPlanReservationDocumentRef,
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
  assertPlanStatusTransition,
  isPlanStatusTransitionAllowed,
  planDateKeys,
  transitionPlanLifecycle,
} from './planLifecycle';

export type {
  PlanLifecycleTargetStatus,
} from './planLifecycle';

export {
  createPlan,
  createPlanVersion,
  getPlan,
  getPlanVersion,
  listPlans,
  listPlanVersions,
  updatePlanLifecycle,
} from './planRepository';
export {
  applyPlanAction,
  getPlanActionState,
  listPlanActionResults,
  recordPlanActionOutcome,
  type ApplyPlanActionInput,
  type RecordPlanActionOutcomeInput,
} from './planActionRepository';

export type {
  CreatePlanInput,
  UpdatePlanLifecycleInput,
  PlanDateReservation,
  PlanVersionCreationResult,
} from './planRepository';

export {
  createUserEntity,
  deleteUserEntity,
  getUserEntity,
  listUserEntities,
  subscribeUserEntities,
  updateUserEntity,
} from './entityRepository';

export {
  loadRemoteAppDataEntities,
} from './entityAppDataSync';

export type {
  RemoteEntityCollections,
} from './entityAppDataSync';

export {
  getUserSingleton,
  setUserSingleton,
  subscribeUserSingleton,
  updateUserSingleton,
} from './documentRepository';

export {
  canonicalFinanceJson,
  composeFinanceWorkspace,
  createInitialMigrationState,
  createInitialWorkspaceMeta,
  financeWorkspaceChecksum,
  financeWorkspaceCounts,
  splitFinanceWorkspace,
} from './financeWorkspaceContracts';

export type {
  FinanceWorkspaceDocuments,
} from './financeWorkspaceContracts';

export {
  getLegacyAppData,
  initializeFinanceWorkspace,
  migrateLegacyAppData,
  MIGRATION_CHUNK_SIZE,
} from './migrationRepository';

export {
  ensureRemoteFinanceWorkspace,
  importFinanceWorkspace,
  subscribeRemoteFinanceWorkspace,
} from './financeWorkspaceRepository';

export type {
  FinanceWorkspaceSnapshot,
} from './financeWorkspaceRepository';

export {
  createFinanceMutationId,
  persistFinanceWorkspaceMutation,
} from './financeCommandRepository';

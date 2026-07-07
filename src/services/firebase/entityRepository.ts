import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  EntityCollectionName,
  getUserEntityCollectionRef,
  getUserEntityDocumentRef,
} from './entityPaths';
import {
  createFirestoreWritePayload,
  serializeEntityForFirestore,
} from './serialization';

export type EntityId = string;

export type EntityRecord = {
  id: EntityId;
};

export type EntityCreateInput<TEntity extends EntityRecord> = Omit<TEntity, 'id'> & {
  id?: EntityId;
};

export type EntityUpdateInput<TEntity extends EntityRecord> = Partial<Omit<TEntity, 'id'>>;

export type EntityRepository<TEntity extends EntityRecord> = {
  collectionName: EntityCollectionName;
  list: (userId: string) => Promise<TEntity[]>;
  get: (userId: string, entityId: EntityId) => Promise<TEntity | null>;
  create: (userId: string, input: EntityCreateInput<TEntity>) => Promise<TEntity>;
  set: (userId: string, entity: TEntity) => Promise<TEntity>;
  update: (
    userId: string,
    entityId: EntityId,
    input: EntityUpdateInput<TEntity>
  ) => Promise<void>;
  remove: (userId: string, entityId: EntityId) => Promise<void>;
};

const requireEntityId = (entityId: EntityId) => {
  const trimmed = entityId.trim();

  if (!trimmed) {
    throw new Error('Entity id is required');
  }

  return trimmed;
};

const attachSnapshotId = <TEntity extends EntityRecord>(
  snapshotId: string,
  data: Record<string, unknown>
): TEntity =>
  ({
    ...data,
    id: typeof data.id === 'string' && data.id.trim() ? data.id : snapshotId,
  }) as TEntity;

export const listUserEntities = async <TEntity extends EntityRecord>(
  userId: string,
  collectionName: EntityCollectionName
): Promise<TEntity[]> => {
  const snapshot = await getDocs(getUserEntityCollectionRef(userId, collectionName));

  return snapshot.docs.map((item) =>
    attachSnapshotId<TEntity>(item.id, item.data() as Record<string, unknown>)
  );
};

export const getUserEntity = async <TEntity extends EntityRecord>(
  userId: string,
  collectionName: EntityCollectionName,
  entityId: EntityId
): Promise<TEntity | null> => {
  const safeEntityId = requireEntityId(entityId);
  const snapshot = await getDoc(
    getUserEntityDocumentRef(userId, collectionName, safeEntityId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return attachSnapshotId<TEntity>(
    snapshot.id,
    snapshot.data() as Record<string, unknown>
  );
};

export const createUserEntity = async <TEntity extends EntityRecord>(
  userId: string,
  collectionName: EntityCollectionName,
  input: EntityCreateInput<TEntity>
): Promise<TEntity> => {
  const serialized = serializeEntityForFirestore(input);
  const requestedId =
    typeof serialized.id === 'string' && serialized.id.trim()
      ? serialized.id.trim()
      : null;

  if (requestedId) {
    const entity = { ...serialized, id: requestedId } as TEntity;

    await setDoc(
      getUserEntityDocumentRef(userId, collectionName, requestedId),
      createFirestoreWritePayload(entity)
    );

    return entity;
  }

  const ref = await addDoc(
    getUserEntityCollectionRef(userId, collectionName),
    createFirestoreWritePayload(serialized)
  );

  const entity = { ...serialized, id: ref.id } as TEntity;

  await updateDoc(
    getUserEntityDocumentRef(userId, collectionName, ref.id),
    createFirestoreWritePayload({ id: ref.id })
  );

  return entity;
};

export const setUserEntity = async <TEntity extends EntityRecord>(
  userId: string,
  collectionName: EntityCollectionName,
  entity: TEntity
): Promise<TEntity> => {
  const safeEntityId = requireEntityId(entity.id);
  const serialized = serializeEntityForFirestore({
    ...entity,
    id: safeEntityId,
  });

  await setDoc(
    getUserEntityDocumentRef(userId, collectionName, safeEntityId),
    createFirestoreWritePayload(serialized)
  );

  return serialized;
};

export const updateUserEntity = async <TEntity extends EntityRecord>(
  userId: string,
  collectionName: EntityCollectionName,
  entityId: EntityId,
  input: EntityUpdateInput<TEntity>
): Promise<void> => {
  const safeEntityId = requireEntityId(entityId);
  const serialized = serializeEntityForFirestore(input);

  await updateDoc(
    getUserEntityDocumentRef(userId, collectionName, safeEntityId),
    createFirestoreWritePayload(serialized)
  );
};

export const deleteUserEntity = async (
  userId: string,
  collectionName: EntityCollectionName,
  entityId: EntityId
): Promise<void> => {
  const safeEntityId = requireEntityId(entityId);

  await deleteDoc(getUserEntityDocumentRef(userId, collectionName, safeEntityId));
};

export const createEntityRepository = <TEntity extends EntityRecord>(
  collectionName: EntityCollectionName
): EntityRepository<TEntity> => ({
  collectionName,
  list: (userId) => listUserEntities<TEntity>(userId, collectionName),
  get: (userId, entityId) => getUserEntity<TEntity>(userId, collectionName, entityId),
  create: (userId, input) => createUserEntity<TEntity>(userId, collectionName, input),
  set: (userId, entity) => setUserEntity<TEntity>(userId, collectionName, entity),
  update: (userId, entityId, input) =>
    updateUserEntity<TEntity>(userId, collectionName, entityId, input),
  remove: (userId, entityId) => deleteUserEntity(userId, collectionName, entityId),
});

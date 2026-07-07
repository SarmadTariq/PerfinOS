import {
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import {
  getUserEntityCollectionRef,
  getUserEntityDocumentRef,
} from './entityPaths';
import {
  deserializeUserEntity,
  serializeUserEntity,
  toJsonSafeValue,
} from './serializers';
import type {
  UserEntityCollectionKey,
  UserEntityForCollection,
} from './schema';

type EntityWithId = {
  id: string;
};

const entityId = (entity: EntityWithId) => {
  if (!entity.id.trim()) {
    throw new Error('Firestore entity id is required');
  }

  return entity.id;
};

export const listUserEntities = async <TCollection extends UserEntityCollectionKey>(
  userId: string,
  collectionKey: TCollection
): Promise<UserEntityForCollection<TCollection>[]> => {
  const snapshot = await getDocs(getUserEntityCollectionRef(userId, collectionKey));

  return snapshot.docs.map((documentSnapshot) =>
    deserializeUserEntity<TCollection>({
      ...documentSnapshot.data(),
      id: documentSnapshot.id,
    })
  );
};

export const getUserEntity = async <TCollection extends UserEntityCollectionKey>(
  userId: string,
  collectionKey: TCollection,
  id: string
): Promise<UserEntityForCollection<TCollection> | null> => {
  const snapshot = await getDoc(getUserEntityDocumentRef(userId, collectionKey, id));

  if (!snapshot.exists()) return null;

  return deserializeUserEntity<TCollection>({
    ...snapshot.data(),
    id: snapshot.id,
  });
};

export const createUserEntity = async <TCollection extends UserEntityCollectionKey>(
  userId: string,
  collectionKey: TCollection,
  entity: UserEntityForCollection<TCollection> & EntityWithId
): Promise<UserEntityForCollection<TCollection>> => {
  await setDoc(
    getUserEntityDocumentRef(userId, collectionKey, entityId(entity)),
    serializeUserEntity<TCollection>(entity)
  );

  return entity;
};

export const updateUserEntity = async <TCollection extends UserEntityCollectionKey>(
  userId: string,
  collectionKey: TCollection,
  id: string,
  updates: Partial<UserEntityForCollection<TCollection>>
): Promise<void> => {
  if (!id.trim()) {
    throw new Error('Firestore entity id is required');
  }

  const ref = getUserEntityDocumentRef(userId, collectionKey, id);
  const safeUpdates = toJsonSafeValue(updates) as DocumentData;

  await updateDoc(ref, safeUpdates);
};

export const deleteUserEntity = async <TCollection extends UserEntityCollectionKey>(
  userId: string,
  collectionKey: TCollection,
  id: string
): Promise<void> => {
  if (!id.trim()) {
    throw new Error('Firestore entity id is required');
  }

  await deleteDoc(getUserEntityDocumentRef(userId, collectionKey, id));
};

export const replaceUserEntityCollection = async <TCollection extends UserEntityCollectionKey>(
  userId: string,
  collectionKey: TCollection,
  entities: Array<UserEntityForCollection<TCollection> & EntityWithId>
): Promise<void> => {
  const snapshot = await getDocs(getUserEntityCollectionRef(userId, collectionKey));

  await Promise.all(snapshot.docs.map((documentSnapshot) => deleteDoc(documentSnapshot.ref)));

  await Promise.all(
    entities.map((entity) => createUserEntity(userId, collectionKey, entity))
  );
};

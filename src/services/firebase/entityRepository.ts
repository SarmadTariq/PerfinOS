import {
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
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
  MutableUserEntityCollectionKey,
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

  return snapshot.docs
    .map((documentSnapshot) =>
      deserializeUserEntity<TCollection>({
        ...documentSnapshot.data(),
        id: documentSnapshot.id,
      })
    )
    .sort((left, right) => left.id.localeCompare(right.id));
};

export const subscribeUserEntities = <
  TCollection extends UserEntityCollectionKey,
>(
  userId: string,
  collectionKey: TCollection,
  onData: (entities: UserEntityForCollection<TCollection>[]) => void,
  onError: (error: Error) => void
) =>
  onSnapshot(
    getUserEntityCollectionRef(userId, collectionKey),
    (snapshot) =>
      onData(
        snapshot.docs
          .map((documentSnapshot) =>
            deserializeUserEntity<TCollection>({
              ...documentSnapshot.data(),
              id: documentSnapshot.id,
            })
          )
          .sort((left, right) => left.id.localeCompare(right.id))
      ),
    onError
  );

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

export const createUserEntity = async <TCollection extends MutableUserEntityCollectionKey>(
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

export const updateUserEntity = async <TCollection extends MutableUserEntityCollectionKey>(
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

export const deleteUserEntity = async <TCollection extends MutableUserEntityCollectionKey>(
  userId: string,
  collectionKey: TCollection,
  id: string
): Promise<void> => {
  if (!id.trim()) {
    throw new Error('Firestore entity id is required');
  }

  await deleteDoc(getUserEntityDocumentRef(userId, collectionKey, id));
};

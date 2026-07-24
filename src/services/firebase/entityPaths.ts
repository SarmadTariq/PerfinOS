import { collection, doc, type CollectionReference, type DocumentData, type DocumentReference } from 'firebase/firestore';
import { db } from './client';
import {
  FIRESTORE_ROOT_COLLECTIONS,
  LEGACY_APP_DATA_DOCUMENT,
  USER_PROFILE_COLLECTION,
  USER_PROFILE_DOCUMENT,
  USER_ENTITY_COLLECTIONS,
  USER_PRIVATE_COLLECTION,
  USER_SINGLETON_DOCUMENTS,
  type UserSingletonKey,
  type UserEntityCollectionKey,
  type UserEntityCollectionName,
} from './schema';

const requireFirestore = () => {
  if (!db) throw new Error('Firestore is not configured');

  return db;
};

export const userRootPath = (userId: string) =>
  `${FIRESTORE_ROOT_COLLECTIONS.users}/${userId}`;

export const userPrivatePath = (userId: string) =>
  `${userRootPath(userId)}/${USER_PRIVATE_COLLECTION}`;

export const legacyAppDataDocumentPath = (userId: string) =>
  `${userPrivatePath(userId)}/${LEGACY_APP_DATA_DOCUMENT}`;

export const userEntityCollectionName = <TCollection extends UserEntityCollectionKey>(
  collectionKey: TCollection
): UserEntityCollectionName => USER_ENTITY_COLLECTIONS[collectionKey];

export const userEntityCollectionPath = <TCollection extends UserEntityCollectionKey>(
  userId: string,
  collectionKey: TCollection
) => `${userRootPath(userId)}/${userEntityCollectionName(collectionKey)}`;

export const userEntityDocumentPath = <TCollection extends UserEntityCollectionKey>(
  userId: string,
  collectionKey: TCollection,
  entityId: string
) => `${userEntityCollectionPath(userId, collectionKey)}/${entityId}`;

export const getUserEntityCollectionRef = <TCollection extends UserEntityCollectionKey>(
  userId: string,
  collectionKey: TCollection
): CollectionReference<DocumentData> =>
  collection(
    requireFirestore(),
    FIRESTORE_ROOT_COLLECTIONS.users,
    userId,
    userEntityCollectionName(collectionKey)
  );

export const getUserEntityDocumentRef = <TCollection extends UserEntityCollectionKey>(
  userId: string,
  collectionKey: TCollection,
  entityId: string
): DocumentReference<DocumentData> =>
  doc(
    requireFirestore(),
    FIRESTORE_ROOT_COLLECTIONS.users,
    userId,
    userEntityCollectionName(collectionKey),
    entityId
  );

export const userSingletonDocumentPath = <TSingleton extends UserSingletonKey>(
  userId: string,
  singletonKey: TSingleton
) =>
  singletonKey === 'profile'
    ? `${userRootPath(userId)}/${USER_PROFILE_COLLECTION}/${USER_PROFILE_DOCUMENT}`
    : `${userPrivatePath(userId)}/${USER_SINGLETON_DOCUMENTS[singletonKey]}`;

export const getUserSingletonDocumentRef = <TSingleton extends UserSingletonKey>(
  userId: string,
  singletonKey: TSingleton
): DocumentReference<DocumentData> =>
  singletonKey === 'profile'
    ? doc(
        requireFirestore(),
        FIRESTORE_ROOT_COLLECTIONS.users,
        userId,
        USER_PROFILE_COLLECTION,
        USER_PROFILE_DOCUMENT
      )
    : doc(
        requireFirestore(),
        FIRESTORE_ROOT_COLLECTIONS.users,
        userId,
        USER_PRIVATE_COLLECTION,
        USER_SINGLETON_DOCUMENTS[singletonKey]
      );

import {
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { getUserSingletonDocumentRef } from './entityPaths';
import {
  deserializeUserSingleton,
  serializeUserSingleton,
  toJsonSafeValue,
} from './serializers';
import type {
  UserSingletonForKey,
  UserSingletonKey,
} from './schema';

export const getUserSingleton = async <TSingleton extends UserSingletonKey>(
  userId: string,
  singletonKey: TSingleton
): Promise<UserSingletonForKey<TSingleton> | null> => {
  const snapshot = await getDoc(
    getUserSingletonDocumentRef(userId, singletonKey)
  );

  if (!snapshot.exists()) return null;

  return deserializeUserSingleton(singletonKey, snapshot.data());
};

export const setUserSingleton = async <TSingleton extends UserSingletonKey>(
  userId: string,
  singletonKey: TSingleton,
  value: UserSingletonForKey<TSingleton>
): Promise<void> => {
  await setDoc(
    getUserSingletonDocumentRef(userId, singletonKey),
    serializeUserSingleton(singletonKey, value)
  );
};

export const updateUserSingleton = async <TSingleton extends UserSingletonKey>(
  userId: string,
  singletonKey: TSingleton,
  updates: Partial<UserSingletonForKey<TSingleton>>
): Promise<void> => {
  await updateDoc(
    getUserSingletonDocumentRef(userId, singletonKey),
    toJsonSafeValue(updates) as DocumentData
  );
};

export const subscribeUserSingleton = <TSingleton extends UserSingletonKey>(
  userId: string,
  singletonKey: TSingleton,
  onData: (value: UserSingletonForKey<TSingleton> | null) => void,
  onError: (error: Error) => void
) =>
  onSnapshot(
    getUserSingletonDocumentRef(userId, singletonKey),
    (snapshot) =>
      onData(
        snapshot.exists()
          ? deserializeUserSingleton(singletonKey, snapshot.data())
          : null
      ),
    onError
  );

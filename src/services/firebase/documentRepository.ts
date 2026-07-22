import {
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  type DocumentData,
} from "firebase/firestore";

import { getUserSingletonDocumentRef } from "./entityPaths";
import {
  deserializeUserDocument,
  serializeUserDocument,
  toJsonSafeValue,
} from "./serializers";

import type {
  UserSingletonKey,
  UserSingletonForKey,
} from "./schema";

export const getUserDocument = async <TSingleton extends UserSingletonKey>(
  userId: string,
  singletonKey: TSingleton
): Promise<UserSingletonForKey<TSingleton> | null> => {
  const snapshot = await getDoc(
    getUserSingletonDocumentRef(userId, singletonKey)
  );

  if (!snapshot.exists()) return null;

  return deserializeUserDocument<TSingleton>(
    snapshot.data()
  );
};

export const setUserDocument = async <TSingleton extends UserSingletonKey>(
  userId: string,
  singletonKey: TSingleton,
  document: UserSingletonForKey<TSingleton>
): Promise<void> => {
  await setDoc(
    getUserSingletonDocumentRef(userId, singletonKey),
    serializeUserDocument<TSingleton>(document)
  );
};

export const updateUserDocument = async <TSingleton extends UserSingletonKey>(
  userId: string,
  singletonKey: TSingleton,
  updates: Partial<UserSingletonForKey<TSingleton>>
): Promise<void> => {
  const safeUpdates = toJsonSafeValue(updates) as DocumentData;

  await updateDoc(
    getUserSingletonDocumentRef(userId, singletonKey),
    safeUpdates
  );
};

export const subscribeUserDocument = <TSingleton extends UserSingletonKey>(
  userId: string,
  singletonKey: TSingleton,
  onData: (document: UserSingletonForKey<TSingleton> | null) => void,
  onError?: (error: Error) => void
) =>
  onSnapshot(
    getUserSingletonDocumentRef(userId, singletonKey),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      onData(
        deserializeUserDocument<TSingleton>(
          snapshot.data()
        )
      );
    },
    onError
  );
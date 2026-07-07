import { getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { AppData } from '../../models/finance';
import { createEmptyAppData } from '../initialData';
import { getLegacyAppDataRef } from './paths';
import { saveRemoteAppDataEntities } from './entityAppDataSync';

const normalizeRemoteData = (_userId: string, data: AppData): AppData => data;

const firestoreSafeData = (data: AppData): AppData =>
  JSON.parse(JSON.stringify(data)) as AppData;

const persistRemoteAppData = async (userId: string, data: AppData) => {
  const safeData = firestoreSafeData(normalizeRemoteData(userId, data));

  await setDoc(getLegacyAppDataRef(userId), safeData);
  await saveRemoteAppDataEntities(userId, safeData);
};

export const ensureRemoteAppData = async (userId: string, fallback?: AppData) => {
  const ref = getLegacyAppDataRef(userId);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return snapshot.data() as AppData;
  }

  const empty = normalizeRemoteData(
    userId,
    fallback || createEmptyAppData({ userId, isGuest: false })
  );

  await persistRemoteAppData(userId, empty);
  return empty;
};

export const saveRemoteAppData = async (userId: string, data: AppData) => {
  await persistRemoteAppData(userId, data);
};

export const subscribeRemoteAppData = (
  userId: string,
  onData: (data: AppData) => void,
  onError: (error: Error) => void
) =>
  onSnapshot(
    getLegacyAppDataRef(userId),
    (snapshot) => {
      if (snapshot.exists()) {
        onData(normalizeRemoteData(userId, snapshot.data() as AppData));
      }
    },
    (error) => onError(error)
  );

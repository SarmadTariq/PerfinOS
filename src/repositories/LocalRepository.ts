/**
 * Local Repository — AsyncStorage persistence for guest/offline mode.
 *
 * Abstracts the storage key and parse/serialise logic behind a clean interface.
 * Previously located at `src/services/localFinanceStore.ts`.
 * The old file is kept as a re-export shim for backward compatibility.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from '../models/finance';
import {
  GUEST_STORAGE_NAMESPACE,
  resolveGuestStorageData,
} from './guestStorageMigration';

let lastGuestStorageRecoveryNotice:
  string | null =
  null;

/**
 * Loads guest app data from AsyncStorage.
 * On first launch (no stored data) or parse failure, seeds demo data automatically.
 *
 * @returns Hydrated AppData with all required fields normalised
 */
export const loadGuestAppData = async (): Promise<AppData> => {
  const raw = await AsyncStorage.getItem(GUEST_STORAGE_NAMESPACE);
  const result =
    resolveGuestStorageData(
      raw
    );

  lastGuestStorageRecoveryNotice =
    result.recoveryNotice;

  if (result.shouldPersist) {
    await saveGuestAppData(
      result.data
    );
  }

  return result.data;
};

/**
 * Serialises and persists AppData to AsyncStorage.
 *
 * @param data - The full AppData object to save
 */
export const saveGuestAppData = async (data: AppData) => {
  await AsyncStorage.setItem(GUEST_STORAGE_NAMESPACE, JSON.stringify(data));
};

/**
 * Removes guest data from AsyncStorage.
 * Called on sign-in when the user chooses "Start Fresh".
 */
export const clearGuestAppData = async () => {
  await AsyncStorage.removeItem(GUEST_STORAGE_NAMESPACE);
};

export const getLastGuestStorageRecoveryNotice =
  () =>
    lastGuestStorageRecoveryNotice;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from '../models/finance';
import { createDemoAppData } from './initialData';

const GUEST_STORAGE_KEY = 'perfin-os.guest.v1';

/**
 * Guest mode is a demo workspace, not a durable account.
 * Always start from a fresh seeded dataset so screenshots, presentations,
 * and reviewer demos are predictable.
 */
export const loadGuestAppData = async (): Promise<AppData> => {
  const demo = createDemoAppData();
  await saveGuestAppData(demo);
  return demo;
};

export const saveGuestAppData = async (data: AppData) => {
  await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data));
};

export const clearGuestAppData = async () => {
  await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
};
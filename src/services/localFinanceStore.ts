import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from '../models/finance';
import { createDemoAppData, createEmptyAppData } from './initialData';

const GUEST_STORAGE_KEY = 'perfin-os.guest.v1';

export const loadGuestAppData = async (): Promise<AppData> => {
  const raw = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
  if (!raw) {
    const demo = createDemoAppData();
    await saveGuestAppData(demo);
    return demo;
  }

  try {
    const parsed = JSON.parse(raw) as AppData;
    return {
      ...parsed,
      entitlement: parsed.entitlement || createEmptyAppData({ userId: parsed.user.id, isGuest: true }).entitlement,
      transactions: parsed.transactions.map((transaction) => ({
        ...transaction,
        receipts: transaction.receipts || [],
        location: {
          ...transaction.location,
          name: transaction.location.name || transaction.merchant,
          formattedAddress: transaction.location.formattedAddress || transaction.location.address,
          source: transaction.location.source || 'imported',
        },
      })),
    };
  } catch {
    const demo = createDemoAppData();
    await saveGuestAppData(demo);
    return demo;
  }
};

export const saveGuestAppData = async (data: AppData) => {
  await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data));
};

export const clearGuestAppData = async () => {
  await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
};

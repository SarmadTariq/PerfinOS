import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from '../models/finance';
import { createDemoAppData, createEmptyAppData } from './initialData';

const GUEST_STORAGE_KEY = 'perfin-os.guest.v2';

const shouldReseedGuestData = (data: AppData): boolean => {
  return (
    data.entitlement?.isGuest === true &&
    data.transactions.length === 0 &&
    data.budgets.length <= 1 &&
    data.savingsGoals.length === 0
  );
};

const normalizeGuestData = (data: AppData): AppData => ({
  ...data,
  entitlement: data.entitlement || createEmptyAppData({ userId: data.user.id, isGuest: true }).entitlement,
  transactions: data.transactions.map((transaction) => ({
    ...transaction,
    receipts: transaction.receipts || [],
    location: {
      ...transaction.location,
      name: transaction.location.name || transaction.merchant,
      formattedAddress: transaction.location.formattedAddress || transaction.location.address,
      source: transaction.location.source || 'imported',
    },
  })),
});

export const loadGuestAppData = async (): Promise<AppData> => {
  const raw = await AsyncStorage.getItem(GUEST_STORAGE_KEY);

  if (!raw) {
    const demo = createDemoAppData();
    await saveGuestAppData(demo);
    return demo;
  }

  try {
    const parsed = normalizeGuestData(JSON.parse(raw) as AppData);

    if (shouldReseedGuestData(parsed)) {
      const demo = createDemoAppData();
      await saveGuestAppData(demo);
      return demo;
    }

    return parsed;
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
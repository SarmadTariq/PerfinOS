/**
 * Local Repository — AsyncStorage persistence for guest/offline mode.
 *
 * Abstracts the storage key and parse/serialise logic behind a clean interface.
 * Previously located at `src/services/localFinanceStore.ts`.
 * The old file is kept as a re-export shim for backward compatibility.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from '../models/finance';
import { createDemoAppData, createEmptyAppData } from '../services/initialData';

/** AsyncStorage key for guest workspace data. Versioned to allow future migrations. */
const GUEST_STORAGE_KEY = 'perfin-os.guest.v1';

/**
 * Loads guest app data from AsyncStorage.
 * On first launch (no stored data) or parse failure, seeds demo data automatically.
 *
 * @returns Hydrated AppData with all required fields normalised
 */
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
      entitlement:
        parsed.entitlement ||
        createEmptyAppData({ userId: parsed.user.id, isGuest: true }).entitlement,
      transactions: parsed.transactions.map((t) => ({
        ...t,
        receipts: t.receipts || [],
        location: {
          ...t.location,
          name: t.location.name || t.merchant,
          formattedAddress: t.location.formattedAddress || t.location.address,
          source: t.location.source || 'imported',
        },
      })),
    };
  } catch {
    // Corrupt data — reset to demo
    const demo = createDemoAppData();
    await saveGuestAppData(demo);
    return demo;
  }
};

/**
 * Serialises and persists AppData to AsyncStorage.
 *
 * @param data - The full AppData object to save
 */
export const saveGuestAppData = async (data: AppData) => {
  await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data));
};

/**
 * Removes guest data from AsyncStorage.
 * Called on sign-in when the user chooses "Start Fresh".
 */
export const clearGuestAppData = async () => {
  await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
};

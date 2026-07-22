import { AppData } from "../../models/finance";
import {
  getUserDocument,
  setUserDocument,
  subscribeUserDocument,
} from "./documentRepository";
import { saveRemoteAppDataEntities } from "./entityAppDataSync";
import { createEmptyAppData } from "../initialData";
import {listTransactions, subscribeToTransactions} from "./transactions";
import { listCategories, subscribeToCategories} from "./categories";
import { listBudgets, subscribeToBudgets} from "./budgets";
import {listSavingsGoals, subscribeToSavingsGoals} from "./savingGoals";
import {
  listRecurringExpenses,
  subscribeToRecurringExpenses,
} from "./recurringExpenses";

const normalizeRemoteData = (_userId: string, data: AppData): AppData => data;

const firestoreSafeData = (data: AppData): AppData =>
  JSON.parse(JSON.stringify(data)) as AppData;

export const ensureRemoteAppData = async (
  userId: string
): Promise<AppData> => {
  const [
    profile,
    entitlement,
    transactions,
    categories,
    budgets,
    savingsGoals,
    recurringExpenses,
  ] = await Promise.all([
    getUserDocument(userId, "profile"),
    getUserDocument(userId, "entitlement"),
    listTransactions(userId),
    listCategories(userId),
    listBudgets(userId),
    listSavingsGoals(userId),
    listRecurringExpenses(userId),
  ]);

  if (!profile || !entitlement) {
    const empty = createEmptyAppData({ isGuest: false });
    await saveRemoteAppData(userId, empty);
    return empty;
  }

  return {
    user: profile,
    entitlement,
    transactions,
    categories,
    budgets,
    savingsGoals,
    recurringExpenses,
    reports: [],
  };
};

export const saveRemoteAppData = async (
  userId: string,
  data: AppData
) => {
  const safeData = firestoreSafeData(
    normalizeRemoteData(userId, data)
  );

  await Promise.all([
    setUserDocument(userId, "profile", safeData.user),
    setUserDocument(userId, "entitlement", safeData.entitlement),
    saveRemoteAppDataEntities(userId, safeData),
  ]);
};

export const subscribeRemoteAppData = async (
  userId: string,
  onData: (data: AppData) => void
) => {
  let cache = await ensureRemoteAppData(userId);

  const emit = () => onData(cache);

  const unsubscribeProfile = subscribeUserDocument(
    userId,
    "profile",
    (profile) => {
      if (!profile) return;
      cache = { ...cache, user: profile };
      emit();
    }
  );

  const unsubscribeEntitlement = subscribeUserDocument(
    userId,
    "entitlement",
    (entitlement) => {
      if (!entitlement) return;
      cache = { ...cache, entitlement };
      emit();
    }
  );

  const unsubscribeTransactions = subscribeToTransactions(
    userId,
    (transactions) => {
      cache = { ...cache, transactions };
      emit();
    }
  );

  const unsubscribeCategories = subscribeToCategories(
    userId,
    (categories) => {
      cache = { ...cache, categories };
      emit();
    }
  );

  const unsubscribeBudgets = subscribeToBudgets(
    userId,
    (budgets) => {
      cache = { ...cache, budgets };
      emit();
    }
  );

  const unsubscribeSavingsGoals = subscribeToSavingsGoals(
    userId,
    (savingsGoals) => {
      cache = { ...cache, savingsGoals };
      emit();
    }
  );

  const unsubscribeRecurringExpenses =
    subscribeToRecurringExpenses(
      userId,
      (recurringExpenses) => {
        cache = {
          ...cache,
          recurringExpenses,
        };
        emit();
      }
    );

  return () => {
    unsubscribeProfile();
    unsubscribeEntitlement();
    unsubscribeTransactions();
    unsubscribeCategories();
    unsubscribeBudgets();
    unsubscribeSavingsGoals();
    unsubscribeRecurringExpenses();
  };
};
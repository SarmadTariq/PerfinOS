import type {
  AppData,
  MigrationState,
  WorkspaceMeta,
} from '../../models/finance';
import { createEmptyAppData } from '../initialData';
import {
  composeFinanceWorkspace,
  type FinanceWorkspaceDocuments,
} from './financeWorkspaceContracts';
import {
  getUserSingleton,
  subscribeUserSingleton,
} from './documentRepository';
import {
  listUserEntities,
  subscribeUserEntities,
} from './entityRepository';
import {
  getLegacyAppData,
  initializeFinanceWorkspace,
  migrateLegacyAppData,
} from './migrationRepository';
import {
  createWorkspaceSubscriptionBarrier,
} from './workspaceSubscriptionBarrier';

export interface FinanceWorkspaceSnapshot {
  data: AppData;
  workspaceMeta: WorkspaceMeta;
  migration: MigrationState;
}

const loadCompletedWorkspace = async (
  userId: string
): Promise<FinanceWorkspaceSnapshot> => {
  const [
    profile,
    preferences,
    entitlement,
    workspaceMeta,
    migration,
    transactions,
    categories,
    budgets,
    savingsGoals,
    recurringExpenses,
    reports,
  ] = await Promise.all([
    getUserSingleton(userId, 'profile'),
    getUserSingleton(userId, 'preferences'),
    getUserSingleton(userId, 'entitlement'),
    getUserSingleton(userId, 'workspaceMeta'),
    getUserSingleton(userId, 'migration'),
    listUserEntities(userId, 'transactions'),
    listUserEntities(userId, 'categories'),
    listUserEntities(userId, 'budgets'),
    listUserEntities(userId, 'savingsGoals'),
    listUserEntities(userId, 'recurringExpenses'),
    listUserEntities(userId, 'reports'),
  ]);

  if (
    !profile ||
    !preferences ||
    !workspaceMeta ||
    !migration ||
    migration.status !== 'completed'
  ) {
    throw new Error('Finance workspace migration is incomplete');
  }

  return {
    data: composeFinanceWorkspace({
      profile,
      preferences,
      entitlement,
      transactions,
      categories,
      budgets,
      savingsGoals,
      recurringExpenses,
      reports,
    }),
    workspaceMeta,
    migration,
  };
};

export const ensureRemoteFinanceWorkspace = async (
  userId: string,
  fallback?: AppData
): Promise<FinanceWorkspaceSnapshot> => {
  const currentMigration = await getUserSingleton(userId, 'migration');

  if (currentMigration?.status === 'completed') {
    return loadCompletedWorkspace(userId);
  }

  const legacy = await getLegacyAppData(userId);

  if (legacy) {
    const migrated = await migrateLegacyAppData(userId);

    if (migrated.status !== 'completed') {
      throw new Error(
        `Finance workspace migration failed: ${
          migrated.failureCode ?? migrated.status
        }`
      );
    }
  } else {
    await initializeFinanceWorkspace(
      userId,
      fallback ??
        createEmptyAppData({
          userId,
          isGuest: false,
        })
    );
  }

  return loadCompletedWorkspace(userId);
};

export const importFinanceWorkspace = async (
  userId: string,
  data: AppData
): Promise<FinanceWorkspaceSnapshot> => {
  await initializeFinanceWorkspace(userId, data);
  return loadCompletedWorkspace(userId);
};

export const subscribeRemoteFinanceWorkspace = (
  userId: string,
  onData: (snapshot: FinanceWorkspaceSnapshot) => void,
  onError: (error: Error) => void
) => {
  const documents: Partial<FinanceWorkspaceDocuments> = {};
  let workspaceMeta: WorkspaceMeta | null = null;
  let migration: MigrationState | null = null;
  const barrier =
    createWorkspaceSubscriptionBarrier();
  let active = true;

  const publishWhenReady = () => {
    if (
      !active ||
      !barrier.isReady() ||
      !documents.profile ||
      !documents.preferences ||
      !workspaceMeta ||
      !migration ||
      migration.status !== 'completed'
    ) {
      return;
    }

    onData({
      data: composeFinanceWorkspace(
        documents as FinanceWorkspaceDocuments
      ),
      workspaceMeta,
      migration,
    });
  };

  const fail = (error: Error) => {
    if (active) onError(error);
  };

  const subscriptions = [
    subscribeUserSingleton(userId, 'profile', (value) => {
      barrier.markReady('profile');
      if (value) documents.profile = value;
      publishWhenReady();
    }, fail),
    subscribeUserSingleton(userId, 'preferences', (value) => {
      barrier.markReady('preferences');
      if (value) documents.preferences = value;
      publishWhenReady();
    }, fail),
    subscribeUserSingleton(userId, 'entitlement', (value) => {
      barrier.markReady('entitlement');
      documents.entitlement = value;
      publishWhenReady();
    }, fail),
    subscribeUserSingleton(userId, 'workspaceMeta', (value) => {
      barrier.markReady('workspaceMeta');
      workspaceMeta = value;
      publishWhenReady();
    }, fail),
    subscribeUserSingleton(userId, 'migration', (value) => {
      barrier.markReady('migration');
      migration = value;
      publishWhenReady();
    }, fail),
    subscribeUserEntities(userId, 'transactions', (value) => {
      barrier.markReady('transactions');
      documents.transactions = value;
      publishWhenReady();
    }, fail),
    subscribeUserEntities(userId, 'categories', (value) => {
      barrier.markReady('categories');
      documents.categories = value;
      publishWhenReady();
    }, fail),
    subscribeUserEntities(userId, 'budgets', (value) => {
      barrier.markReady('budgets');
      documents.budgets = value;
      publishWhenReady();
    }, fail),
    subscribeUserEntities(userId, 'savingsGoals', (value) => {
      barrier.markReady('savingsGoals');
      documents.savingsGoals = value;
      publishWhenReady();
    }, fail),
    subscribeUserEntities(userId, 'recurringExpenses', (value) => {
      barrier.markReady('recurringExpenses');
      documents.recurringExpenses = value;
      publishWhenReady();
    }, fail),
    subscribeUserEntities(userId, 'reports', (value) => {
      barrier.markReady('reports');
      documents.reports = value;
      publishWhenReady();
    }, fail),
  ];

  return () => {
    active = false;
    subscriptions.forEach((unsubscribe) => unsubscribe());
  };
};

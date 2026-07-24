import type {
  AppData,
  Entitlement,
  FinancePreferences,
  MigrationState,
  Profile,
  UserPlan,
  WorkspaceMeta,
} from '../../models/finance';
import type { RemoteEntityCollections } from './entityAppDataSync';
import {
  persistedReceiptAttachments,
} from '../receiptPersistence';

export interface FinanceWorkspaceDocuments extends RemoteEntityCollections {
  profile: Profile;
  preferences: FinancePreferences;
  entitlement: Entitlement | null;
}

const safeFreeEntitlement = (now: string): Entitlement => ({
  plan: 'free',
  features: {
    cloudSync: false,
    receiptUploads: false,
    aiReports: false,
    aiPlanning: false,
    accountRecovery: false,
  },
  createdAt: now,
  updatedAt: now,
});

const asUserPlan = (entitlement: Entitlement): UserPlan => ({
  ...entitlement,
  isGuest: false,
});

export const splitFinanceWorkspace = (
  data: AppData,
  updatedAt: string
): FinanceWorkspaceDocuments => ({
  profile: {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    phone: data.user.phone,
    createdAt: data.user.createdAt,
  },
  preferences: {
    currency: data.user.currency,
    monthlyIncome: data.user.monthlyIncome,
    monthlyBudget: data.user.monthlyBudget,
    onboarded: data.onboarded,
    updatedAt,
  },
  entitlement: {
    plan: data.entitlement.plan === 'premium_placeholder'
      ? 'premium_placeholder'
      : 'free',
    features: { ...data.entitlement.features },
    createdAt: data.entitlement.createdAt,
    updatedAt: data.entitlement.updatedAt,
  },
  transactions: data.transactions.map(
    (transaction) => ({
      ...transaction,
      receipts:
        persistedReceiptAttachments(
          transaction.receipts
        ),
    })
  ),
  categories: data.categories,
  budgets: data.budgets,
  savingsGoals: data.savingsGoals,
  recurringExpenses: data.recurringExpenses,
  reports: data.reports,
});

export const composeFinanceWorkspace = (
  documents: FinanceWorkspaceDocuments
): AppData => {
  const entitlement =
    documents.entitlement ??
    safeFreeEntitlement(documents.preferences.updatedAt);

  return {
    user: {
      ...documents.profile,
      currency: documents.preferences.currency,
      monthlyIncome: documents.preferences.monthlyIncome,
      monthlyBudget: documents.preferences.monthlyBudget,
    },
    entitlement: asUserPlan(entitlement),
    onboarded: documents.preferences.onboarded,
    transactions: documents.transactions,
    categories: documents.categories,
    budgets: documents.budgets,
    savingsGoals: documents.savingsGoals,
    recurringExpenses: documents.recurringExpenses,
    reports: documents.reports,
  };
};

export const createInitialWorkspaceMeta = (
  updatedAt: string
): WorkspaceMeta => ({
  schemaVersion: 1,
  revision: 0,
  lastMutationId: 'migration-bootstrap',
  updatedAt,
});

export const createInitialMigrationState = (
  updatedAt: string
): MigrationState => ({
  schemaVersion: 1,
  status: 'not_started',
  sourceSchemaVersion: 1,
  targetSchemaVersion: 1,
  attemptCount: 0,
  lastCompletedChunk: -1,
  sourceCounts: {},
  targetCounts: {},
  sourceChecksum: null,
  targetChecksum: null,
  fallbackAllowed: true,
  conflicts: [],
  failureCode: null,
  startedAt: null,
  updatedAt,
  completedAt: null,
});

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const canonicalValues = value.map(canonicalize);

    if (
      canonicalValues.every(
        (item) =>
          !!item &&
          typeof item === 'object' &&
          !Array.isArray(item) &&
          typeof (item as Record<string, unknown>).id === 'string'
      )
    ) {
      return [...canonicalValues].sort((left, right) =>
        String((left as Record<string, unknown>).id).localeCompare(
          String((right as Record<string, unknown>).id)
        )
      );
    }

    return canonicalValues;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }

  return value;
};

export const canonicalFinanceJson = (value: unknown): string =>
  JSON.stringify(canonicalize(value));

export const financeWorkspaceChecksum = (
  documents: FinanceWorkspaceDocuments
): string => {
  const input = canonicalFinanceJson(documents);
  let checksum = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    checksum ^= input.charCodeAt(index);
    checksum = Math.imul(checksum, 0x01000193);
  }

  return `fnv1a32:${(checksum >>> 0).toString(16).padStart(8, '0')}`;
};

export const financeWorkspaceCounts = (
  documents: FinanceWorkspaceDocuments
): Record<string, number> => ({
  profile: 1,
  preferences: 1,
  transactions: documents.transactions.length,
  categories: documents.categories.length,
  budgets: documents.budgets.length,
  savingsGoals: documents.savingsGoals.length,
  recurringExpenses: documents.recurringExpenses.length,
  reports: documents.reports.length,
});

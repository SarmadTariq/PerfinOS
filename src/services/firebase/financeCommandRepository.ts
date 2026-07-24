import {
  runTransaction,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import type {
  AppData,
  WorkspaceMeta,
} from '../../models/finance';
import {
  getUserEntityDocumentRef,
  getUserSingletonDocumentRef,
} from './entityPaths';
import {
  canonicalFinanceJson,
  splitFinanceWorkspace,
} from './financeWorkspaceContracts';
import type {
  MutableUserEntityCollectionKey,
} from './schema';

interface PersistedEntity {
  id: string;
}

interface FinanceDocumentChange {
  ref: DocumentReference<DocumentData>;
  before: DocumentData | null;
  after: DocumentData | null;
  comparison: 'exact' | 'preferences';
}

const entityKeys = [
  'transactions',
  'categories',
  'budgets',
  'savingsGoals',
  'recurringExpenses',
  'reports',
] as const satisfies readonly MutableUserEntityCollectionKey[];

const exactMatch = (left: unknown, right: unknown) =>
  canonicalFinanceJson(left) === canonicalFinanceJson(right);

const preferencesForComparison = (
  value: DocumentData
): DocumentData => {
  const { updatedAt: _updatedAt, ...material } = value;
  return material;
};

const documentMatches = (
  actual: DocumentData,
  expected: DocumentData,
  comparison: FinanceDocumentChange['comparison']
) =>
  comparison === 'preferences'
    ? exactMatch(
        preferencesForComparison(actual),
        preferencesForComparison(expected)
      )
    : exactMatch(actual, expected);

const entityChanges = (
  userId: string,
  collectionKey: MutableUserEntityCollectionKey,
  before: PersistedEntity[],
  after: PersistedEntity[]
): FinanceDocumentChange[] => {
  const beforeById = new Map(before.map((entity) => [entity.id, entity]));
  const afterById = new Map(after.map((entity) => [entity.id, entity]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);

  return [...ids].flatMap((id) => {
    const previous = beforeById.get(id) ?? null;
    const next = afterById.get(id) ?? null;

    if (exactMatch(previous, next)) return [];

    return [{
      ref: getUserEntityDocumentRef(userId, collectionKey, id),
      before: previous,
      after: next,
      comparison: 'exact' as const,
    }];
  });
};

export const createFinanceMutationId = (
  prefix = 'finance'
): string => {
  const randomId = globalThis.crypto?.randomUUID?.();

  return `${prefix}:${
    randomId ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }`;
};

export const persistFinanceWorkspaceMutation = async ({
  userId,
  current,
  next,
  expectedRevision,
  mutationId = createFinanceMutationId(),
}: {
  userId: string;
  current: AppData;
  next: AppData;
  expectedRevision: number;
  mutationId?: string;
}): Promise<WorkspaceMeta> => {
  if (!mutationId.trim()) {
    throw new Error('Finance mutation id is required');
  }

  if (
    current.user.id !== userId ||
    next.user.id !== userId
  ) {
    throw new Error('Finance workspace owner does not match the session');
  }

  if (!exactMatch(current.entitlement, next.entitlement)) {
    throw new Error('Entitlement cannot be changed by a finance command');
  }

  const now = new Date().toISOString();
  const beforeDocuments = splitFinanceWorkspace(current, now);
  const afterDocuments = splitFinanceWorkspace(next, now);
  const changes: FinanceDocumentChange[] = [];

  if (!exactMatch(beforeDocuments.profile, afterDocuments.profile)) {
    changes.push({
      ref: getUserSingletonDocumentRef(userId, 'profile'),
      before: beforeDocuments.profile,
      after: afterDocuments.profile,
      comparison: 'exact',
    });
  }

  if (
    !documentMatches(
      beforeDocuments.preferences,
      afterDocuments.preferences,
      'preferences'
    )
  ) {
    changes.push({
      ref: getUserSingletonDocumentRef(userId, 'preferences'),
      before: beforeDocuments.preferences,
      after: afterDocuments.preferences,
      comparison: 'preferences',
    });
  }

  for (const collectionKey of entityKeys) {
    changes.push(
      ...entityChanges(
        userId,
        collectionKey,
        beforeDocuments[collectionKey] as PersistedEntity[],
        afterDocuments[collectionKey] as PersistedEntity[]
      )
    );
  }

  const workspaceMetaRef = getUserSingletonDocumentRef(
    userId,
    'workspaceMeta'
  );

  if (changes.length === 0) {
    return {
      schemaVersion: 1,
      revision: expectedRevision,
      lastMutationId: mutationId,
      updatedAt: now,
    };
  }

  if (changes.length > 100) {
    throw new Error('Finance command exceeds the bounded mutation limit');
  }

  return runTransaction(workspaceMetaRef.firestore, async (transaction) => {
    const metaSnapshot = await transaction.get(workspaceMetaRef);
    const snapshots = [];

    for (const change of changes) {
      snapshots.push(await transaction.get(change.ref));
    }

    if (!metaSnapshot.exists()) {
      throw new Error('Workspace metadata is missing');
    }

    const currentMeta = metaSnapshot.data() as WorkspaceMeta;

    if (currentMeta.revision !== expectedRevision) {
      throw new Error('Finance workspace changed before the command was saved');
    }

    for (let index = 0; index < changes.length; index += 1) {
      const change = changes[index];
      const snapshot = snapshots[index];

      if (change.before === null) {
        if (snapshot.exists()) {
          throw new Error('Finance target was created by another command');
        }
        continue;
      }

      if (
        !snapshot.exists() ||
        !documentMatches(
          snapshot.data(),
          change.before,
          change.comparison
        )
      ) {
        throw new Error('Finance target changed before the command was saved');
      }
    }

    for (const change of changes) {
      if (change.after === null) {
        transaction.delete(change.ref);
      } else {
        transaction.set(change.ref, change.after);
      }
    }

    const nextMeta: WorkspaceMeta = {
      schemaVersion: 1,
      revision: currentMeta.revision + 1,
      lastMutationId: mutationId,
      updatedAt: now,
    };
    transaction.set(workspaceMetaRef, nextMeta);
    return nextMeta;
  });
};

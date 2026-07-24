import {
  getDoc,
  runTransaction,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import type {
  AppData,
  MigrationConflict,
  MigrationState,
} from '../../models/finance';
import { getLegacyAppDataRef } from './paths';
import {
  getUserEntityDocumentRef,
  getUserSingletonDocumentRef,
} from './entityPaths';
import {
  canonicalFinanceJson,
  createInitialMigrationState,
  createInitialWorkspaceMeta,
  financeWorkspaceChecksum,
  financeWorkspaceCounts,
  splitFinanceWorkspace,
  type FinanceWorkspaceDocuments,
} from './financeWorkspaceContracts';
import {
  getUserSingleton,
  setUserSingleton,
} from './documentRepository';
import { loadRemoteAppDataEntities } from './entityAppDataSync';

export const MIGRATION_CHUNK_SIZE = 10;

interface MigrationTarget {
  ref: DocumentReference<DocumentData>;
  value: DocumentData;
  collection: string;
  entityId: string;
}

class TargetConflictError extends Error {
  readonly conflict: MigrationConflict;

  constructor(conflict: MigrationConflict) {
    super(
      `Migration target differs at ${conflict.collection}/${conflict.entityId}`
    );
    this.conflict = conflict;
  }
}

const conflictFor = (target: MigrationTarget): MigrationConflict => ({
  collection: target.collection,
  entityId: target.entityId,
  reason: 'existing_document_mismatch',
});

const valuesMatch = (left: unknown, right: unknown): boolean =>
  canonicalFinanceJson(left) === canonicalFinanceJson(right);

const migrationTargets = (
  userId: string,
  source: FinanceWorkspaceDocuments,
  now: string
): MigrationTarget[] => {
  const targets: MigrationTarget[] = [
    {
      ref: getUserSingletonDocumentRef(userId, 'profile'),
      value: source.profile,
      collection: 'profile',
      entityId: 'main',
    },
    {
      ref: getUserSingletonDocumentRef(userId, 'preferences'),
      value: source.preferences,
      collection: 'private',
      entityId: 'preferences',
    },
    {
      ref: getUserSingletonDocumentRef(userId, 'workspaceMeta'),
      value: createInitialWorkspaceMeta(now),
      collection: 'private',
      entityId: 'workspaceMeta',
    },
  ];

  const collectionEntries = [
    ['transactions', source.transactions],
    ['categories', source.categories],
    ['budgets', source.budgets],
    ['savingsGoals', source.savingsGoals],
    ['recurringExpenses', source.recurringExpenses],
    ['reports', source.reports],
  ] as const;

  for (const [collectionKey, entities] of collectionEntries) {
    for (const entity of entities) {
      targets.push({
        ref: getUserEntityDocumentRef(userId, collectionKey, entity.id),
        value: entity,
        collection: collectionKey,
        entityId: entity.id,
      });
    }
  }

  return targets;
};

const normalizeSourceForMigration = (
  data: AppData,
  now: string
): FinanceWorkspaceDocuments => ({
  ...splitFinanceWorkspace(data, now),
  // Legacy entitlement was client-controlled. It is not copied into the trusted
  // entitlement document by a browser-side migration.
  entitlement: null,
});

const loadMigrationTarget = async (
  userId: string
): Promise<FinanceWorkspaceDocuments | null> => {
  const [profile, preferences, entitlement, entities] = await Promise.all([
    getUserSingleton(userId, 'profile'),
    getUserSingleton(userId, 'preferences'),
    getUserSingleton(userId, 'entitlement'),
    loadRemoteAppDataEntities(userId),
  ]);

  if (!profile || !preferences) return null;

  return {
    profile,
    preferences,
    entitlement,
    ...entities,
  };
};

const failedMigration = (
  state: MigrationState,
  failureCode: string,
  conflicts: MigrationConflict[],
  now: string
): MigrationState => ({
  ...state,
  status: 'failed',
  failureCode,
  conflicts,
  updatedAt: now,
  completedAt: null,
});

const beginMigrationAttempt = async (
  userId: string,
  source: FinanceWorkspaceDocuments,
  now: string
): Promise<MigrationState> => {
  const migrationRef = getUserSingletonDocumentRef(userId, 'migration');
  const sourceCounts = financeWorkspaceCounts(source);
  const sourceChecksum = financeWorkspaceChecksum(source);

  return runTransaction(migrationRef.firestore, async (transaction) => {
    const snapshot = await transaction.get(migrationRef);
    const current = snapshot.exists()
      ? (snapshot.data() as MigrationState)
      : createInitialMigrationState(now);

    if (current.status === 'completed') return current;

    if (
      current.sourceChecksum &&
      current.sourceChecksum !== sourceChecksum &&
      current.status !== 'failed'
    ) {
      const failed = failedMigration(
        current,
        'legacy_source_changed',
        current.conflicts,
        now
      );
      transaction.set(migrationRef, failed);
      return failed;
    }

    const next: MigrationState = {
      ...current,
      status: 'preflight',
      attemptCount: current.attemptCount + 1,
      sourceCounts,
      sourceChecksum,
      targetCounts: {},
      targetChecksum: null,
      fallbackAllowed: true,
      conflicts: [],
      failureCode: null,
      startedAt: current.startedAt ?? now,
      updatedAt: now,
      completedAt: null,
    };

    transaction.set(migrationRef, next);
    return next;
  });
};

const preflightTargets = async (
  targets: MigrationTarget[]
): Promise<MigrationConflict[]> => {
  const snapshots = await Promise.all(
    targets.map((target) => getDoc(target.ref))
  );

  return snapshots.flatMap((snapshot, index) => {
    if (!snapshot.exists()) return [];

    const target = targets[index];
    if (
      target.entityId === 'workspaceMeta' ||
      valuesMatch(snapshot.data(), target.value)
    ) {
      return [];
    }

    return [conflictFor(target)];
  });
};

const copyChunk = async (
  userId: string,
  targets: MigrationTarget[],
  chunkIndex: number,
  state: MigrationState,
  now: string
): Promise<MigrationState> => {
  const migrationRef = getUserSingletonDocumentRef(userId, 'migration');

  return runTransaction(migrationRef.firestore, async (transaction) => {
    const snapshots = [];

    for (const target of targets) {
      snapshots.push(await transaction.get(target.ref));
    }

    const latestSnapshot = await transaction.get(migrationRef);
    const latest = latestSnapshot.exists()
      ? (latestSnapshot.data() as MigrationState)
      : state;

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      const snapshot = snapshots[index];

      if (snapshot.exists()) {
        if (
          target.entityId !== 'workspaceMeta' &&
          !valuesMatch(snapshot.data(), target.value)
        ) {
          throw new TargetConflictError(conflictFor(target));
        }
      } else {
        transaction.set(target.ref, target.value);
      }
    }

    const next: MigrationState = {
      ...latest,
      status: 'copying',
      lastCompletedChunk: Math.max(
        latest.lastCompletedChunk,
        chunkIndex
      ),
      updatedAt: now,
    };
    transaction.set(migrationRef, next);
    return next;
  });
};

export const getLegacyAppData = async (
  userId: string
): Promise<AppData | null> => {
  const snapshot = await getDoc(getLegacyAppDataRef(userId));
  return snapshot.exists() ? (snapshot.data() as AppData) : null;
};

export const initializeFinanceWorkspace = async (
  userId: string,
  data: AppData
): Promise<MigrationState> => {
  const now = new Date().toISOString();
  const source = normalizeSourceForMigration(
    data,
    data.entitlement.updatedAt || data.user.createdAt
  );
  const targets = migrationTargets(userId, source, now);

  if (targets.length > 400) {
    throw new Error(
      'Workspace import exceeds the bounded initialization limit'
    );
  }

  const migrationRef = getUserSingletonDocumentRef(userId, 'migration');

  return runTransaction(migrationRef.firestore, async (transaction) => {
    const snapshots = [];

    for (const target of targets) {
      snapshots.push(await transaction.get(target.ref));
    }

    const migrationSnapshot = await transaction.get(migrationRef);
    const existingMigration = migrationSnapshot.exists()
      ? (migrationSnapshot.data() as MigrationState)
      : createInitialMigrationState(now);

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      const snapshot = snapshots[index];

      if (
        snapshot.exists() &&
        target.entityId !== 'workspaceMeta' &&
        !valuesMatch(snapshot.data(), target.value)
      ) {
        throw new TargetConflictError(conflictFor(target));
      }
    }

    for (let index = 0; index < targets.length; index += 1) {
      if (!snapshots[index].exists()) {
        transaction.set(targets[index].ref, targets[index].value);
      }
    }

    const checksum = financeWorkspaceChecksum(source);
    const counts = financeWorkspaceCounts(source);
    const completed: MigrationState = {
      ...createInitialMigrationState(now),
      status: 'completed',
      attemptCount: existingMigration.attemptCount + 1,
      lastCompletedChunk: Math.max(
        0,
        Math.ceil(targets.length / MIGRATION_CHUNK_SIZE) - 1
      ),
      sourceCounts: counts,
      targetCounts: counts,
      sourceChecksum: checksum,
      targetChecksum: checksum,
      fallbackAllowed: true,
      startedAt: existingMigration.startedAt ?? now,
      updatedAt: now,
      completedAt: now,
    };

    transaction.set(migrationRef, completed);
    return completed;
  });
};

export const migrateLegacyAppData = async (
  userId: string
): Promise<MigrationState> => {
  const legacy = await getLegacyAppData(userId);

  if (!legacy) {
    throw new Error('Legacy AppData is unavailable for migration');
  }

  const now = new Date().toISOString();
  const source = normalizeSourceForMigration(
    legacy,
    legacy.entitlement.updatedAt || legacy.user.createdAt
  );
  let state = await beginMigrationAttempt(userId, source, now);

  if (state.status === 'completed' || state.failureCode === 'legacy_source_changed') {
    return state;
  }

  const targets = migrationTargets(userId, source, now);
  const conflicts = await preflightTargets(targets);

  if (conflicts.length > 0) {
    state = failedMigration(
      state,
      'target_conflicts',
      conflicts,
      new Date().toISOString()
    );
    await setUserSingleton(userId, 'migration', state);
    return state;
  }

  try {
    for (
      let offset = 0;
      offset < targets.length;
      offset += MIGRATION_CHUNK_SIZE
    ) {
      const chunkIndex = Math.floor(offset / MIGRATION_CHUNK_SIZE);

      if (chunkIndex <= state.lastCompletedChunk) continue;

      state = await copyChunk(
        userId,
        targets.slice(offset, offset + MIGRATION_CHUNK_SIZE),
        chunkIndex,
        state,
        new Date().toISOString()
      );
    }
  } catch (error) {
    const nextConflicts =
      error instanceof TargetConflictError
        ? [error.conflict]
        : [];
    state = failedMigration(
      state,
      error instanceof TargetConflictError
        ? 'target_conflicts'
        : 'copy_failed',
      nextConflicts,
      new Date().toISOString()
    );
    await setUserSingleton(userId, 'migration', state);
    return state;
  }

  const verifying: MigrationState = {
    ...state,
    status: 'verifying',
    updatedAt: new Date().toISOString(),
  };
  await setUserSingleton(userId, 'migration', verifying);

  const target = await loadMigrationTarget(userId);
  const targetCounts = target ? financeWorkspaceCounts(target) : {};
  const targetChecksum = target
    ? financeWorkspaceChecksum({ ...target, entitlement: null })
    : null;
  const matches =
    target !== null &&
    valuesMatch(targetCounts, verifying.sourceCounts) &&
    targetChecksum === verifying.sourceChecksum;
  const completedAt = new Date().toISOString();
  const finalState: MigrationState = matches
    ? {
        ...verifying,
        status: 'completed',
        targetCounts,
        targetChecksum,
        conflicts: [],
        failureCode: null,
        updatedAt: completedAt,
        completedAt,
      }
    : {
        ...failedMigration(
          verifying,
          'verification_mismatch',
          [],
          completedAt
        ),
        targetCounts,
        targetChecksum,
      };

  await setUserSingleton(userId, 'migration', finalState);
  return finalState;
};

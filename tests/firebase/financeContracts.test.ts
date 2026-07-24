import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  AppData,
  Entitlement,
  FinancePreferences,
  FinanceWorkspaceState,
  MigrationState,
  Profile,
  WorkspaceMeta,
} from '../../src/models/finance';
import {
  deserializeUserSingleton,
  serializeUserSingleton,
} from '../../src/services/firebase/serializers';
import {
  composeFinanceWorkspace,
  createInitialMigrationState,
  createInitialWorkspaceMeta,
  financeWorkspaceChecksum,
  splitFinanceWorkspace,
} from '../../src/services/firebase/financeWorkspaceContracts';
import { createEmptyAppData } from '../../src/services/initialData';
import {
  persistedReceiptAttachments,
} from '../../src/services/receiptPersistence';

describe('finance persistence contracts', () => {
  it('keeps AppData as a compatibility alias for FinanceWorkspaceState', () => {
    expectTypeOf<AppData>().toEqualTypeOf<FinanceWorkspaceState>();
  });

  it('round trips every singleton contract without dropping fields', () => {
    const profile: Profile = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.invalid',
      phone: '',
      createdAt: '2026-07-24T00:00:00.000Z',
    };
    const preferences: FinancePreferences = {
      currency: 'CAD',
      monthlyIncome: 5200,
      monthlyBudget: 3200,
      onboarded: true,
      updatedAt: '2026-07-24T00:00:00.000Z',
    };
    const entitlement: Entitlement = {
      plan: 'free',
      features: {
        cloudSync: true,
        receiptUploads: true,
        aiReports: true,
        aiPlanning: true,
        accountRecovery: true,
      },
      createdAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T00:00:00.000Z',
    };
    const workspaceMeta: WorkspaceMeta = {
      schemaVersion: 1,
      revision: 4,
      lastMutationId: 'mutation-4',
      updatedAt: '2026-07-24T00:00:00.000Z',
    };
    const migration: MigrationState = {
      schemaVersion: 1,
      status: 'copying',
      sourceSchemaVersion: 1,
      targetSchemaVersion: 1,
      attemptCount: 2,
      lastCompletedChunk: 1,
      sourceCounts: { transactions: 2 },
      targetCounts: { transactions: 1 },
      sourceChecksum: 'source-checksum',
      targetChecksum: null,
      fallbackAllowed: true,
      conflicts: [],
      failureCode: null,
      startedAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T00:01:00.000Z',
      completedAt: null,
    };

    expect(
      deserializeUserSingleton('profile', serializeUserSingleton('profile', profile))
    ).toEqual(profile);
    expect(
      deserializeUserSingleton(
        'preferences',
        serializeUserSingleton('preferences', preferences)
      )
    ).toEqual(preferences);
    expect(
      deserializeUserSingleton(
        'entitlement',
        serializeUserSingleton('entitlement', entitlement)
      )
    ).toEqual(entitlement);
    expect(
      deserializeUserSingleton(
        'workspaceMeta',
        serializeUserSingleton('workspaceMeta', workspaceMeta)
      )
    ).toEqual(workspaceMeta);
    expect(
      deserializeUserSingleton(
        'migration',
        serializeUserSingleton('migration', migration)
      )
    ).toEqual(migration);
  });

  it('keeps guest state out of the persisted entitlement contract', () => {
    const entitlement: Entitlement = {
      plan: 'free',
      features: {
        cloudSync: true,
        receiptUploads: true,
        aiReports: false,
        aiPlanning: true,
        accountRecovery: true,
      },
      createdAt: '2026-07-24T00:00:00.000Z',
      updatedAt: '2026-07-24T00:00:00.000Z',
    };

    expect(serializeUserSingleton('entitlement', entitlement)).not.toHaveProperty(
      'isGuest'
    );
  });

  it('splits and composes the compatibility workspace without losing finance data', () => {
    const workspace = createEmptyAppData({
      userId: 'user-1',
      name: 'Test User',
      email: 'test@example.invalid',
      isGuest: false,
    });
    const split = splitFinanceWorkspace(
      {
        ...workspace,
        onboarded: true,
        user: {
          ...workspace.user,
          currency: 'CAD',
          monthlyIncome: 5200,
          monthlyBudget: 3200,
        },
      },
      '2026-07-24T00:00:00.000Z'
    );

    expect(split.profile).not.toHaveProperty('currency');
    expect(split.preferences).toEqual({
      currency: 'CAD',
      monthlyIncome: 5200,
      monthlyBudget: 3200,
      onboarded: true,
      updatedAt: '2026-07-24T00:00:00.000Z',
    });
    expect(composeFinanceWorkspace(split)).toEqual({
      ...workspace,
      onboarded: true,
      user: {
        ...workspace.user,
        currency: 'CAD',
        monthlyIncome: 5200,
        monthlyBudget: 3200,
      },
    });
  });

  it('uses safe non-guest entitlement defaults without persisting a guest flag', () => {
    const workspace = createEmptyAppData({
      userId: 'user-2',
      isGuest: false,
    });
    const split = splitFinanceWorkspace(
      workspace,
      '2026-07-24T00:00:00.000Z'
    );

    expect(composeFinanceWorkspace({ ...split, entitlement: null }).entitlement).toMatchObject({
      plan: 'free',
      isGuest: false,
    });
  });

  it('creates monotonic workspace and resumable migration defaults', () => {
    expect(
      createInitialWorkspaceMeta('2026-07-24T00:00:00.000Z')
    ).toEqual({
      schemaVersion: 1,
      revision: 0,
      lastMutationId: 'migration-bootstrap',
      updatedAt: '2026-07-24T00:00:00.000Z',
    });
    expect(
      createInitialMigrationState('2026-07-24T00:00:00.000Z')
    ).toMatchObject({
      schemaVersion: 1,
      status: 'not_started',
      attemptCount: 0,
      lastCompletedChunk: -1,
      conflicts: [],
      fallbackAllowed: true,
    });
  });

  it('calculates an order-independent checksum for entity collections', () => {
    const workspace = createEmptyAppData({
      userId: 'user-3',
      isGuest: false,
    });
    const split = splitFinanceWorkspace(
      workspace,
      '2026-07-24T00:00:00.000Z'
    );
    const reversed = {
      ...split,
      categories: [...split.categories].reverse(),
      budgets: [...split.budgets].reverse(),
    };

    expect(financeWorkspaceChecksum(split)).toBe(
      financeWorkspaceChecksum(reversed)
    );
  });

  it('keeps local receipt URIs and transient upload errors out of remote data', () => {
    expect(
      persistedReceiptAttachments([
        {
          id: 'receipt-local',
          objectKey: '',
          fileName: 'local.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 3,
          uploadedAt: '',
          status: 'error',
          localUri: 'file:///private/local.jpg',
          error: 'retry locally',
        },
        {
          id: 'receipt-uploaded',
          objectKey:
            'receipts/user-1/tx-1/receipt-uploaded.jpg',
          fileName: 'uploaded.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 3,
          uploadedAt:
            '2026-07-24T00:00:00.000Z',
          status: 'uploaded',
          localUri:
            'file:///private/uploaded.jpg',
        },
      ])
    ).toEqual([
      {
        id: 'receipt-uploaded',
        objectKey:
          'receipts/user-1/tx-1/receipt-uploaded.jpg',
        fileName: 'uploaded.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 3,
        uploadedAt:
          '2026-07-24T00:00:00.000Z',
        status: 'uploaded',
      },
    ]);
  });
});

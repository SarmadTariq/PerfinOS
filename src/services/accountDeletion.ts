import {
  appConfig,
} from './configService';
import {
  clearGuestAppData,
} from './localFinanceStore';
import {
  deleteRemoteIdentity,
  getRemoteAppCheckToken,
  getRemoteIdToken,
  reauthenticateRemotePassword,
} from './firebaseService';
import type {
  AccountDeletionJob,
} from './accountDeletionContracts';

export {
  ACCOUNT_DELETION_STATUSES,
  buildAccountDeletionDisclosure,
  localDeletionReceiptKeys,
  receiptObjectKeysForDeletion,
} from './accountDeletionContracts';

export type {
  AccountDeletionDisclosure,
  AccountDeletionJob,
  AccountDeletionStatus,
} from './accountDeletionContracts';

export const deleteGuestWorkspaceData =
  async () => {
    await clearGuestAppData();
  };

const idempotencyKey =
  () =>
    `account-delete-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

export const startRemoteAccountDeletion =
  async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<AccountDeletionJob> => {
    if (!appConfig.apiBaseUrl) {
      throw new Error(
        'Account deletion service is not configured for this build.'
      );
    }

    await reauthenticateRemotePassword(
      email,
      password
    );

    const [
      idToken,
      appCheckToken,
    ] = await Promise.all([
      getRemoteIdToken(true),
      getRemoteAppCheckToken(),
    ]);

    const response =
      await fetch(
        `${appConfig.apiBaseUrl}/account/deletion-jobs`,
        {
          method: 'POST',
          headers: {
            Authorization:
              `Bearer ${idToken}`,
            'Content-Type':
              'application/json',
            'X-Firebase-AppCheck':
              appCheckToken,
            'Idempotency-Key':
              idempotencyKey(),
          },
          body:
            JSON.stringify({}),
        }
      );

    const payload =
      await response
        .json()
        .catch(() => null) as
        | AccountDeletionJob
        | {
            error?: {
              message?: string;
            };
          }
        | null;

    if (!response.ok) {
      throw new Error(
        (
          payload &&
          'error' in payload &&
          payload.error?.message
        ) ||
        `Account deletion request failed (${response.status}).`
      );
    }

    const job =
      payload as AccountDeletionJob;

    if (
      job.status ===
      'remote_complete'
    ) {
      await deleteRemoteIdentity();

      return {
        ...job,
        status:
          'identity_complete',
      };
    }

    return job;
  };

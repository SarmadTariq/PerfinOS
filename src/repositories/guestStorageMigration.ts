import {
  AppData,
} from '../models/finance';
import {
  createEmptyAppData,
} from '../services/initialData';

export const GUEST_STORAGE_NAMESPACE =
  'perfin-os.guest.v1';

const guestUserId =
  'guest-local';

export interface GuestStorageResolution {
  data: AppData;
  shouldPersist: boolean;
  recoveryNotice: string | null;
}

const emptyGuestWorkspace =
  (): AppData =>
    createEmptyAppData({
      userId: guestUserId,
      isGuest: true,
    });

const hasLegacyDemoSeed =
  (
    data: AppData
  ): boolean =>
    data.user.id === guestUserId &&
    (
      data.user.name ===
        'Alex Johnson' ||
      data.transactions.some(
        (transaction) =>
          transaction.id.startsWith(
            'seed-'
          )
      ) ||
      data.savingsGoals.some(
        (goal) =>
          goal.id.startsWith(
            'seed-'
          )
      ) ||
      data.budgets.some(
        (budget) =>
          budget.id.startsWith(
            'seed-'
          )
      )
    );

const normalizeGuestWorkspace =
  (
    parsed: AppData
  ): AppData => {
    const fallback =
      emptyGuestWorkspace();

    return {
      ...fallback,
      ...parsed,
      user: {
        ...fallback.user,
        ...parsed.user,
        id:
          parsed.user?.id ||
          guestUserId,
      },
      entitlement:
        parsed.entitlement ||
        fallback.entitlement,
      categories:
        parsed.categories ||
        fallback.categories,
      transactions:
        (parsed.transactions || [])
          .map(
            (transaction) => ({
              ...transaction,
              receipts:
                transaction.receipts ||
                [],
              location: {
                ...transaction.location,
                name:
                  transaction.location.name ||
                  transaction.merchant,
                formattedAddress:
                  transaction.location.formattedAddress ||
                  transaction.location.address,
                source:
                  transaction.location.source ||
                  'imported',
              },
            })
          ),
      budgets:
        parsed.budgets || [],
      savingsGoals:
        parsed.savingsGoals || [],
      recurringExpenses:
        parsed.recurringExpenses || [],
      reports:
        parsed.reports || [],
    };
  };

export const resolveGuestStorageData =
  (
    raw: string | null
  ): GuestStorageResolution => {
    if (!raw) {
      return {
        data:
          emptyGuestWorkspace(),
        shouldPersist: true,
        recoveryNotice: null,
      };
    }

    try {
      const parsed =
        normalizeGuestWorkspace(
          JSON.parse(raw) as AppData
        );

      if (
        hasLegacyDemoSeed(
          parsed
        )
      ) {
        return {
          data:
            emptyGuestWorkspace(),
          shouldPersist: true,
          recoveryNotice:
            'Legacy demo guest data was replaced with an empty guest workspace.',
        };
      }

      return {
        data: parsed,
        shouldPersist: false,
        recoveryNotice: null,
      };
    } catch {
      return {
        data:
          emptyGuestWorkspace(),
        shouldPersist: true,
        recoveryNotice:
          'Guest data could not be read, so PerFin OS started a clean guest workspace.',
      };
    }
  };

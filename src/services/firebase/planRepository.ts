import {
  getDoc,
  getDocs,
  runTransaction,
  type DocumentData,
} from 'firebase/firestore';
import type {
  FinancialPlan,
  PlanStatus,
  PlanVersion,
} from '../../models/planning';
import { db } from './client';
import {
  getUserPlanDocumentRef,
  getUserPlanReservationDocumentRef,
  getUserPlansCollectionRef,
  getUserPlanVersionDocumentRef,
  getUserPlanVersionsCollectionRef,
} from './planPaths';
import {
  fromJsonSafeValue,
  toJsonSafeValue,
} from './serializers';
import {
  planDateKeys,
  transitionPlanLifecycle,
  type PlanLifecycleTargetStatus,
} from './planLifecycle';

export interface CreatePlanInput {
  plan: FinancialPlan;
  initialVersion: PlanVersion;
}

export interface PlanVersionCreationResult {
  plan: FinancialPlan;
  version: PlanVersion;
}


export interface UpdatePlanLifecycleInput {
  status: PlanLifecycleTargetStatus;
  occurredAt: string;
  replacedPlanId: string | null;
}

export interface PlanDateReservation {
  dateKey: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

const requireFirestore = () => {
  if (!db) {
    throw new Error('Firestore is not configured');
  }

  return db;
};

const requireId = (
  value: string,
  label: string
): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required`);
  }

  return normalized;
};

const assertPlanOwnership = (
  userId: string,
  plan: FinancialPlan
): void => {
  requireId(userId, 'User id');
  requireId(plan.id, 'Plan id');

  if (plan.userId !== userId) {
    throw new Error('Plan user ownership does not match the repository user');
  }
};

const assertVersionOwnership = (
  userId: string,
  planId: string,
  version: PlanVersion
): void => {
  requireId(version.id, 'Plan version id');

  if (version.userId !== userId) {
    throw new Error(
      'Plan version user ownership does not match the repository user'
    );
  }

  if (version.planId !== planId) {
    throw new Error(
      'Plan version plan id does not match the repository plan'
    );
  }
};

const planFromDocument = (
  id: string,
  value: DocumentData
): FinancialPlan =>
  fromJsonSafeValue<FinancialPlan>({
    ...value,
    id,
  });

const versionFromDocument = (
  id: string,
  value: DocumentData
): PlanVersion =>
  fromJsonSafeValue<PlanVersion>({
    ...value,
    id,
  });


const lifecycleDocumentUpdate = (
  plan: FinancialPlan
): DocumentData =>
  toJsonSafeValue({
    status: plan.status,
    replacedPlanId: plan.replacedPlanId,
    updatedAt: plan.updatedAt,
    activatedAt: plan.activatedAt,
    completedAt: plan.completedAt,
    archivedAt: plan.archivedAt,
  }) as DocumentData;

const reservationFromDocument = (
  id: string,
  value: DocumentData
): PlanDateReservation =>
  fromJsonSafeValue<PlanDateReservation>({
    ...value,
    dateKey: id,
  });

const createReservation = (
  plan: FinancialPlan,
  dateKey: string,
  occurredAt: string
): PlanDateReservation => ({
  dateKey,
  userId: plan.userId,
  planId: plan.id,
  startDate: plan.startDate,
  endDate: plan.endDate,
  createdAt: occurredAt,
});

export const listPlans = async (
  userId: string
): Promise<FinancialPlan[]> => {
  requireId(userId, 'User id');

  const snapshot = await getDocs(
    getUserPlansCollectionRef(userId)
  );

  return snapshot.docs.map((documentSnapshot) =>
    planFromDocument(
      documentSnapshot.id,
      documentSnapshot.data()
    )
  );
};

export const getPlan = async (
  userId: string,
  planId: string
): Promise<FinancialPlan | null> => {
  requireId(userId, 'User id');
  requireId(planId, 'Plan id');

  const snapshot = await getDoc(
    getUserPlanDocumentRef(userId, planId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return planFromDocument(
    snapshot.id,
    snapshot.data()
  );
};

export const listPlanVersions = async (
  userId: string,
  planId: string
): Promise<PlanVersion[]> => {
  requireId(userId, 'User id');
  requireId(planId, 'Plan id');

  const snapshot = await getDocs(
    getUserPlanVersionsCollectionRef(userId, planId)
  );

  return snapshot.docs
    .map((documentSnapshot) =>
      versionFromDocument(
        documentSnapshot.id,
        documentSnapshot.data()
      )
    )
    .sort(
      (left, right) =>
        left.versionNumber - right.versionNumber
    );
};

export const getPlanVersion = async (
  userId: string,
  planId: string,
  versionId: string
): Promise<PlanVersion | null> => {
  requireId(userId, 'User id');
  requireId(planId, 'Plan id');
  requireId(versionId, 'Plan version id');

  const snapshot = await getDoc(
    getUserPlanVersionDocumentRef(
      userId,
      planId,
      versionId
    )
  );

  if (!snapshot.exists()) {
    return null;
  }

  return versionFromDocument(
    snapshot.id,
    snapshot.data()
  );
};

export const createPlan = async (
  userId: string,
  input: CreatePlanInput
): Promise<PlanVersionCreationResult> => {
  const { plan, initialVersion } = input;

  assertPlanOwnership(userId, plan);
  assertVersionOwnership(
    userId,
    plan.id,
    initialVersion
  );

  if (
    plan.status !== 'draft'
    || plan.replacedPlanId !== null
    || plan.activatedAt !== null
    || plan.completedAt !== null
    || plan.archivedAt !== null
  ) {
    throw new Error(
      'A new Plan must begin as draft with no lifecycle history'
    );
  }

  planDateKeys(
    plan.startDate,
    plan.endDate
  );

  if (initialVersion.versionNumber !== 1) {
    throw new Error(
      'The initial Plan version number must be 1'
    );
  }

  if (plan.versionCount !== 1) {
    throw new Error(
      'A new Plan must begin with versionCount 1'
    );
  }

  if (plan.currentVersionId !== initialVersion.id) {
    throw new Error(
      'A new Plan must point to its initial version'
    );
  }

  const planRef = getUserPlanDocumentRef(
    userId,
    plan.id
  );

  const versionRef = getUserPlanVersionDocumentRef(
    userId,
    plan.id,
    initialVersion.id
  );

  await runTransaction(
    requireFirestore(),
    async (transaction) => {
      const planSnapshot = await transaction.get(
        planRef
      );

      const versionSnapshot = await transaction.get(
        versionRef
      );

      if (planSnapshot.exists()) {
        throw new Error(
          'A Plan with this id already exists'
        );
      }

      if (versionSnapshot.exists()) {
        throw new Error(
          'The initial Plan version already exists'
        );
      }

      transaction.set(
        planRef,
        toJsonSafeValue(plan) as DocumentData
      );

      transaction.set(
        versionRef,
        toJsonSafeValue(initialVersion) as DocumentData
      );
    }
  );

  return {
    plan,
    version: initialVersion,
  };
};

export const createPlanVersion = async (
  userId: string,
  planId: string,
  version: PlanVersion
): Promise<PlanVersionCreationResult> => {
  requireId(userId, 'User id');
  requireId(planId, 'Plan id');

  assertVersionOwnership(
    userId,
    planId,
    version
  );

  const planRef = getUserPlanDocumentRef(
    userId,
    planId
  );

  const versionRef = getUserPlanVersionDocumentRef(
    userId,
    planId,
    version.id
  );

  return runTransaction(
    requireFirestore(),
    async (transaction) => {
      const planSnapshot = await transaction.get(
        planRef
      );

      const versionSnapshot = await transaction.get(
        versionRef
      );

      if (!planSnapshot.exists()) {
        throw new Error(
          'Cannot create a version for a missing Plan'
        );
      }

      if (versionSnapshot.exists()) {
        throw new Error(
          'Plan versions are immutable and cannot be overwritten'
        );
      }

      const currentPlan = planFromDocument(
        planSnapshot.id,
        planSnapshot.data()
      );

      assertPlanOwnership(
        userId,
        currentPlan
      );

      const expectedVersionNumber =
        currentPlan.versionCount + 1;

      if (
        version.versionNumber !==
        expectedVersionNumber
      ) {
        throw new Error(
          `Expected Plan version ${expectedVersionNumber}`
        );
      }

      const updatedPlan: FinancialPlan = {
        ...currentPlan,
        currentVersionId: version.id,
        versionCount: expectedVersionNumber,
        updatedAt: version.createdAt,
      };

      transaction.set(
        versionRef,
        toJsonSafeValue(version) as DocumentData
      );

      transaction.update(
        planRef,
        toJsonSafeValue({
          currentVersionId:
            updatedPlan.currentVersionId,
          versionCount:
            updatedPlan.versionCount,
          updatedAt:
            updatedPlan.updatedAt,
        }) as DocumentData
      );

      return {
        plan: updatedPlan,
        version,
      };
    }
  );
};

export const updatePlanLifecycle = async (
  userId: string,
  planId: string,
  input: UpdatePlanLifecycleInput
): Promise<FinancialPlan> => {
  requireId(userId, 'User id');
  requireId(planId, 'Plan id');

  const planRef = getUserPlanDocumentRef(
    userId,
    planId
  );

  return runTransaction(
    requireFirestore(),
    async (transaction) => {
      const planSnapshot = await transaction.get(
        planRef
      );

      if (!planSnapshot.exists()) {
        throw new Error(
          'Cannot update a missing Plan'
        );
      }

      const currentPlan = planFromDocument(
        planSnapshot.id,
        planSnapshot.data()
      );

      assertPlanOwnership(
        userId,
        currentPlan
      );

      const currentDateKeys = planDateKeys(
        currentPlan.startDate,
        currentPlan.endDate
      );

      const currentReservationRefs =
        currentDateKeys.map((dateKey) =>
          getUserPlanReservationDocumentRef(
            userId,
            dateKey
          )
        );

      const currentReservationSnapshots =
        await Promise.all(
          currentReservationRefs.map(
            (reservationRef) =>
              transaction.get(reservationRef)
          )
        );

      if (input.status === 'active') {
        const conflictingPlanIds = new Set(
          currentReservationSnapshots
            .filter(
              (snapshot) =>
                snapshot.exists()
            )
            .map((snapshot) =>
              reservationFromDocument(
                snapshot.id,
                snapshot.data()
              )
            )
            .map(
              (reservation) =>
                reservation.planId
            )
            .filter(
              (reservedPlanId) =>
                reservedPlanId !== planId
            )
        );

        let replacedPlan:
          | FinancialPlan
          | null = null;

        let replacedReservationRefs:
          typeof currentReservationRefs = [];

        let replacedReservationSnapshots:
          typeof currentReservationSnapshots = [];

        if (conflictingPlanIds.size > 0) {
          if (!input.replacedPlanId) {
            throw new Error(
              'An active Plan already overlaps this date range'
            );
          }

          if (
            conflictingPlanIds.size !== 1 ||
            !conflictingPlanIds.has(
              input.replacedPlanId
            )
          ) {
            throw new Error(
              'The supplied replacement Plan does not own every overlap'
            );
          }

          const replacedPlanRef =
            getUserPlanDocumentRef(
              userId,
              input.replacedPlanId
            );

          const replacedPlanSnapshot =
            await transaction.get(
              replacedPlanRef
            );

          if (
            !replacedPlanSnapshot.exists()
          ) {
            throw new Error(
              'The replacement Plan does not exist'
            );
          }

          replacedPlan = planFromDocument(
            replacedPlanSnapshot.id,
            replacedPlanSnapshot.data()
          );

          assertPlanOwnership(
            userId,
            replacedPlan
          );

          if (
            replacedPlan.status !== 'active'
          ) {
            throw new Error(
              'Only an active Plan can be replaced'
            );
          }

          const replacedDateKeys =
            planDateKeys(
              replacedPlan.startDate,
              replacedPlan.endDate
            );

          replacedReservationRefs =
            replacedDateKeys.map(
              (dateKey) =>
                getUserPlanReservationDocumentRef(
                  userId,
                  dateKey
                )
            );

          replacedReservationSnapshots =
            await Promise.all(
              replacedReservationRefs.map(
                (reservationRef) =>
                  transaction.get(
                    reservationRef
                  )
              )
            );
        } else if (
          input.replacedPlanId !== null
        ) {
          throw new Error(
            'No overlapping active Plan exists to replace'
          );
        }

        const activatedPlan =
          transitionPlanLifecycle(
            currentPlan,
            'active',
            input.occurredAt,
            input.replacedPlanId
          );

        if (replacedPlan) {
          const archivedReplacement =
            transitionPlanLifecycle(
              replacedPlan,
              'archived',
              input.occurredAt,
              null
            );

          transaction.update(
            getUserPlanDocumentRef(
              userId,
              replacedPlan.id
            ),
            lifecycleDocumentUpdate(
              archivedReplacement
            )
          );

          replacedReservationSnapshots.forEach(
            (snapshot, index) => {
              if (!snapshot.exists()) {
                return;
              }

              const reservation =
                reservationFromDocument(
                  snapshot.id,
                  snapshot.data()
                );

              if (
                reservation.planId ===
                replacedPlan?.id
              ) {
                transaction.delete(
                  replacedReservationRefs[
                    index
                  ]
                );
              }
            }
          );
        }

        currentDateKeys.forEach(
          (dateKey, index) => {
            transaction.set(
              currentReservationRefs[index],
              toJsonSafeValue(
                createReservation(
                  activatedPlan,
                  dateKey,
                  input.occurredAt
                )
              ) as DocumentData
            );
          }
        );

        transaction.update(
          planRef,
          lifecycleDocumentUpdate(
            activatedPlan
          )
        );

        return activatedPlan;
      }

      const updatedPlan =
        transitionPlanLifecycle(
          currentPlan,
          input.status,
          input.occurredAt,
          input.replacedPlanId
        );

      currentReservationSnapshots.forEach(
        (snapshot, index) => {
          if (!snapshot.exists()) {
            return;
          }

          const reservation =
            reservationFromDocument(
              snapshot.id,
              snapshot.data()
            );

          if (
            reservation.planId === planId
          ) {
            transaction.delete(
              currentReservationRefs[index]
            );
          }
        }
      );

      transaction.update(
        planRef,
        lifecycleDocumentUpdate(
          updatedPlan
        )
      );

      return updatedPlan;
    }
  );
};


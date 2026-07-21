import {
  getDoc,
  getDocs,
  runTransaction,
  type DocumentData,
} from 'firebase/firestore';
import type {
  FinancialPlan,
  PlanVersion,
} from '../../models/planning';
import { db } from './client';
import {
  getUserPlanDocumentRef,
  getUserPlansCollectionRef,
  getUserPlanVersionDocumentRef,
  getUserPlanVersionsCollectionRef,
} from './planPaths';
import {
  fromJsonSafeValue,
  toJsonSafeValue,
} from './serializers';

export interface CreatePlanInput {
  plan: FinancialPlan;
  initialVersion: PlanVersion;
}

export interface PlanVersionCreationResult {
  plan: FinancialPlan;
  version: PlanVersion;
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

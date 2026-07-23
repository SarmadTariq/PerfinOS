import {
  collection,
  doc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './client';
import {
  getUserEntityCollectionRef,
  getUserEntityDocumentRef,
  userEntityCollectionPath,
  userEntityDocumentPath,
} from './entityPaths';
import {
  FIRESTORE_ROOT_COLLECTIONS,
  PLAN_RESERVATIONS_COLLECTION,
  PLAN_VERSIONS_COLLECTION,
} from './schema';


const requireFirestore = () => {
  if (!db) {
    throw new Error('Firestore is not configured');
  }

  return db;
};

export const userPlansCollectionPath = (userId: string) =>
  userEntityCollectionPath(userId, 'plans');

export const userPlanDocumentPath = (
  userId: string,
  planId: string
) => userEntityDocumentPath(userId, 'plans', planId);

export const userPlanVersionsCollectionPath = (
  userId: string,
  planId: string
) => `${userPlanDocumentPath(userId, planId)}/${PLAN_VERSIONS_COLLECTION}`;

export const userPlanVersionDocumentPath = (
  userId: string,
  planId: string,
  versionId: string
) => `${userPlanVersionsCollectionPath(userId, planId)}/${versionId}`;

export const getUserPlansCollectionRef = (
  userId: string
): CollectionReference<DocumentData> =>
  getUserEntityCollectionRef(userId, 'plans');

export const getUserPlanDocumentRef = (
  userId: string,
  planId: string
): DocumentReference<DocumentData> =>
  getUserEntityDocumentRef(userId, 'plans', planId);

export const getUserPlanVersionsCollectionRef = (
  userId: string,
  planId: string
): CollectionReference<DocumentData> =>
  collection(
    getUserPlanDocumentRef(userId, planId),
    PLAN_VERSIONS_COLLECTION
  );

export const getUserPlanVersionDocumentRef = (
  userId: string,
  planId: string,
  versionId: string
): DocumentReference<DocumentData> =>
  doc(
    getUserPlanVersionsCollectionRef(userId, planId),
    versionId
  );

export const userPlanActionResultsCollectionPath = (
  userId: string,
  planId: string
) =>
  `${userPlanDocumentPath(userId, planId)}/actionResults`;

export const userPlanActionResultDocumentPath = (
  userId: string,
  planId: string,
  applicationId: string
) =>
  `${userPlanActionResultsCollectionPath(userId, planId)}/${applicationId}`;

export const getUserPlanActionResultsCollectionRef = (
  userId: string,
  planId: string
) =>
  collection(
    getUserPlanDocumentRef(userId, planId),
    'actionResults'
  );

export const getUserPlanActionResultDocumentRef = (
  userId: string,
  planId: string,
  applicationId: string
) =>
  doc(
    getUserPlanActionResultsCollectionRef(userId, planId),
    applicationId
  );

export const getUserPlanActionStateDocumentRef = (
  userId: string,
  planId: string
) =>
  doc(
    getUserPlanDocumentRef(userId, planId),
    'actionState',
    'current'
  );

export const userPlanReservationsCollectionPath = (
  userId: string
) =>
  `${FIRESTORE_ROOT_COLLECTIONS.users}/${userId}/${PLAN_RESERVATIONS_COLLECTION}`;

export const userPlanReservationDocumentPath = (
  userId: string,
  dateKey: string
) =>
  `${userPlanReservationsCollectionPath(userId)}/${dateKey}`;

export const getUserPlanReservationsCollectionRef = (
  userId: string
): CollectionReference<DocumentData> =>
  collection(
    requireFirestore(),
    FIRESTORE_ROOT_COLLECTIONS.users,
    userId,
    PLAN_RESERVATIONS_COLLECTION
  );

export const getUserPlanReservationDocumentRef = (
  userId: string,
  dateKey: string
): DocumentReference<DocumentData> =>
  doc(
    getUserPlanReservationsCollectionRef(userId),
    dateKey
  );

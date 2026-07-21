import {
  collection,
  doc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import {
  getUserEntityCollectionRef,
  getUserEntityDocumentRef,
  userEntityCollectionPath,
  userEntityDocumentPath,
} from './entityPaths';
import { PLAN_VERSIONS_COLLECTION } from './schema';

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

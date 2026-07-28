import {
  doc,
  setDoc,
} from 'firebase/firestore';
import type {
  AccountDeletionRequest,
} from '../accountDeletion';
import {
  ACCOUNT_DELETION_REQUEST_DOCUMENT,
} from '../accountDeletion';
import { db } from './client';
import {
  FIRESTORE_ROOT_COLLECTIONS,
  USER_PRIVATE_COLLECTION,
} from './schema';
import {
  toJsonSafeValue,
} from './serializers';

const requireFirestore = () => {
  if (!db) {
    throw new Error(
      'Firestore is not configured'
    );
  }

  return db;
};

export const accountDeletionRequestPath = (
  userId: string
) =>
  `${FIRESTORE_ROOT_COLLECTIONS.users}/${userId}/${USER_PRIVATE_COLLECTION}/${ACCOUNT_DELETION_REQUEST_DOCUMENT}`;

export const requestRemoteAccountDeletion =
  async (
    request: AccountDeletionRequest
  ): Promise<void> => {
    await setDoc(
      doc(
        requireFirestore(),
        FIRESTORE_ROOT_COLLECTIONS.users,
        request.userId,
        USER_PRIVATE_COLLECTION,
        ACCOUNT_DELETION_REQUEST_DOCUMENT
      ),
      toJsonSafeValue(request),
      {
        merge: false,
      }
    );
  };

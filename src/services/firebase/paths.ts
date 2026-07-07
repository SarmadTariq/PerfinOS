import { doc } from 'firebase/firestore';
import { db } from './client';

export const legacyAppDataPath = (userId: string) => `users/${userId}/private/appData`;

export const getLegacyAppDataRef = (userId: string) => {
  if (!db) throw new Error('Firestore is not configured');
  return doc(db, 'users', userId, 'private', 'appData');
};

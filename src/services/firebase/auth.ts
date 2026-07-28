import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  deleteUser,
  getIdToken,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from './client';

export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) return () => undefined;
  return onAuthStateChanged(auth, callback);
};

export const signInRemote = async (email: string, password: string) => {
  if (!auth) throw new Error('Firebase Auth is not configured');
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const signUpRemote = async (email: string, password: string) => {
  if (!auth) throw new Error('Firebase Auth is not configured');
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const sendRemotePasswordReset = async (email: string) => {
  if (!auth) throw new Error('Firebase Auth is not configured');
  await sendPasswordResetEmail(auth, email);
};

export const getRemoteIdToken =
  async (
    forceRefresh = false
  ): Promise<string> => {
    const user =
      auth?.currentUser;

    if (!user) {
      throw new Error(
        'Firebase authentication is required'
      );
    }

    const token =
      await getIdToken(
        user,
        forceRefresh
      );

    if (!token.trim()) {
      throw new Error(
        'Firebase authentication token is unavailable'
      );
    }

    return token;
  };

export const logoutRemote = async () => {
  if (auth?.currentUser) await signOut(auth);
};

export const deleteCurrentRemoteUser =
  async () => {
    const user = auth?.currentUser;

    if (!user) {
      throw new Error(
        'Firebase authentication is required'
      );
    }

    await deleteUser(user);
  };

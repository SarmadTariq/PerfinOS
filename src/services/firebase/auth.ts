import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
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

export const logoutRemote = async () => {
  if (auth?.currentUser) await signOut(auth);
};

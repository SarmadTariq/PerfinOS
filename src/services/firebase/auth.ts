import {
  User as FirebaseUser,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getIdToken,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from './client';
import {
  RemoteReauthenticationError,
  classifyReauthenticationError,
  supportedAuthProviders,
  type ReauthenticationResult,
} from './authContracts';

export {
  RemoteReauthenticationError,
  classifyReauthenticationError,
  supportedAuthProviders,
};

export type {
  ReauthenticationErrorCode,
  ReauthenticationResult,
  SupportedAuthProvider,
} from './authContracts';

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

export const reauthenticateRemotePassword =
  async (
    email: string,
    password: string
  ): Promise<ReauthenticationResult> => {
    const user =
      auth?.currentUser;

    if (!user) {
      throw new RemoteReauthenticationError(
        'missing_user'
      );
    }

    if (!password) {
      throw new RemoteReauthenticationError(
        'invalid_password'
      );
    }

    try {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(
          email.trim(),
          password
        )
      );

      return {
        provider: 'password',
        reauthenticatedAt:
          new Date()
            .toISOString(),
      };
    } catch (error) {
      throw new RemoteReauthenticationError(
        classifyReauthenticationError(
          error
        )
      );
    }
  };

export const logoutRemote = async () => {
  if (auth?.currentUser) await signOut(auth);
};

export const deleteRemoteIdentity =
  async () => {
    const user =
      auth?.currentUser;

    if (!user) {
      throw new RemoteReauthenticationError(
        'missing_user'
      );
    }

    await deleteUser(user);
  };

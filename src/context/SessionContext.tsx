import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  firebaseConfigured,
  logoutRemote,
  sendRemotePasswordReset,
  signInRemote,
  signUpRemote,
  subscribeToAuth,
} from '../services/firebaseService';

export interface AuthOptions {
  importGuestData?: boolean;
}

interface RemoteSessionUser {
  uid: string;
}

interface SessionContextValue {
  isAuthenticated: boolean;
  isGuestSession: boolean;
  remoteUserId: string | null;
  startGuestSession: () => void;
  loginRemote: (email: string, password: string) => Promise<RemoteSessionUser>;
  signupRemote: (name: string, email: string, password: string) => Promise<RemoteSessionUser>;
  forgotPassword: (email: string) => Promise<void>;
  logoutSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const requireRemoteReady = () => {
  if (!firebaseConfigured) {
    throw new Error('Firebase is not configured. Add Firebase placeholders in .env to enable account features.');
  }
};

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isGuestSession, setGuestSession] = useState(false);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!firebaseConfigured) return undefined;

    return subscribeToAuth((user) => {
      setRemoteUserId(user?.uid || null);

      if (user) {
        setAuthenticated(true);
        setGuestSession(false);
      } else {
        setAuthenticated(false);
        setGuestSession(false);
      }
    });
  }, []);

  const startGuestSession = useCallback(() => {
    setRemoteUserId(null);
    setAuthenticated(true);
    setGuestSession(true);
  }, []);

  const loginRemote = useCallback(async (email: string, password: string) => {
    requireRemoteReady();

    if (!email.trim()) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');

    const user = await signInRemote(email.trim(), password);

    setRemoteUserId(user.uid);
    setAuthenticated(true);
    setGuestSession(false);

    return user;
  }, []);

  const signupRemote = useCallback(async (name: string, email: string, password: string) => {
    requireRemoteReady();

    if (!name.trim()) throw new Error('Name is required');
    if (!email.trim()) throw new Error('Email is required');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');

    const user = await signUpRemote(email.trim(), password);

    setRemoteUserId(user.uid);
    setAuthenticated(true);
    setGuestSession(false);

    return user;
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    requireRemoteReady();

    if (!email.trim()) throw new Error('Email is required');

    await sendRemotePasswordReset(email.trim());
  }, []);

  const logoutSession = useCallback(
    async () => {
      if (!isGuestSession && firebaseConfigured) {
        await logoutRemote();
      }

      setRemoteUserId(null);
      setAuthenticated(false);
      setGuestSession(false);
    },
    [isGuestSession]
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      isAuthenticated,
      isGuestSession,
      remoteUserId,
      startGuestSession,
      loginRemote,
      signupRemote,
      forgotPassword,
      logoutSession,
    }),
    [
      forgotPassword,
      isAuthenticated,
      isGuestSession,
      loginRemote,
      logoutSession,
      remoteUserId,
      signupRemote,
      startGuestSession,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) throw new Error('useSession must be used inside SessionProvider');

  return context;
};

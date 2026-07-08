import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppData } from '../models/finance';
import { ensureRemoteAppData, firebaseConfigured, saveRemoteAppData, subscribeRemoteAppData } from '../services/firebaseService';
import { loadGuestAppData, saveGuestAppData } from '../services/localFinanceStore';
import { useSession } from './SessionContext';

export type DataStatus = 'idle' | 'loading' | 'ready' | 'error';

interface FinanceWorkspaceContextValue {
  data: AppData | null;
  status: DataStatus;
  error: string | null;
  isGuest: boolean;
  setData: React.Dispatch<React.SetStateAction<AppData | null>>;
  setStatus: React.Dispatch<React.SetStateAction<DataStatus>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  persist: (updater: (current: AppData) => AppData) => Promise<void>;
  loadGuestWorkspace: () => Promise<void>;
  clearWorkspace: () => void;
}

const FinanceWorkspaceContext = createContext<FinanceWorkspaceContextValue | undefined>(undefined);

export const FinanceWorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<AppData | null>(null);
  const [status, setStatus] = useState<DataStatus>('ready');
  const [error, setError] = useState<string | null>(null);
  const { remoteUserId, startGuestSession } = useSession();

  const isGuest = !!data?.entitlement?.isGuest;

  const persist = useCallback(
    async (updater: (current: AppData) => AppData) => {
      if (!data) throw new Error('PerFin OS data is still loading');

      const next = updater(data);
      setData(next);

      if (next.entitlement.isGuest) {
        await saveGuestAppData(next);
        return;
      }

      if (remoteUserId && firebaseConfigured) {
        await saveRemoteAppData(remoteUserId, next);
      }
    },
    [data, remoteUserId]
  );

  const loadGuestWorkspace = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const guest = await loadGuestAppData();
      setData(guest);
      startGuestSession();
      setStatus('ready');
    } catch (err: any) {
      setError(err.message || 'Could not start guest workspace');
      setStatus('error');
    }
  }, [startGuestSession]);

  const clearWorkspace = useCallback(() => {
    setData(null);
    setStatus('ready');
  }, []);

  useEffect(() => {
    if (!remoteUserId || !firebaseConfigured || isGuest) return undefined;

    let active = true;
    setStatus('loading');
    setError(null);

    const hydrateRemote = async () => {
      try {
        const remote = await ensureRemoteAppData(remoteUserId);

        if (active) {
          setData(remote);
          setStatus('ready');
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load Firestore data');
          setStatus('error');
        }
      }
    };

    hydrateRemote();

    const unsubscribe = subscribeRemoteAppData(
      remoteUserId,
      (remote) => {
        if (active) {
          setData(remote);
          setStatus('ready');
        }
      },
      (err) => {
        if (active) {
          setError(err.message || 'Firestore sync failed');
          setStatus('error');
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [remoteUserId, isGuest]);

  const value = useMemo<FinanceWorkspaceContextValue>(
    () => ({
      data,
      status,
      error,
      isGuest,
      setData,
      setStatus,
      setError,
      persist,
      loadGuestWorkspace,
      clearWorkspace,
    }),
    [clearWorkspace, data, error, isGuest, loadGuestWorkspace, persist, status]
  );

  return <FinanceWorkspaceContext.Provider value={value}>{children}</FinanceWorkspaceContext.Provider>;
};

export const useFinanceWorkspace = () => {
  const context = useContext(FinanceWorkspaceContext);

  if (!context) throw new Error('useFinanceWorkspace must be used inside FinanceWorkspaceProvider');

  return context;
};

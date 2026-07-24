import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppData, WorkspaceMeta } from '../models/finance';
import {
  ensureRemoteFinanceWorkspace,
  firebaseConfigured,
  persistFinanceWorkspaceMutation,
  subscribeRemoteFinanceWorkspace,
} from '../services/firebaseService';
import { loadGuestAppData, saveGuestAppData } from '../services/localFinanceStore';
import { useSession } from './SessionContext';
import {
  financeWorkspaceOwnershipKey,
} from './financeWorkspaceOwnership';
import {
  createFinanceWorkspaceHydrationEpoch,
} from './financeWorkspaceHydrationEpoch';

export type DataStatus = 'idle' | 'loading' | 'ready' | 'error';

interface FinanceWorkspaceContextValue {
  data: AppData | null;
  workspaceMeta: WorkspaceMeta | null;
  status: DataStatus;
  error: string | null;
  isGuest: boolean;
  setData: React.Dispatch<React.SetStateAction<AppData | null>>;
  setWorkspaceMeta: React.Dispatch<React.SetStateAction<WorkspaceMeta | null>>;
  setStatus: React.Dispatch<React.SetStateAction<DataStatus>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  persist: (updater: (current: AppData) => AppData) => Promise<void>;
  loadGuestWorkspace: () => Promise<void>;
  clearWorkspace: () => void;
}

const FinanceWorkspaceContext = createContext<FinanceWorkspaceContextValue | undefined>(undefined);

export const FinanceWorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<AppData | null>(null);
  const [workspaceMeta, setWorkspaceMeta] = useState<WorkspaceMeta | null>(null);
  const [status, setStatus] = useState<DataStatus>('ready');
  const [error, setError] = useState<string | null>(null);
  const {
    remoteUserId,
    isGuestSession,
    startGuestSession,
  } = useSession();
  const hydrationEpoch = useRef(
    createFinanceWorkspaceHydrationEpoch()
  );

  const isGuest = !!data?.entitlement?.isGuest;

  const persist = useCallback(
    async (updater: (current: AppData) => AppData) => {
      if (!data) throw new Error('PerFin OS data is still loading');

      const next = updater(data);

      if (next.entitlement.isGuest) {
        await saveGuestAppData(next);
        setData(next);
        return;
      }

      if (!remoteUserId || !firebaseConfigured || !workspaceMeta) {
        throw new Error('Signed-in workspace persistence is unavailable');
      }

      const nextMeta = await persistFinanceWorkspaceMutation({
        userId: remoteUserId,
        current: data,
        next,
        expectedRevision: workspaceMeta.revision,
      });
      if (nextMeta.revision > workspaceMeta.revision) {
        setWorkspaceMeta(nextMeta);
      }
      setData(next);
    },
    [data, remoteUserId, workspaceMeta]
  );

  const loadGuestWorkspace = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const guest = await loadGuestAppData();
      setData(guest);
      setWorkspaceMeta(null);
      startGuestSession();
      setStatus('ready');
    } catch (err: any) {
      setError(err.message || 'Could not start guest workspace');
      setStatus('error');
    }
  }, [startGuestSession]);

  const clearWorkspace = useCallback(() => {
    setData(null);
    setWorkspaceMeta(null);
    setStatus('ready');
  }, []);

  useEffect(() => {
    if (!isGuestSession) {
      return undefined;
    }

    let active = true;
    setStatus('loading');
    setError(null);

    loadGuestAppData()
      .then((guest) => {
        if (active) {
          setData(guest);
          setWorkspaceMeta(null);
          setStatus('ready');
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load guest workspace'
          );
          setStatus('error');
        }
      });

    return () => {
      active = false;
    };
  }, [isGuestSession]);

  useEffect(() => {
    if (
      !remoteUserId ||
      !firebaseConfigured ||
      isGuestSession
    ) {
      return undefined;
    }

    let active = true;
    const epoch =
      hydrationEpoch.current.begin(
        remoteUserId
      );
    setStatus('loading');
    setError(null);
    let unsubscribe: (() => void) | null = null;

    const hydrateRemote = async () => {
      try {
        const remote = await ensureRemoteFinanceWorkspace(remoteUserId);

        if (active && hydrationEpoch.current.isCurrent(epoch)) {
          setData(remote.data);
          setWorkspaceMeta(remote.workspaceMeta);
          setStatus('ready');
        }

        if (!active || !hydrationEpoch.current.isCurrent(epoch)) return;

        unsubscribe = subscribeRemoteFinanceWorkspace(
          remoteUserId,
          (snapshot) => {
            if (active && hydrationEpoch.current.isCurrent(epoch)) {
              setData(snapshot.data);
              setWorkspaceMeta(snapshot.workspaceMeta);
              setStatus('ready');
            }
          },
          (err) => {
            if (active && hydrationEpoch.current.isCurrent(epoch)) {
              setError(err.message || 'Firestore sync failed');
              setStatus('error');
            }
          }
        );
      } catch (err: any) {
        if (active && hydrationEpoch.current.isCurrent(epoch)) {
          setError(err.message || 'Failed to load Firestore data');
          setStatus('error');
        }
      }
    };

    hydrateRemote();

    return () => {
      active = false;
      hydrationEpoch.current.invalidate(
        epoch
      );
      unsubscribe?.();
    };
  }, [
    isGuestSession,
    remoteUserId,
  ]);

  const value = useMemo<FinanceWorkspaceContextValue>(
    () => ({
      data,
      workspaceMeta,
      status,
      error,
      isGuest,
      setData,
      setWorkspaceMeta,
      setStatus,
      setError,
      persist,
      loadGuestWorkspace,
      clearWorkspace,
    }),
    [clearWorkspace, data, error, isGuest, loadGuestWorkspace, persist, status, workspaceMeta]
  );

  return <FinanceWorkspaceContext.Provider value={value}>{children}</FinanceWorkspaceContext.Provider>;
};

export const SessionBoundFinanceWorkspaceProvider =
  ({
    children,
  }: {
    children: React.ReactNode;
  }) => {
    const {
      remoteUserId,
      isAuthenticated,
      isGuestSession,
    } = useSession();

    return (
      <FinanceWorkspaceProvider
        key={financeWorkspaceOwnershipKey({
          remoteUserId,
          isAuthenticated,
          isGuestSession,
        })}
      >
        {children}
      </FinanceWorkspaceProvider>
    );
  };

export const useFinanceWorkspace = () => {
  const context = useContext(FinanceWorkspaceContext);

  if (!context) throw new Error('useFinanceWorkspace must be used inside FinanceWorkspaceProvider');

  return context;
};

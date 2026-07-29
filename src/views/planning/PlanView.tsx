import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  FinancialPlan,
} from '../../models/planning';

import {
  useSession,
} from '../../context/SessionContext';

import {
  loadSavedPlans,
} from '../../services/plan';
import {
  planDetailOwnershipKey,
  planWorkspaceOwnershipKey,
  shouldApplySavedPlansResult,
} from '../../planning/planWorkspacePresentation';

import {
  PlanCreationFlowScreen,
} from './PlanCreationFlowView';

import {
  PlanDetailScreen,
} from './PlanDetailView';

import {
  PlanHomeScreen,
} from './PlanHomeView';

type PlanScreenProps = {
  readonly showBackButton?:
    boolean;

  readonly showProfileButton?:
    boolean;
};

type PlanMode =
  | {
      type: 'home';
    }
  | {
      type: 'create';
    }
  | {
      type: 'detail';
      planId: string;
    };

export const PlanScreen = ({
  showBackButton = true,
  showProfileButton = false,
}: PlanScreenProps) => {
  const {
    remoteUserId,
  } = useSession();

  return (
    <PlanWorkspaceScreen
      key={planWorkspaceOwnershipKey(
        remoteUserId
      )}
      remoteUserId={remoteUserId}
      showBackButton={
        showBackButton
      }
      showProfileButton={
        showProfileButton
      }
    />
  );
};

interface PlanWorkspaceScreenProps
  extends PlanScreenProps {
  remoteUserId: string | null;
}

const PlanWorkspaceScreen = ({
  remoteUserId,
  showBackButton = true,
  showProfileButton = false,
}: PlanWorkspaceScreenProps) => {
  const activeUserIdRef =
    useRef(remoteUserId);
  const savedPlansRequestRef =
    useRef(0);
  activeUserIdRef.current =
    remoteUserId;

  const [
    mode,
    setMode,
  ] =
    useState<PlanMode>({
      type: 'home',
    });

  const [
    savedPlans,
    setSavedPlans,
  ] =
    useState<
      FinancialPlan[]
    >([]);

  const [
    savedPlansState,
    setSavedPlansState,
  ] =
    useState<
      | 'loading'
      | 'ready'
      | 'error'
      | 'signed-out'
    >(
      remoteUserId
        ? 'loading'
        : 'signed-out'
    );

  const [
    savedPlansError,
    setSavedPlansError,
  ] =
    useState<
      string | null
    >(null);

  const refreshSavedPlans =
    useCallback(async () => {
      const requestId =
        savedPlansRequestRef.current +
        1;
      savedPlansRequestRef.current =
        requestId;
      const requestedUserId =
        remoteUserId;

      if (!requestedUserId) {
        setSavedPlans([]);
        setSavedPlansState(
          'signed-out'
        );
        setSavedPlansError(null);
        return;
      }

      setSavedPlansState(
        'loading'
      );
      setSavedPlansError(null);

      try {
        const plans =
          await loadSavedPlans(
            requestedUserId
          );

        if (
          !shouldApplySavedPlansResult({
            requestId,
            latestRequestId:
              savedPlansRequestRef
                .current,
            requestedUserId,
            currentUserId:
              activeUserIdRef.current,
          })
        ) {
          return;
        }

        setSavedPlans(
          plans
        );
        setSavedPlansState(
          'ready'
        );
      } catch (error) {
        if (
          !shouldApplySavedPlansResult({
            requestId,
            latestRequestId:
              savedPlansRequestRef
                .current,
            requestedUserId,
            currentUserId:
              activeUserIdRef.current,
          })
        ) {
          return;
        }

        setSavedPlansState(
          'error'
        );
        setSavedPlansError(
          error instanceof Error
            ? error.message
            : 'Saved Plans could not be loaded.'
        );
      }
    }, [remoteUserId]);

  useEffect(() => {
    if (mode.type === 'home') {
      void refreshSavedPlans();
    }
  }, [
    mode.type,
    refreshSavedPlans,
  ]);

  if (
    mode.type ===
    'create'
  ) {
    return (
      <PlanCreationFlowScreen
        onClose={() =>
          setMode({
            type: 'home',
          })
        }
      />
    );
  }

  if (
    mode.type ===
    'detail'
  ) {
    return (
      <PlanDetailScreen
        key={
          remoteUserId
            ? planDetailOwnershipKey(
                remoteUserId,
                mode.planId
              )
            : planWorkspaceOwnershipKey(
                null
              )
        }
        planId={mode.planId}
        onBack={() =>
          setMode({
            type: 'home',
          })
        }
        onPlanChanged={(
          nextPlanId
        ) => {
          if (nextPlanId) {
            setMode({
              type: 'detail',
              planId:
                nextPlanId,
            });
          }

          void refreshSavedPlans();
        }}
      />
    );
  }

  return (
    <PlanHomeScreen
      showBackButton={
        showBackButton
      }
      showProfileButton={
        showProfileButton
      }
      onStartPlan={() =>
        setMode({
          type: 'create',
        })
      }
      savedPlans={savedPlans}
      savedPlansState={
        savedPlansState
      }
      savedPlansError={
        savedPlansError
      }
      onRetrySavedPlans={() => {
        void refreshSavedPlans();
      }}
      onOpenPlan={(planId) =>
        setMode({
          type: 'detail',
          planId,
        })
      }
    />
  );
};

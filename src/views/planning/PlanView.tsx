import React, {
  useState,
} from 'react';

import {
  PlanCreationFlowScreen,
} from './PlanCreationFlowView';

import {
  PlanHomeScreen,
} from './PlanHomeView';

type PlanScreenProps = {
  readonly showBackButton?:
    boolean;

  readonly showProfileButton?:
    boolean;
};

export const PlanScreen = ({
  showBackButton = true,
  showProfileButton = false,
}: PlanScreenProps) => {
  const [
    mode,
    setMode,
  ] =
    useState<
      'home' | 'create'
    >('home');

  if (
    mode ===
    'create'
  ) {
    return (
      <PlanCreationFlowScreen
        onClose={() =>
          setMode('home')
        }
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
        setMode('create')
      }
    />
  );
};

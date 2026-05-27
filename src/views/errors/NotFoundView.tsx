/**
 * NotFoundView — fallback screen for unrecognised navigation routes.
 * Extracted from PerFinOSScreens.tsx (NotFoundScreen).
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { EmptyState } from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';

export const NotFoundScreen = () => {
  const navigation = useNavigation<any>();
  return (
    <AppScroll>
      <EmptyState title="Screen not found" message="This route does not exist in PerFin OS." icon="explore-off" actionLabel="Go to Dashboard" onAction={() => navigation.navigate('Dashboard')} />
    </AppScroll>
  );
};

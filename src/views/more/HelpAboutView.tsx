/**
 * HelpAboutView — app scope, positioning, and safety disclosures.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Card, Text } from '../../components/base';
import {
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { Spacing } from '../../theme';

export const HelpAboutScreen = () => {
  const navigation = useNavigation<any>();
  return (
    <AppScroll>
      <ScreenHeader title="Help / About" subtitle="PerFin OS positioning and user safety." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
      <Card shadow="sm" style={{ marginBottom: Spacing.md }}>
        <Text variant="h4">What PerFin OS is</Text>
        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          A personal finance operating system for expense tracking, budgeting, receipt organization, maps, reports, and educational planning insights.
        </Text>
      </Card>
      <Card shadow="sm">
        <Text variant="h4">What PerFin OS is not</Text>
        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          It is not a bank, investment advisor, tax advisor, legal advisor, or payment processor.
        </Text>
      </Card>
    </AppScroll>
  );
};

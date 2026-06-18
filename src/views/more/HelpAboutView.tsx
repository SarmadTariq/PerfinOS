/**
 * HelpAboutView: privacy, app scope, positioning, and safety disclosures.
 */
import React from 'react';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Card, Text } from '../../components/base';
import {
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Spacing } from '../../theme';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

export const HelpAboutScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();

  return (
    <AppScroll>
      <ScreenHeader
        title="Privacy & Help"
        subtitle="Data use, app scope, and safety disclosures."
        action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
      />

      <Card shadow="sm" style={{ marginBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
          <MaterialIcons
            name="lock-outline"
            size={20}
            color={colors.primary}
            style={{ marginRight: Spacing.sm }}
          />
          <Text variant="h4">Privacy & Data</Text>
        </View>

        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.sm }}>
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>Guest mode: </Text>
          Guest data stays local on device.
        </Text>

        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.sm }}>
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>Authenticated data: </Text>
          Authenticated data is stored in Firebase Firestore under user ID.
        </Text>

        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.sm }}>
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>AI features: </Text>
          AI features send aggregate totals only. No raw notes, merchant names, location history, or receipt images leave device for AI.
        </Text>

        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.sm }}>
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>Receipts: </Text>
          Receipts use Cloudflare R2 only when Worker backend is configured. Guest users cannot upload receipts.
        </Text>

        <Text variant="bodySmall" color="secondary">
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>Data use: </Text>
          PerFin OS does not sell or monetize financial data.
        </Text>
      </Card>

      <Card shadow="sm" style={{ marginBottom: Spacing.md }}>
        <Text variant="h4">What PerFin OS is</Text>

        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          PerFin OS is a personal finance operating system for expense tracking, budgeting, receipt organization, maps, reports, and educational planning insights.
        </Text>

        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          It helps users understand their own records, categories, spending patterns, and app-generated summaries.
        </Text>
      </Card>

      <Card shadow="sm">
        <Text variant="h4">What PerFin OS is not</Text>

        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          PerFin OS is not a bank, investment advisor, tax advisor, legal advisor, or payment processor.
        </Text>

        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          It does not move money, issue financial products, process payments, provide tax filing, or make investment decisions for users.
        </Text>
      </Card>
    </AppScroll>
  );
};
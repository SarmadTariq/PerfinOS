/**
 * HelpAboutView - privacy disclosures, app scope, and user safety.
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
        subtitle="Data disclosures, app scope, and user safety."
        action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
      />

      <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
          <MaterialIcons name="lock-outline" size={20} color={colors.primary} style={{ marginRight: Spacing.sm }} />
          <Text variant="h4">Privacy & Data</Text>
        </View>

        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.sm }}>
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>What we store: </Text>
          Transaction records, budget targets, savings goals, categories, and reports are stored in Firebase Firestore under your authenticated user ID. Guest data is stored locally on this device only.
        </Text>

        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.sm }}>
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>AI features: </Text>
          Only aggregate totals, such as monthly spend by category, are sent to Gemini AI. No raw notes, merchant names, location history, or receipt images leave your device.
        </Text>

        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.sm }}>
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>Receipts: </Text>
          Uploaded to Cloudflare R2 object storage when a Worker backend is configured. Files are private, accessible only via your authenticated token. Guest users cannot upload receipts.
        </Text>

        <Text variant="bodySmall" color="secondary">
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>No selling of data: </Text>
          PerFin OS does not sell, share, or monetise your financial data. It is never used for advertising.
        </Text>
      </Card>

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
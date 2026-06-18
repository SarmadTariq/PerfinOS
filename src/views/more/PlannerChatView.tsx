/**
 * PlannerChatView — conversational AI financial planner using aggregate-only data.
 * Uses SafeAreaView layout with a sticky input row.
 */
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Input, Text } from '../../components/base';
import {
  EmptyState,
  IconButton,
  LoadingState,
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { useThemeScheme } from '../../context/ThemeContext';
import { generatePlannerResult } from '../../services/aiService';
import { Colors, Spacing } from '../../theme';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

export const PlannerChatScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const colors = useColors();
      const { canUseFeature, isGuest } = useFinance();
      const aiEnabled = canUseFeature('plannerChat') && !isGuest;
      const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
      const [input, setInput] = useState('');
      const [loading, setLoading] = useState(false);

      useEffect(() => {
        if (!aiEnabled) return;
        setLoading(true);
        generatePlannerResult(data).then((result) => {
          setMessages([
            {
              role: 'ai',
              text: [result.summary, ...result.recommendations].filter(Boolean).join('\n\n'),
            },
          ]);
          setLoading(false);
        });
      }, []);

      const sendMessage = async () => {
        const userMsg = input.trim();
        if (!userMsg || loading) return;
        setInput('');
        setMessages((current) => [...current, { role: 'user', text: userMsg }]);
        setLoading(true);
        const result = await generatePlannerResult(data);
        setMessages((current) => [
          ...current,
          {
            role: 'ai',
            text: [result.summary, ...result.recommendations].filter(Boolean).join('\n\n'),
          },
        ]);
        setLoading(false);
      };

      if (!aiEnabled) {
        return (
          <AppScroll>
            <ScreenHeader
              title="Planner Chat"
              subtitle="Educational finance planning using aggregate totals only."
              action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
            />
            <EmptyState
              title="Login required"
              message="Planner Chat is available to signed-in accounts. It uses aggregate-only data — no raw notes or receipt images are ever sent."
              icon="lock"
              actionLabel="Back"
              onAction={() => navigation.goBack()}
            />
          </AppScroll>
        );
      }

      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xl }}
            showsVerticalScrollIndicator={false}
          >
            <ScreenHeader
              title="Planner Chat"
              subtitle="Educational finance planning using aggregate totals only."
              action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
            />
            {loading && messages.length === 0 ? (
              <LoadingState label="Generating planner summary..." />
            ) : null}
            {messages.map((msg, index) => (
              <Card
                key={index}
                shadow="sm"
                style={{
                  marginBottom: Spacing.md,
                  backgroundColor: msg.role === 'user' ? colors.primarySoft : colors.bgSecondary,
                }}
              >
                <Text variant="caption" color="secondary" style={{ marginBottom: Spacing.xs }}>
                  {msg.role === 'user' ? 'You' : 'PerFin OS Planner'}
                </Text>
                <Text variant="body">{msg.text}</Text>
              </Card>
            ))}
            {loading && messages.length > 0 ? (
              <LoadingState label="Generating response..." />
            ) : null}
            {messages.length > 0 ? (
              <Text variant="caption" color="tertiary" style={{ textAlign: 'center', marginTop: Spacing.sm }}>
                Educational planning only. PerFin OS does not provide legal, tax, investment, or banking advice.
              </Text>
            ) : null}
          </ScrollView>
          <View style={[styles.chatInputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Input
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your spending, budget, or savings..."
              style={{ flex: 1, marginBottom: 0 }}
            />
            <IconButton icon="send" label="Send message" onPress={sendMessage} style={{ marginLeft: Spacing.sm }} />
          </View>
        </SafeAreaView>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
  },
});

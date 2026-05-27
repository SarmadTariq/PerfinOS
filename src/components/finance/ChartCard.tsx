import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing } from '../../theme';
import { Card, Text } from '../base';

/** Wraps chart content in a card with a title and optional summary line. */
export const ChartCard = ({
  title, summary, children,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
}) => (
  <Card style={styles.chartCard} shadow="sm">
    <View style={styles.chartHeader}>
      <View>
        <Text variant="h4">{title}</Text>
        {summary ? (
          <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>{summary}</Text>
        ) : null}
      </View>
    </View>
    <View style={{ marginTop: Spacing.lg }}>{children}</View>
  </Card>
);

const styles = StyleSheet.create({
  chartCard: { marginBottom: Spacing.lg },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.md },
});

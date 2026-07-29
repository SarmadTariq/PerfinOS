import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { Spacing } from '../../theme';
import { Card, Text } from '../base';

export interface ChartCardProps {
  title: string;
  summary?: string;
  children: React.ReactNode;
}

/**
 * Chart container with a title and optional summary.
 */
export const ChartCard = ({
  title,
  summary,
  children,
}: ChartCardProps) => (
  <Card
    style={styles.chartCard}
    shadow="sm"
  >
    <View style={styles.header}>
      <Text variant="h4">
        {title}
      </Text>

      {summary ? (
        <Text
          variant="bodySmall"
          color="secondary"
          style={styles.summary}
        >
          {summary}
        </Text>
      ) : null}
    </View>

    <View style={styles.content}>
      {children}
    </View>
  </Card>
);

const styles = StyleSheet.create({
  chartCard: {
    marginBottom: Spacing.lg,
  },

  header: {
    width: '100%',
  },

  summary: {
    marginTop: Spacing.xs,
  },

  content: {
    marginTop: Spacing.lg,
  },
});

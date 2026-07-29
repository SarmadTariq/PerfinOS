import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useColors } from '../../context/ThemeContext';
import {
  Radius,
  Spacing,
  Typography,
} from '../../theme';
import { formatCurrency } from '../../utils/format';
import { Text } from '../base';
import { EmptyState } from './EmptyState';

export interface BarListChartItem {
  label: string;
  value: number;
  color?: string;
  secondary?: string;
}

export interface BarListChartProps {
  data: BarListChartItem[];
  currency?: string;
  emptyMessage?: string;
}

/**
 * Horizontal bar chart rendered as a selectable list.
 */
export const BarListChart = ({
  data,
  currency,
  emptyMessage = 'No chart data yet.',
}: BarListChartProps) => {
  const colors = useColors();

  const [selected, setSelected] =
    useState<string | null>(null);

  const max = Math.max(
    ...data.map((item) => item.value),
    0,
  );

  if (data.length === 0 || max === 0) {
    return (
      <EmptyState
        title="No chart data"
        message={emptyMessage}
        icon="bar-chart"
      />
    );
  }

  return (
    <View>
      {data.map((item) => {
        const width =
          (item.value / max) * 100;

        const isSelected =
          selected === item.label;

        const itemColor =
          item.color ?? colors.actionPrimary;

        return (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={
              `${item.label}, ` +
              formatCurrency(
                item.value,
                currency,
              )
            }
            accessibilityState={{
              selected: isSelected,
            }}
            onPress={() =>
              setSelected(
                isSelected
                  ? null
                  : item.label,
              )
            }
            style={[
              styles.item,
              {
                backgroundColor:
                  isSelected
                    ? colors.backgroundSubtle
                    : colors.backgroundElevated,
                borderColor:
                  isSelected
                    ? colors.borderDefault
                    : colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.row}>
              <View style={styles.labelGroup}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        itemColor,
                    },
                  ]}
                />

                <Text
                  variant="bodySmall"
                  numberOfLines={1}
                  style={styles.label}
                >
                  {item.label}
                </Text>
              </View>

              <Text
                variant="bodySmall"
                color="secondary"
                style={styles.value}
              >
                {formatCurrency(
                  item.value,
                  currency,
                )}
              </Text>
            </View>

            <View
              style={[
                styles.track,
                {
                  backgroundColor:
                    colors.backgroundSubtle,
                },
              ]}
            >
              <View
                style={[
                  styles.bar,
                  {
                    width:
                      `${Math.max(width, 4)}%`,
                    backgroundColor:
                      itemColor,
                  },
                ]}
              />
            </View>

            {isSelected && item.secondary ? (
              <Text
                variant="caption"
                color="secondary"
                style={styles.secondary}
              >
                {item.secondary}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },

  labelGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  dot: {
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: Radius.round,
  },

  label: {
    flex: 1,
    fontWeight: Typography.label.fontWeight,
  },

  value: {
    fontWeight: Typography.label.fontWeight,
  },

  track: {
    height: Spacing.md,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },

  bar: {
    height: '100%',
    borderRadius: Radius.round,
  },

  secondary: {
    marginTop: Spacing.xs,
  },
});

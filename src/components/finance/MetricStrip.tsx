import { StyleSheet, View } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { Radius, Spacing } from '../../theme';
import { Text } from '../base';

export interface MetricStripItem {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative';
}

export const MetricStrip = ({ items }: { items: MetricStripItem[] }) => {
  const colors = useColors();

  return (
    <View
      style={[
        styles.strip,
        {
          backgroundColor: colors.backgroundSurface,
          borderColor: colors.borderDefault,
        },
      ]}
    >
      {items.map((item, index) => {
        const valueColor =
          item.tone === 'positive'
            ? colors.amountIncome
            : item.tone === 'negative'
              ? colors.amountExpense
              : colors.textPrimary;

        return (
          <View
            key={`${item.label}-${index}`}
            style={[
              styles.item,
              index > 0 && styles.divider,
              index > 0 && { borderLeftColor: colors.borderSubtle },
            ]}
          >
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {item.label}
            </Text>
            <Text variant="h4" numberOfLines={1} adjustsFontSizeToFit style={{ color: valueColor }}>
              {item.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    width: '100%',
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  item: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  divider: {
    borderLeftWidth: 1,
  },
});

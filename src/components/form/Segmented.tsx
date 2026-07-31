import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { Radius, Spacing } from '../../theme/index';
import { Text } from '../base';

/**
 * Segmented control — horizontally arranged tab-like buttons.
 * Selected segment gets a raised background; all segments use `capitalize` text transform.
 *
 * @param options - Array of option strings (e.g. ['all', 'income', 'expense'])
 * @param value - Currently selected option
 * @param onChange - Called with the newly tapped option value
 */
export const Segmented = ({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) => {
  const colors = useColors();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.segmented, { backgroundColor: colors.backgroundSubtle }]}
    >
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          accessibilityRole="tab"
          accessibilityState={{ selected: option === value }}
          aria-selected={option === value}
          onPress={() => onChange(option)}
          style={[styles.segment, option === value && { backgroundColor: colors.backgroundSurface }]}
        >
          <Text variant="caption" style={{ textTransform: 'capitalize' }}>
            {option.replace('-', ' ')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  segment: {
    minHeight: 38,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

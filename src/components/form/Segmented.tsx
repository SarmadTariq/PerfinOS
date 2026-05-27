import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';
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
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={[styles.segmented, { backgroundColor: colors.bgTertiary }]}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected: option === value }}
          onPress={() => onChange(option)}
          style={[styles.segment, option === value && { backgroundColor: colors.bgSecondary }]}
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

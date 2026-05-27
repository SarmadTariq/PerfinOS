import React, { useState } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';
import { Text } from '../base';

/**
 * Dropdown selector rendered as a native-feeling list.
 * Toggles an inline option panel; selected option is marked with a checkmark.
 *
 * @param label - Field label and accessibility hint
 * @param value - Currently selected option
 * @param options - Array of string options to display
 * @param onChange - Called with the newly selected option
 */
export const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text variant="bodySmall" style={styles.label}>{label}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Select ${label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={[styles.selectButton, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
      >
        <Text variant="bodyLarge" style={{ flex: 1 }}>{value || `Select ${label.toLowerCase()}`}</Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={24} color={colors.textSecondary} />
      </TouchableOpacity>
      {open ? (
        <View style={[styles.dropdownPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: option === value }}
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
              style={[styles.dropdownOption, option === value && { backgroundColor: colors.bgTertiary }]}
            >
              <Text variant="body" style={{ fontWeight: option === value ? '700' : '400' }}>{option}</Text>
              {option === value ? <MaterialIcons name="check" size={18} color={colors.primary} /> : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  selectButton: {
    minHeight: 58,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dropdownPanel: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  dropdownOption: {
    minHeight: 46,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
});

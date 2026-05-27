import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius, Spacing } from '../../theme';
import { materialIconName, mcIconName } from '../../utils/icons';
import { Text } from '../base';

/** Pill badge displaying a category label with optional icon and selection state. */
export const CategoryBadge = ({
  label, color, icon, selected = false, library = 'mci',
}: {
  label: string;
  color: string;
  icon?: string;
  selected?: boolean;
  library?: 'mi' | 'mci';
}) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: selected ? `${color}1F` : colors.bgSecondary }]}>
      {icon ? (
        library === 'mi'
          ? <MaterialIcons name={materialIconName(icon)} size={14} color={color} />
          : <MaterialCommunityIcons name={mcIconName(icon)} size={14} color={color} />
      ) : null}
      <Text variant="caption" style={{ color, marginLeft: icon ? Spacing.xs : 0 }}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: Radius.round,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, minHeight: 30,
  },
});

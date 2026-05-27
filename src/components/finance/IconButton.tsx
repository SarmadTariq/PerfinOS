import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeScheme } from '../../context/ThemeContext';
import { Colors, Radius } from '../../theme';

/** Square icon-only button with primary-soft background. Used for toolbar actions (back, send, edit). */
export const IconButton = ({
  icon, label, onPress, style,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) => {
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.btn, { backgroundColor: colors.primarySoft }, style]}
    >
      <MaterialIcons name={icon} size={21} color={colors.primary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { width: 42, height: 42, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
});

import {
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';
import {
  StyleSheet,
  View,
} from 'react-native';
import { useColors } from '../../context/ThemeContext';
import {
  Radius,
  Spacing,
} from '../../theme';
import {
  materialIconName,
  mcIconName,
} from '../../utils/icons';
import { Text } from '../base';

export interface CategoryBadgeProps {
  label: string;
  color: string;
  icon?: string;
  selected?: boolean;
  library?: 'mi' | 'mci';
}

/**
 * Category label with optional icon and selection state.
 */
export const CategoryBadge = ({
  label,
  color,
  icon,
  selected = false,
  library = 'mci',
}: CategoryBadgeProps) => {
  const colors = useColors();

  return (
    <View
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.badge,
        {
          borderColor: color,
          backgroundColor:
            selected
              ? colors.backgroundSubtle
              : colors.backgroundElevated,
        },
      ]}
    >
      {icon ? (
        library === 'mi' ? (
          <MaterialIcons
            name={materialIconName(icon)}
            size={Spacing.lg}
            color={color}
          />
        ) : (
          <MaterialCommunityIcons
            name={mcIconName(icon)}
            size={Spacing.lg}
            color={color}
          />
        )
      ) : null}

      <Text
        variant="caption"
        style={[
          icon
            ? styles.labelWithIcon
            : styles.label,
          { color },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    minHeight: Spacing.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },

  label: {
    marginLeft: 0,
  },

  labelWithIcon: {
    marginLeft: Spacing.xs,
  },
});

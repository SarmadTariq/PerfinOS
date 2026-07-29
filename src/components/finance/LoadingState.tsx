import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useColors } from '../../context/ThemeContext';
import {
  Radius,
  Spacing,
} from '../../theme';
import { Text } from '../base';

export interface LoadingStateProps {
  label?: string;
}

/**
 * Centered spinner with a descriptive loading label.
 */
export const LoadingState = ({
  label = 'Loading PerFin OS data...',
}: LoadingStateProps) => {
  const colors = useColors();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[
        styles.box,
        {
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <ActivityIndicator
        color={colors.actionPrimary}
      />

      <Text
        variant="body"
        color="secondary"
        style={styles.label}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    minHeight:
      Spacing.section * 3 +
      Spacing.xxl +
      Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },

  label: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});

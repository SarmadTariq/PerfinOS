import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '../../theme';
import { useColors } from '../../context/ThemeContext';
import { Button, Text } from '../base';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

/**
 * Error state with supporting text and an optional
 * recovery action.
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) => {
  const colors = useColors();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.box,
        {
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor:
              colors.backgroundSubtle,
          },
        ]}
      >
        <MaterialIcons
          name="error-outline"
          size={Spacing.xxxl}
          color={colors.statusCritical}
        />
      </View>

      <Text
        variant="h4"
        style={styles.title}
      >
        {title}
      </Text>

      <Text
        variant="body"
        color="secondary"
        style={styles.message}
      >
        {message}
      </Text>

      {onRetry ? (
        <Button
          label="Try again"
          onPress={onRetry}
          variant="secondary"
        />
      ) : null}
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

  icon: {
    width: Spacing.section,
    height: Spacing.section,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    marginTop: Spacing.md,
  },

  message: {
    maxWidth:
      Spacing.section * 5 +
      Spacing.xl,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});

import { StyleSheet, View } from 'react-native';
import {
  Radius,
  Spacing,
  Typography,
} from '../../theme/index';
import { useColors } from '../../context/ThemeContext';
import { Text } from '../base';

export interface ToastProps {
  message: string | null;
  tone?: 'success' | 'danger';
}

/**
 * Floating status notification.
 * Renders nothing when no message is provided.
 */
export const Toast = ({
  message,
  tone = 'success',
}: ToastProps) => {
  const colors = useColors();

  if (!message) {
    return null;
  }

  const backgroundColor =
    tone === 'success'
      ? colors.statusPositive
      : colors.statusCritical;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { backgroundColor },
      ]}
    >
      <Text
        variant="bodySmall"
        style={[
          styles.message,
          {
            color: colors.textInverse,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },

  message: {
    fontWeight: Typography.label.fontWeight,
    textAlign: 'center',
  },
});

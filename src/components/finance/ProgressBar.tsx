import {
  StyleSheet,
  View,
} from 'react-native';
import { useColors } from '../../context/ThemeContext';
import {
  Radius,
  Spacing,
} from '../../theme';
import { clamp } from '../../utils/format';

export interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
}

/**
 * Horizontal progress bar.
 * Value is clamped to the 0 through 100 range.
 */
export const ProgressBar = ({
  value,
  color,
  height = Spacing.sm,
}: ProgressBarProps) => {
  const colors = useColors();
  const progress = clamp(value);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: progress,
      }}
      style={[
        styles.track,
        {
          height,
          backgroundColor:
            colors.backgroundSubtle,
        },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${progress}%`,
            backgroundColor:
              color ?? colors.actionPrimary,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: Radius.round,
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
    borderRadius: Radius.round,
  },
});

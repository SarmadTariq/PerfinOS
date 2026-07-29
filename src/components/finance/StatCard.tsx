import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  StyleSheet,
  View,
} from 'react-native';
import { useColors } from '../../context/ThemeContext';
import {
  Radius,
  Spacing,
} from '../../theme';
import { Card, Text } from '../base';

export type StatCardTone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger';

export interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentProps<
    typeof MaterialIcons
  >['name'];
  tone?: StatCardTone;
  helper?: string;
}

/**
 * Financial metric summary with semantic status tone.
 */
export const StatCard = ({
  label,
  value,
  icon,
  tone = 'primary',
  helper,
}: StatCardProps) => {
  const colors = useColors();

  const toneColor = {
    primary: colors.actionPrimary,
    success: colors.statusPositive,
    warning: colors.statusWarning,
    danger: colors.statusCritical,
  }[tone];

  return (
    <Card
      style={styles.card}
      shadow="sm"
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconTile,
            {
              backgroundColor:
                colors.actionPrimarySoft,
            },
          ]}
        >
          <MaterialIcons
            name={icon}
            size={Spacing.xl}
            color={toneColor}
          />
        </View>

        <View
          accessibilityLabel={`${tone} status`}
          style={[
            styles.statusDot,
            {
              backgroundColor:
                toneColor,
            },
          ]}
        />
      </View>

      <Text
        variant="bodySmall"
        color="secondary"
        style={styles.label}
      >
        {label}
      </Text>

      <Text
        variant="h3"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.value}
      >
        {value}
      </Text>

      <Text
        variant="caption"
        color="tertiary"
        style={styles.helper}
      >
        {helper ?? 'Current month'}
      </Text>
    </Card>
  );
};

const ControlSizeValue =
  Spacing.huge + Spacing.xs / 2;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth:
      Spacing.section * 2 +
      Spacing.xl,
    minHeight:
      Spacing.section * 2 +
      Spacing.md,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  iconTile: {
    width: ControlSizeValue,
    height: ControlSizeValue,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusDot: {
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: Radius.round,
  },

  label: {
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  value: {
    marginTop: Spacing.xs,
  },

  helper: {
    marginTop: Spacing.xs,
  },
});

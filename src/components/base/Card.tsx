import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import type {
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  Radius,
  Shadows,
  Spacing,
} from '../../theme/index';
import { useColors } from '../../context/ThemeContext';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  shadow?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  shadow = 'md',
}) => {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundElevated,
          borderColor: colors.borderSubtle,
        },
        shadow ? Shadows[shadow] : null,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

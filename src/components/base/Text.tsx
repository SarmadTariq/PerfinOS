import React from 'react';
import { Text as RNText } from 'react-native';
import type { TextProps } from 'react-native';
import { Typography } from '../../theme/index';
import { useColors } from '../../context/ThemeContext';

export type TypographyVariant =
  keyof typeof Typography;

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'danger'
  | 'success';

export interface TextComponentProps extends TextProps {
  variant?: TypographyVariant;
  color?: TextColor;
}

export const Text: React.FC<TextComponentProps> = ({
  variant = 'body',
  color = 'primary',
  children,
  style,
  ...props
}) => {
  const colors = useColors();

  const colorMap = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textMuted,
    danger: colors.statusCritical,
    success: colors.statusPositive,
  };

  return (
    <RNText
      {...props}
      style={[
        Typography[variant],
        {
          color: colorMap[color],
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
};

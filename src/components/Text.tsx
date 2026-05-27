import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { Colors, Typography } from '../theme';
import { useThemeScheme } from '../context/ThemeContext';

type TypographyVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'bodyLarge' | 'body' | 'bodySmall' | 'caption';
type TextColor = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success';

interface TextComponentProps extends TextProps {
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
  const scheme = useThemeScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  const colorMap = {
    primary: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    danger: colors.danger,
    success: colors.success,
  };

  const typographyStyle = Typography[variant];

  return (
    <RNText
      {...props}
      style={[typographyStyle, { color: colorMap[color] }, style]}
    >
      {children}
    </RNText>
  );
};

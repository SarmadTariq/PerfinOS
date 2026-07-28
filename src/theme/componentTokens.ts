import type { ThemeColors } from './colors';

export type ButtonColorVariant = 'primary' | 'secondary' | 'danger' | 'success';
export type FeedbackTone = 'success' | 'danger';

export type ComponentColorTokens = {
  background: string;
  border: string;
  foreground: string;
};

export const getButtonColorTokens = (
  colors: ThemeColors,
  variant: ButtonColorVariant,
  unavailable = false
): ComponentColorTokens => {
  if (unavailable) {
    return {
      background: colors.bgTertiary,
      border: colors.border,
      foreground: colors.textTertiary,
    };
  }

  switch (variant) {
    case 'secondary':
      return {
        background: colors.bgSecondary,
        border: colors.border,
        foreground: colors.text,
      };
    case 'danger':
      return {
        background: colors.dangerControl,
        border: colors.dangerControl,
        foreground: colors.onDanger,
      };
    case 'success':
      return {
        background: colors.successControl,
        border: colors.successControl,
        foreground: colors.onSuccess,
      };
    case 'primary':
    default:
      return {
        background: colors.primaryControl,
        border: colors.primaryControl,
        foreground: colors.onPrimary,
      };
  }
};

export const getToastColorTokens = (
  colors: ThemeColors,
  tone: FeedbackTone
): ComponentColorTokens => {
  if (tone === 'danger') {
    return {
      background: colors.dangerControl,
      border: colors.dangerControl,
      foreground: colors.onDanger,
    };
  }

  return {
    background: colors.successControl,
    border: colors.successControl,
    foreground: colors.onSuccess,
  };
};

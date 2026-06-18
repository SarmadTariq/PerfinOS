import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeCtx {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = '@perfin_theme_mode';

const isThemeMode = (value: string | null): value is ThemeMode => {
  return value === 'system' || value === 'light' || value === 'dark';
};

const resolveSystemScheme = (scheme: 'light' | 'dark' | null | undefined): 'light' | 'dark' => {
  return scheme === 'dark' ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const system = resolveSystemScheme(useColorScheme());
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;

        if (isThemeMode(stored)) {
          setModeState(stored);
          return;
        }

        setModeState('system');
      })
      .catch(() => {
        if (!mounted) return;
        setModeState('system');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);

    if (nextMode === 'system') {
      AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }

    AsyncStorage.setItem(STORAGE_KEY, nextMode);
  };

  const resolved: 'light' | 'dark' = mode === 'system' ? system : mode;

  const toggle = () => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  };

  const value = useMemo(
    () => ({
      mode,
      resolved,
      setMode,
      toggle,
    }),
    [mode, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};

/** Drop-in replacement for useColorScheme() that respects manual override */
export const useThemeScheme = (): 'light' | 'dark' => {
  const ctx = useContext(ThemeContext);
  const system = resolveSystemScheme(useColorScheme());

  if (!ctx) return system;
  return ctx.resolved;
};

/**
 * Returns the active color palette object for the current theme.
 * Convenience hook — avoids repeating the `scheme === 'dark' ? Colors.dark : Colors.light` pattern.
 *
 * @returns Light or dark color token object from `src/theme/colors.ts`
 */
export const useColors = () => {
  const scheme = useThemeScheme();
  // Lazy import avoids circular dependency at module eval time
  const { Colors } = require('../theme');
  return scheme === 'dark' ? Colors.dark : Colors.light;
};
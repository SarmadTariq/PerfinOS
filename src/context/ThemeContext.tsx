import React, { createContext, useContext, useState, useEffect } from 'react';
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

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const system = useColorScheme() ?? 'light';
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored as ThemeMode);
      }
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  };

  const resolved: 'light' | 'dark' = mode === 'system' ? system : mode;
  const toggle = () => setMode(resolved === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};

/** Drop-in replacement for useColorScheme() that respects manual override */
export const useThemeScheme = (): 'light' | 'dark' => {
  const ctx = useContext(ThemeContext);
  const system = useColorScheme() ?? 'light';
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

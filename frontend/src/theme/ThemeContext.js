import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  applyResolvedTheme,
  persistThemePreference,
  readStoredThemePreference,
  resolveTheme,
  THEME_OPTIONS,
} from './theme';

const ThemeContext = createContext({
  preference: 'system',
  resolved: 'light',
  setPreference: () => {},
  cyclePreference: () => {},
  options: THEME_OPTIONS,
});

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => readStoredThemePreference());
  const [resolved, setResolved] = useState(() => resolveTheme(preference));

  const setPreference = useCallback((next) => {
    const applied = persistThemePreference(next);
    setPreferenceState(normalizeSafe(next));
    setResolved(applied);
  }, []);

  const cyclePreference = useCallback(() => {
    const idx = THEME_OPTIONS.indexOf(normalizeSafe(preference));
    const next = THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length];
    setPreference(next);
  }, [preference, setPreference]);

  useEffect(() => {
    setResolved(applyResolvedTheme(preference));
  }, [preference]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (normalizeSafe(preference) === 'system') {
        setResolved(applyResolvedTheme('system'));
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, [preference]);

  const value = useMemo(
    () => ({
      preference: normalizeSafe(preference),
      resolved,
      setPreference,
      cyclePreference,
      options: THEME_OPTIONS,
    }),
    [preference, resolved, setPreference, cyclePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function normalizeSafe(value) {
  const v = String(value || '').trim().toLowerCase();
  return THEME_OPTIONS.includes(v) ? v : 'system';
}

export function useTheme() {
  return useContext(ThemeContext);
}

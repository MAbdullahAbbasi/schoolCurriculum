export const THEME_STORAGE_KEY = 'tl_theme_preference';
export const THEME_OPTIONS = ['light', 'system', 'dark'];

export function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function normalizeThemePreference(value) {
  const v = String(value || '').trim().toLowerCase();
  return THEME_OPTIONS.includes(v) ? v : 'system';
}

export function resolveTheme(preference) {
  const pref = normalizeThemePreference(preference);
  return pref === 'system' ? getSystemTheme() : pref;
}

export function readStoredThemePreference() {
  try {
    return normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch (_) {
    return 'system';
  }
}

export function applyResolvedTheme(preference) {
  if (typeof document === 'undefined') return 'light';
  const pref = normalizeThemePreference(preference);
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-preference', pref);
  root.style.colorScheme = resolved;
  return resolved;
}

export function persistThemePreference(preference) {
  const pref = normalizeThemePreference(preference);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch (_) {}
  return applyResolvedTheme(pref);
}

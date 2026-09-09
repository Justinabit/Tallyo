// =============================================================================
// TALLYO — Theme Utility (light / dark / system)
// =============================================================================
// Single source of truth for resolving and applying the app's color theme.
// A user's THEME SETTING is one of 'light' | 'dark' | 'system'. 'system'
// means "follow the OS", so what actually gets painted on screen (the
// RESOLVED theme, 'light' or 'dark') can change live without the user
// picking anything, if their OS switches (e.g. sunset-triggered dark mode).
// =============================================================================

const STORAGE_KEY = 'tallyo-theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

// Turns a theme SETTING ('light' | 'dark' | 'system') into the actual
// 'light' | 'dark' value that should be painted.
export function resolveTheme(setting) {
  if (setting === 'system') return getSystemTheme();
  return setting === 'dark' ? 'dark' : 'light';
}

// Paints the resolved theme and remembers the raw SETTING (not the resolved
// value) in localStorage, so a 'system' choice is still 'system' on reload
// rather than getting frozen at whatever it resolved to at save time.
export function applyTheme(setting) {
  const resolved = resolveTheme(setting);
  document.documentElement.setAttribute('data-theme', resolved);
  localStorage.setItem(STORAGE_KEY, setting || 'light');
  return resolved;
}

export function getCachedThemeSetting() {
  return localStorage.getItem(STORAGE_KEY) || 'system';
}

let listenerAttached = false;

// Call once, at app bootstrap. Whenever the OS theme flips, re-applies the
// CURRENTLY SAVED setting — which is a no-op unless that setting is
// 'system', in which case the app follows along live.
export function watchSystemTheme(getCurrentSetting) {
  if (listenerAttached || typeof window === 'undefined' || !window.matchMedia) return;
  listenerAttached = true;
  const mq = window.matchMedia(MEDIA_QUERY);
  const handler = () => {
    if (getCurrentSetting() === 'system') applyTheme('system');
  };
  if (mq.addEventListener) mq.addEventListener('change', handler);
  else if (mq.addListener) mq.addListener(handler); // Safari <14 fallback
}
import { create } from 'zustand';

/** What the person picked. "system" follows the OS light/dark setting. */
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'aura-desk:theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

const resolve = (pref: ThemePreference): ResolvedTheme =>
  pref === 'system' ? (media.matches ? 'dark' : 'light') : pref;

/** Tokens in index.css switch on <html data-theme>. */
function apply(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
}

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
}

const initial = readPreference();
// Applied at import time (before the first render) so the app never flashes the wrong theme
apply(resolve(initial));

export const useTheme = create<ThemeState>((set) => ({
  preference: initial,
  resolved: resolve(initial),
  setPreference: (preference) => {
    try {
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Storage unavailable: the choice lasts for this session only
    }
    const resolved = resolve(preference);
    apply(resolved);
    set({ preference, resolved });
  },
}));

// Follow OS changes live while the preference is "system"
media.addEventListener('change', () => {
  if (useTheme.getState().preference !== 'system') return;
  const resolved = resolve('system');
  apply(resolved);
  useTheme.setState({ resolved });
});

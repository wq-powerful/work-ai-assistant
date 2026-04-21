import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const APP_SETTINGS_KEY = 'app_settings';
const THEME_EVENT = 'app-theme-change';

function resolveSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(APP_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { theme?: unknown };
      if (parsed.theme === 'light' || parsed.theme === 'dark') {
        return parsed.theme;
      }
    }
  } catch {
    // Ignore corrupted local cache
  }

  return resolveSystemTheme();
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

function persistTheme(theme: Theme) {
  try {
    const saved = localStorage.getItem(APP_SETTINGS_KEY);
    const parsed = saved ? (JSON.parse(saved) as Record<string, unknown>) : {};
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ ...parsed, theme }));
  } catch {
    // Ignore localStorage failures
  }
}

export function syncTheme(theme: Theme) {
  applyTheme(theme);
  persistTheme(theme);
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const nextTheme = (event as CustomEvent<Theme>).detail;
      if (nextTheme === 'light' || nextTheme === 'dark') {
        setThemeState(nextTheme);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== APP_SETTINGS_KEY) return;
      setThemeState(readStoredTheme());
    };

    window.addEventListener(THEME_EVENT, handleThemeChange as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeChange as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTheme = (nextTheme: Theme) => syncTheme(nextTheme);
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

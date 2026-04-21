import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { AppSettings, ModelInfo } from '../types';
import { fetchSettings, updateSettings as apiUpdateSettings, fetchAvailableModels } from '../utils/api';
import { syncTheme } from './ThemeContext';

const DEFAULT_SETTINGS: AppSettings = {
  api_base_url: 'https://xiaozhi.aifuture.icu',
  api_key: '',
  model: 'gpt-4o',
  temperature: 0.7,
  max_tokens: 4096,
  top_k: 5,
  knowledge_base_path: '',
  system_prompt: '',
  theme: 'light',
};

interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  availableModels: ModelInfo[];
  modelsLoading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshModels: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function safeGetSettings(): AppSettings {
  try {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AppSettings>;
      // Never restore plaintext API key from local cache
      delete parsed.api_key;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Corrupted or inaccessible localStorage
  }
  return DEFAULT_SETTINGS;
}

function safeSaveSettings(settings: AppSettings) {
  try {
    const { api_key, ...safeSettings } = settings;
    localStorage.setItem('app_settings', JSON.stringify(safeSettings));
  } catch {
    // localStorage may be full or disabled
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(safeGetSettings);
  const [loading, setLoading] = useState(true);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const normalizeSettings = useCallback((incoming: Partial<AppSettings>): AppSettings => {
    const merged = { ...DEFAULT_SETTINGS, ...incoming };
    // API key is never persisted/returned in plaintext from backend.
    merged.api_key = '';
    return merged;
  }, []);

  const refreshModels = useCallback(async (retries = 2) => {
    setModelsLoading(true);
    try {
      const data = await fetchAvailableModels();
      setAvailableModels(data.models || []);
    } catch {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        setModelsLoading(false);
        return refreshModels(retries - 1);
      }
      setAvailableModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const refreshSettings = async () => {
    try {
      const data = await fetchSettings();
      const normalized = normalizeSettings(data.settings);
      setSettings(normalized);
      safeSaveSettings(normalized);
      syncTheme(normalized.theme);
    } catch {
      // Use localStorage fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([refreshSettings(), refreshModels()]);
  }, []);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const data = await apiUpdateSettings(updates);
    const normalized = normalizeSettings(data.settings);
    setSettings(normalized);
    safeSaveSettings(normalized);
    syncTheme(normalized.theme);
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, availableModels, modelsLoading, updateSettings, refreshSettings, refreshModels }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}

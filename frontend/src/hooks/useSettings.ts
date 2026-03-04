import { useSettingsContext } from '../contexts/SettingsContext';

// Re-export for consistent import pattern
export function useSettings() {
  return useSettingsContext();
}

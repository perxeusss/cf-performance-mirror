import type { ExtensionSettings, SavedSettings } from '../types/settings';

export const SETTINGS_KEY = 'cfpm_defaults';
export const TOGGLE_KEY = 'cfpm_enabled';

export function loadSettings(storage: Storage = localStorage): SavedSettings {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as SavedSettings;
  } catch {
    // Preserve legacy behavior: storage failures are non-fatal.
  }
  return {};
}

export function saveSettings(settings: Partial<ExtensionSettings>, storage: Storage = localStorage): void {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Preserve legacy behavior: storage failures are non-fatal.
  }
}

export function loadToggle(storage: Storage = localStorage): boolean {
  try {
    const value = storage.getItem(TOGGLE_KEY);
    return value === null ? true : value === 'true';
  } catch {
    return true;
  }
}

export function saveToggle(enabled: boolean, storage: Storage = localStorage): void {
  try {
    storage.setItem(TOGGLE_KEY, String(enabled));
  } catch {
    // Preserve legacy behavior: storage failures are non-fatal.
  }
}

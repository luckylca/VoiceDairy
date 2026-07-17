import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings } from '../../types/settings';
import { DEFAULT_SYSTEM_PROMPT } from '../llm/PromptBuilder';

const SETTINGS_KEY = 'voicedairy.settings.v1';
const LEGACY_DEFAULT_CATEGORY_SIGNATURE = 'idea、todo、reminder、note、journal、question、project、unknown';
const listeners = new Set<(settings: AppSettings) => void>();

export const defaultSettings: AppSettings = {
  apiBaseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  modelName: 'gpt-4o-mini',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  themeMode: 'system',
  colorSeed: '#6750A4',
};

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return defaultSettings;
  }

  try {
    const saved = JSON.parse(raw) as Partial<AppSettings>;
    const systemPrompt =
      typeof saved.systemPrompt === 'string' &&
      saved.systemPrompt.includes(LEGACY_DEFAULT_CATEGORY_SIGNATURE)
        ? DEFAULT_SYSTEM_PROMPT
        : saved.systemPrompt;

    return {
      ...defaultSettings,
      ...saved,
      systemPrompt: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  listeners.forEach(listener => listener(settings));
}

export function subscribeSettings(listener: (settings: AppSettings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

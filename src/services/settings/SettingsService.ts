import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings } from '../../types/settings';
import { DEFAULT_SYSTEM_PROMPT } from '../llm/PromptBuilder';

const SETTINGS_KEY = 'voicedairy.settings.v1';

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
    return {
      ...defaultSettings,
      ...JSON.parse(raw),
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

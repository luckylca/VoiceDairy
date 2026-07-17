import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_CATEGORY_SETTINGS,
  normalizeCategorySettings,
  type CategorySetting,
} from '../../types/category';

const CATEGORY_SETTINGS_KEY = 'voicedairy.category-settings.v1';
const listeners = new Set<(settings: CategorySetting[]) => void>();

export async function loadCategorySettings(): Promise<CategorySetting[]> {
  const raw = await AsyncStorage.getItem(CATEGORY_SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_CATEGORY_SETTINGS.map(item => ({ ...item }));
  }

  try {
    return normalizeCategorySettings(JSON.parse(raw));
  } catch {
    return DEFAULT_CATEGORY_SETTINGS.map(item => ({ ...item }));
  }
}

export async function saveCategorySettings(settings: CategorySetting[]): Promise<CategorySetting[]> {
  const normalized = normalizeCategorySettings(settings);
  await AsyncStorage.setItem(CATEGORY_SETTINGS_KEY, JSON.stringify(normalized));
  listeners.forEach(listener => listener(normalized));
  return normalized;
}

export async function resetCategorySettings(): Promise<CategorySetting[]> {
  await AsyncStorage.removeItem(CATEGORY_SETTINGS_KEY);
  const defaults = DEFAULT_CATEGORY_SETTINGS.map(item => ({ ...item }));
  listeners.forEach(listener => listener(defaults));
  return defaults;
}

export function subscribeCategorySettings(listener: (settings: CategorySetting[]) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

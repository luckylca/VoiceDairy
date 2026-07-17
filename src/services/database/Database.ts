import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry } from '../../types/entry';
import type { ProjectItem } from '../../types/project';
import type { RecordItem } from '../../types/record';

const DB_KEY = 'voicedairy.localdb.v1';

export type LocalDatabaseSnapshot = {
  records: RecordItem[];
  entries: Entry[];
  projects: ProjectItem[];
};

function createEmptySnapshot(): LocalDatabaseSnapshot {
  return {
    records: [],
    entries: [],
    projects: [],
  };
}

export async function loadSnapshot(): Promise<LocalDatabaseSnapshot> {
  const raw = await AsyncStorage.getItem(DB_KEY);
  if (!raw) {
    return createEmptySnapshot();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalDatabaseSnapshot>;
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    };
  } catch {
    return createEmptySnapshot();
  }
}

export async function saveSnapshot(snapshot: LocalDatabaseSnapshot): Promise<void> {
  await AsyncStorage.setItem(DB_KEY, JSON.stringify(snapshot));
}

export async function clearLocalDatabase(): Promise<void> {
  await AsyncStorage.removeItem(DB_KEY);
}

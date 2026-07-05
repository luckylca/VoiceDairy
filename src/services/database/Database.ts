import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry } from '../../types/entry';
import type { RecordItem } from '../../types/record';

const DB_KEY = 'voicedairy.localdb.v1';

type LocalDatabaseSnapshot = {
  records: RecordItem[];
  entries: Entry[];
};

const emptySnapshot: LocalDatabaseSnapshot = {
  records: [],
  entries: [],
};

export async function loadSnapshot(): Promise<LocalDatabaseSnapshot> {
  const raw = await AsyncStorage.getItem(DB_KEY);
  if (!raw) {
    return emptySnapshot;
  }

  try {
    const parsed = JSON.parse(raw) as LocalDatabaseSnapshot;
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return emptySnapshot;
  }
}

export async function saveSnapshot(snapshot: LocalDatabaseSnapshot): Promise<void> {
  await AsyncStorage.setItem(DB_KEY, JSON.stringify(snapshot));
}

export async function clearLocalDatabase(): Promise<void> {
  await AsyncStorage.removeItem(DB_KEY);
}

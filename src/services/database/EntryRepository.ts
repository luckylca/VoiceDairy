import type { Entry, EntryType } from '../../types/entry';
import { loadSnapshot, saveSnapshot } from './Database';

export async function listEntries(): Promise<Entry[]> {
  const snapshot = await loadSnapshot();
  return [...snapshot.entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEntryById(entryId: string): Promise<Entry | null> {
  const snapshot = await loadSnapshot();
  return snapshot.entries.find(item => item.id === entryId) ?? null;
}

export async function listEntriesByType(type: EntryType): Promise<Entry[]> {
  const entries = await listEntries();
  return entries.filter(item => item.type === type);
}

export async function upsertEntries(entries: Entry[]): Promise<void> {
  const snapshot = await loadSnapshot();
  const nextEntries = [...snapshot.entries];

  for (const entry of entries) {
    const index = nextEntries.findIndex(item => item.id === entry.id);
    if (index >= 0) {
      nextEntries[index] = entry;
    } else {
      nextEntries.unshift(entry);
    }
  }

  await saveSnapshot({
    ...snapshot,
    entries: nextEntries,
  });
}

export async function updateEntry(entry: Entry): Promise<void> {
  await upsertEntries([entry]);
}

export async function deleteEntry(entryId: string): Promise<void> {
  const snapshot = await loadSnapshot();
  await saveSnapshot({
    ...snapshot,
    entries: snapshot.entries.filter(item => item.id !== entryId),
  });
}

export async function toggleTodoDone(entryId: string): Promise<void> {
  const snapshot = await loadSnapshot();
  const now = new Date().toISOString();
  const entries: Entry[] = snapshot.entries.map(entry => {
    if (entry.id !== entryId) return entry;
    return {
      ...entry,
      status: entry.status === 'done' ? 'active' : 'done',
      updatedAt: now,
      syncStatus: 'dirty',
    };
  });

  await saveSnapshot({
    ...snapshot,
    entries,
  });
}

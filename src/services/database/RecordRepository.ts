import type { RecordItem } from '../../types/record';
import { loadSnapshot, saveSnapshot } from './Database';

export async function listRecords(): Promise<RecordItem[]> {
  const snapshot = await loadSnapshot();
  return [...snapshot.records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function upsertRecord(record: RecordItem): Promise<void> {
  const snapshot = await loadSnapshot();
  const index = snapshot.records.findIndex(item => item.id === record.id);

  if (index >= 0) {
    snapshot.records[index] = record;
  } else {
    snapshot.records.unshift(record);
  }

  await saveSnapshot(snapshot);
}

export async function deleteRecord(recordId: string): Promise<void> {
  const snapshot = await loadSnapshot();
  await saveSnapshot({
    records: snapshot.records.filter(item => item.id !== recordId),
    entries: snapshot.entries.filter(item => item.recordId !== recordId),
  });
}

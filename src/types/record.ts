import type { SyncStatus } from './entry';

export type RecordSource = 'voice' | 'text';

export type RecordItem = {
  id: string;
  rawText: string;
  correctedText?: string;
  summary: string;
  source: RecordSource;
  audioPath?: string | null;
  modelName?: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

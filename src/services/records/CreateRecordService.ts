import type { Entry } from '../../types/entry';
import type { LlmOrganizeResult } from '../../types/llm';
import type { RecordItem, RecordSource } from '../../types/record';
import { createId } from '../../utils/id';
import { nowIso } from '../../utils/date';
import { upsertEntries } from '../database/EntryRepository';
import { upsertRecord } from '../database/RecordRepository';

export async function saveOrganizedResult(params: {
  rawText: string;
  source: RecordSource;
  result: LlmOrganizeResult;
  modelName?: string;
}): Promise<{ record: RecordItem; entries: Entry[] }> {
  const now = nowIso();
  const recordId = createId('record');

  const record: RecordItem = {
    id: recordId,
    rawText: params.rawText,
    summary: params.result.summary,
    source: params.source,
    audioPath: null,
    modelName: params.modelName ?? null,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'dirty',
  };

  const entries: Entry[] = params.result.items.map(item => ({
    id: createId('entry'),
    recordId,
    type: item.type,
    title: item.title || '未命名条目',
    content: item.content || params.rawText,
    datetime: item.datetime,
    dueDate: item.due_date,
    priority: item.priority,
    tags: item.tags ?? [],
    project: item.project,
    status: 'active',
    confidence: item.confidence,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'dirty',
  }));

  await upsertRecord(record);
  await upsertEntries(entries);

  return { record, entries };
}

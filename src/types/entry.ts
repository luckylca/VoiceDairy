export type EntryType =
  | 'idea'
  | 'todo'
  | 'reminder'
  | 'note'
  | 'journal'
  | 'question'
  | 'project'
  | 'unknown';

export type EntryPriority = 'low' | 'normal' | 'high';

export type EntryStatus = 'active' | 'done' | 'archived';

export type SyncStatus = 'local' | 'synced' | 'dirty' | 'conflict';

export type Entry = {
  id: string;
  recordId: string;
  type: EntryType;
  title: string;
  content: string;
  datetime?: string | null;
  dueDate?: string | null;
  priority: EntryPriority;
  tags: string[];
  project?: string | null;
  status: EntryStatus;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export const entryTypeLabel: Record<EntryType, string> = {
  idea: '想法',
  todo: '待办',
  reminder: '提醒',
  note: '笔记',
  journal: '日记',
  question: '问题',
  project: '项目记录',
  unknown: '未分类',
};

export const entryTypeIcon: Record<EntryType, string> = {
  idea: 'lightbulb-outline',
  todo: 'checkbox-marked-circle-outline',
  reminder: 'bell-outline',
  note: 'note-text-outline',
  journal: 'book-open-page-variant-outline',
  question: 'help-circle-outline',
  project: 'folder-outline',
  unknown: 'dots-horizontal-circle-outline',
};

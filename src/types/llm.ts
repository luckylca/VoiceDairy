import type { EntryPriority, EntryType } from './entry';

export type LlmStructuredItem = {
  type: EntryType;
  title: string;
  content: string;
  datetime: string | null;
  due_date: string | null;
  priority: EntryPriority;
  tags: string[];
  project: string | null;
  confidence: number;
};

export type LlmOrganizeResult = {
  summary: string;
  items: LlmStructuredItem[];
};

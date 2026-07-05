import { z } from 'zod';
import type { LlmOrganizeResult } from '../../types/llm';

const entryTypeSchema = z.enum([
  'idea',
  'todo',
  'reminder',
  'note',
  'journal',
  'question',
  'project',
  'unknown',
]);

const prioritySchema = z.enum(['low', 'normal', 'high']);

const llmResultSchema = z.object({
  summary: z.string().default(''),
  items: z.array(
    z.object({
      type: entryTypeSchema.catch('unknown'),
      title: z.string().default('未命名条目'),
      content: z.string().default(''),
      datetime: z.string().nullable().default(null),
      due_date: z.string().nullable().default(null),
      priority: prioritySchema.catch('normal'),
      tags: z.array(z.string()).default([]),
      project: z.string().nullable().default(null),
      confidence: z.number().min(0).max(1).catch(0.5),
    }),
  ),
});

export function extractJsonObject(text: string): string {
  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start < 0 || end < start) {
    throw new Error('大模型没有返回有效 JSON 对象');
  }

  return cleaned.slice(start, end + 1);
}

export function parseAndValidateLlmJson(text: string): LlmOrganizeResult {
  const jsonText = extractJsonObject(text);
  const parsed = JSON.parse(jsonText);
  return llmResultSchema.parse(parsed);
}

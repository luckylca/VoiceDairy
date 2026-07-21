import type { ConflictDetectionResult, ConflictFinding, ConflictKind, ConflictSeverity } from '../../types/conflict';
import type { Entry } from '../../types/entry';
import type { LlmOrganizeResult } from '../../types/llm';
import type { ProjectItem } from '../../types/project';
import type { AppSettings } from '../../types/settings';
import { listEntries } from '../database/EntryRepository';
import { listProjects } from '../database/ProjectRepository';
import { extractJsonObject, requestCloudAgentText } from '../llm/CloudAgentService';

const CONFLICT_SYSTEM_PROMPT = `你是 VoiceDiary 的“冲突检测 Agent”，不是普通整理模型。你的任务是把本次准备保存的结构化事项，与用户已有记录、待办、提醒、项目和需求进行交叉检查。
只报告有明确证据的冲突：
1. 时间冲突：两个具有明确日期时间的事项重叠或时间上不可能连续完成；没有明确时间时不得猜测。
2. 重复冲突：本次事项与已有未完成事项明显是同一件事，避免重复创建。
3. 项目冲突：事项归属项目不存在、与项目描述明显矛盾，或声称完成的需求实际不存在/已完成。
4. 依赖冲突：事项要求先完成某个仍未完成的前置需求。
5. 内容矛盾：本次记录与已有明确事实或决策互相否定。
不要把“可能相关”夸大成冲突；不确定时返回无冲突。
输出严格 JSON，不要 Markdown：
{"hasConflict":true,"conflicts":[{"kind":"time|duplicate|project|dependency|contradiction","severity":"info|warning|critical","title":"...","message":"说明证据","suggestion":"用户可采取的动作","relatedIds":["已有条目或项目 id"]}]}`;

function compactEntry(entry: Entry): Record<string, unknown> {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    content: entry.content.slice(0, 260),
    datetime: entry.datetime ?? null,
    dueDate: entry.dueDate ?? null,
    project: entry.project ?? null,
    status: entry.status,
    priority: entry.priority,
    updatedAt: entry.updatedAt,
  };
}

function compactProject(project: ProjectItem): Record<string, unknown> {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? '',
    requirements: project.requirements.map(requirement => ({
      id: requirement.id,
      title: requirement.title,
      done: requirement.done,
    })),
  };
}

function normalizeKind(value: unknown): ConflictKind {
  return value === 'time' || value === 'duplicate' || value === 'project' || value === 'dependency'
    ? value
    : 'contradiction';
}

function normalizeSeverity(value: unknown): ConflictSeverity {
  return value === 'critical' || value === 'info' ? value : 'warning';
}

function parseConflict(value: unknown): ConflictFinding | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const message = typeof record.message === 'string' ? record.message.trim() : '';
  const suggestion = typeof record.suggestion === 'string' ? record.suggestion.trim() : '';
  const relatedIds = Array.isArray(record.relatedIds)
    ? record.relatedIds.filter((item): item is string => typeof item === 'string')
    : [];
  if (!title || !message) return null;
  return {
    kind: normalizeKind(record.kind),
    severity: normalizeSeverity(record.severity),
    title,
    message,
    suggestion: suggestion || '请检查后再确认保存。',
    relatedIds,
  };
}

export async function detectConflicts(
  rawText: string,
  organizedResult: LlmOrganizeResult,
  settings: AppSettings,
): Promise<ConflictDetectionResult> {
  if (!settings.conflictDetectionEnabled || settings.organizerProvider !== 'cloud') {
    return { hasConflict: false, conflicts: [] };
  }

  const [entries, projects] = await Promise.all([listEntries(), listProjects()]);
  const activeEntries = entries
    .filter(entry => entry.status !== 'archived')
    .slice(0, 80)
    .map(compactEntry);
  const context = {
    rawText,
    proposed: organizedResult,
    existingEntries: activeEntries,
    projects: projects.slice(0, 30).map(compactProject),
  };

  const text = await requestCloudAgentText({
    settings,
    systemPrompt: CONFLICT_SYSTEM_PROMPT,
    userPrompt: JSON.stringify(context),
    jsonMode: true,
    temperature: 0,
    maxTokens: 1800,
  });
  const payload = extractJsonObject(text);
  const conflicts = Array.isArray(payload.conflicts)
    ? payload.conflicts.map(parseConflict).filter((item): item is ConflictFinding => Boolean(item))
    : [];
  return {
    hasConflict: payload.hasConflict === true && conflicts.length > 0,
    conflicts,
  };
}
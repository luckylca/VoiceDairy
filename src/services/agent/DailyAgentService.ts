import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry } from '../../types/entry';
import type { ProjectItem } from '../../types/project';
import type { AppSettings } from '../../types/settings';
import type { DailyAgentMode, DailyAgentResult, DailyAgentSection } from '../../types/dailyAgent';
import { listEntries } from '../database/EntryRepository';
import { listProjects } from '../database/ProjectRepository';
import { extractJsonObject, requestCloudAgentText } from '../llm/CloudAgentService';

const RESULT_KEY_PREFIX = 'voicediary.daily-agent.result.v1';

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameLocalDay(value: string, day: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && localDateKey(date) === day;
}

function compactEntry(entry: Entry): Record<string, unknown> {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    content: entry.content.slice(0, 320),
    status: entry.status,
    priority: entry.priority,
    datetime: entry.datetime ?? null,
    dueDate: entry.dueDate ?? null,
    project: entry.project ?? null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function compactProject(project: ProjectItem): Record<string, unknown> {
  return {
    name: project.name,
    description: project.description ?? '',
    updatedAt: project.updatedAt,
    requirements: project.requirements.map(requirement => ({
      title: requirement.title,
      done: requirement.done,
      updatedAt: requirement.updatedAt,
    })),
  };
}

function buildContext(entries: Entry[], projects: ProjectItem[], day: string) {
  const todayEntries = entries.filter(entry => isSameLocalDay(entry.createdAt, day));
  const updatedToday = entries.filter(entry => isSameLocalDay(entry.updatedAt, day));
  const unfinished = entries.filter(entry =>
    (entry.type === 'todo' || entry.type === 'reminder') && entry.status === 'active',
  );
  const completedToday = updatedToday.filter(entry => entry.status === 'done');
  const upcoming = unfinished
    .filter(entry => entry.datetime || entry.dueDate)
    .sort((left, right) => String(left.datetime ?? left.dueDate).localeCompare(String(right.datetime ?? right.dueDate)))
    .slice(0, 24);

  return {
    date: day,
    todayEntries: todayEntries.slice(0, 40).map(compactEntry),
    completedToday: completedToday.slice(0, 30).map(compactEntry),
    unfinished: unfinished.slice(0, 50).map(compactEntry),
    upcoming: upcoming.map(compactEntry),
    projects: projects.slice(0, 30).map(compactProject),
  };
}

const PLAN_SYSTEM_PROMPT = `你是 VoiceDiary 的“每日规划 Agent”。你只能依据用户真实保存的记录、待办、提醒、项目和需求生成今天的行动计划。
规则：
1. 不得虚构任务、截止时间、会议或项目状态；资料不足时明确写“未记录”。
2. 优先处理明确截止、逾期、高优先级和会阻塞项目的事项。
3. 合并重复事项，指出时间冲突、依赖冲突和不现实的工作量。
4. 计划要具体、可执行，控制在用户一天能完成的范围内。
5. 输出严格 JSON，不要 Markdown：
{"title":"...","overview":"...","sections":[{"title":"今日三件最重要的事","items":["..."]},{"title":"建议顺序","items":["..."]},{"title":"项目推进","items":["..."]}],"risks":["..."],"nextAction":"..."}`;

const REVIEW_SYSTEM_PROMPT = `你是 VoiceDiary 的“每日复盘 Agent”。你只能依据用户今天真实保存和更新的数据复盘，不得编造经历。
必须覆盖：今天记录了哪些想法和信息、完成了什么、哪些待办或提醒仍未完成、哪些项目或需求发生变化、有哪些风险或遗漏、明天最值得继续的动作。
区分“今天新建”和“今天更新”，不要把历史内容误当成今天完成。
输出严格 JSON，不要 Markdown：
{"title":"...","overview":"...","sections":[{"title":"今天留下的记录","items":["..."]},{"title":"完成与进展","items":["..."]},{"title":"未完成与遗留","items":["..."]},{"title":"项目与需求变化","items":["..."]}],"risks":["..."],"nextAction":"..."}`;

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map(item => item.trim())
    : [];
}

function parseSections(value: unknown): DailyAgentSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title.trim() : '';
      const items = stringArray(record.items);
      return title && items.length > 0 ? { title, items } : null;
    })
    .filter((item): item is DailyAgentSection => Boolean(item));
}

function parseResult(
  mode: DailyAgentMode,
  date: string,
  text: string,
  modelName: string,
): DailyAgentResult {
  const payload = extractJsonObject(text);
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const overview = typeof payload.overview === 'string' ? payload.overview.trim() : '';
  const sections = parseSections(payload.sections);
  const risks = stringArray(payload.risks);
  const nextAction = typeof payload.nextAction === 'string' ? payload.nextAction.trim() : '';
  if (!title || !overview || sections.length === 0) {
    throw new Error('每日 Agent 返回结构不完整，请重试。');
  }
  return {
    mode,
    date,
    title,
    overview,
    sections,
    risks,
    nextAction: nextAction || '查看未完成事项并选择下一步。',
    generatedAt: new Date().toISOString(),
    modelName,
  };
}

function resultKey(mode: DailyAgentMode, date: string): string {
  return `${RESULT_KEY_PREFIX}.${date}.${mode}`;
}

export async function loadDailyAgentResult(
  mode: DailyAgentMode,
  date = localDateKey(),
): Promise<DailyAgentResult | null> {
  const raw = await AsyncStorage.getItem(resultKey(mode, date));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailyAgentResult;
  } catch {
    return null;
  }
}

export async function generateDailyAgentResult(
  mode: DailyAgentMode,
  settings: AppSettings,
): Promise<DailyAgentResult> {
  if (settings.organizerProvider !== 'cloud') {
    throw new Error('每日规划和每日复盘仅支持云端 API，本地模型不会调用此功能。');
  }
  const [entries, projects] = await Promise.all([listEntries(), listProjects()]);
  const date = localDateKey();
  const context = buildContext(entries, projects, date);
  const text = await requestCloudAgentText({
    settings,
    systemPrompt: mode === 'plan' ? PLAN_SYSTEM_PROMPT : REVIEW_SYSTEM_PROMPT,
    userPrompt: `当前日期：${date}\n以下是 VoiceDiary 的真实数据快照：\n${JSON.stringify(context)}`,
    jsonMode: true,
    temperature: 0.15,
    maxTokens: 3200,
  });
  const result = parseResult(mode, date, text, settings.modelName);
  await AsyncStorage.setItem(resultKey(mode, date), JSON.stringify(result));
  return result;
}

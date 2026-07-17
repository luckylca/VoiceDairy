import type { AppSettings } from '../../types/settings';
import type { LlmOrganizeResult } from '../../types/llm';
import { buildSystemPrompt, buildUserPrompt } from './PromptBuilder';
import { parseAndValidateLlmJson } from './JsonRepair';

export type OrganizeTextOptions = {
  text: string;
  settings: AppSettings;
  demoMode?: boolean;
};

function normalizeApiBaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/models$/i, '');
}

function buildApiHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const trimmedKey = apiKey.trim();
  if (trimmedKey) {
    headers.Authorization = `Bearer ${trimmedKey}`;
  }
  return headers;
}

function extractModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = Array.isArray(record.data)
    ? record.data
    : Array.isArray(record.models)
      ? record.models
      : [];

  const ids = candidates
    .map(item => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (item && typeof item === 'object') {
        const id = (item as Record<string, unknown>).id;
        const name = (item as Record<string, unknown>).name;
        if (typeof id === 'string') return id.trim();
        if (typeof name === 'string') return name.trim();
      }
      return '';
    })
    .filter((id): id is string => Boolean(id));

  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

export async function fetchAvailableModels(settings: AppSettings): Promise<string[]> {
  const baseUrl = normalizeApiBaseUrl(settings.apiBaseUrl);
  if (!baseUrl) {
    throw new Error('请先填写 API Base URL');
  }

  const response = await fetch(`${baseUrl}/models`, {
    method: 'GET',
    headers: buildApiHeaders(settings.apiKey),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`获取模型列表失败：${response.status} ${message}`);
  }

  const models = extractModelIds(await response.json());
  if (models.length === 0) {
    throw new Error('接口返回成功，但没有找到可用模型');
  }
  return models;
}

function buildDemoResult(text: string): LlmOrganizeResult {
  const normalized = text.trim();
  const hasReminder = /提醒|明天|后天|下周|晚上|早上|点钟|日期/.test(normalized);
  const hasProject = /项目|版本|进度|里程碑|需求/.test(normalized);
  const hasTodo = /要|需要|记得|完成|整理|修改|做/.test(normalized);
  const type = hasReminder ? 'reminder' : hasProject ? 'project' : hasTodo ? 'todo' : 'idea';

  return {
    summary: normalized.length > 32 ? `${normalized.slice(0, 32)}…` : normalized || '演示整理结果',
    items: [
      {
        type,
        title:
          type === 'reminder'
            ? '待提醒事项'
            : type === 'project'
              ? '项目进度'
              : type === 'todo'
                ? '待处理事项'
                : '新的想法',
        content: normalized || '这是一条演示内容。',
        datetime: null,
        due_date: null,
        priority: 'normal',
        tags: ['语音记录'],
        project: type === 'project' ? '未命名项目' : null,
        confidence: 0.72,
      },
    ],
  };
}

export async function organizeText(options: OrganizeTextOptions): Promise<LlmOrganizeResult> {
  const { text, settings, demoMode } = options;

  if (demoMode || !settings.apiKey || !settings.apiBaseUrl || !settings.modelName) {
    return buildDemoResult(text);
  }

  const baseUrl = normalizeApiBaseUrl(settings.apiBaseUrl);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildApiHeaders(settings.apiKey),
    body: JSON.stringify({
      model: settings.modelName,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(settings.systemPrompt),
        },
        {
          role: 'user',
          content: buildUserPrompt(text),
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`大模型请求失败：${response.status} ${message}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    throw new Error('大模型返回格式异常：缺少 message.content');
  }

  return parseAndValidateLlmJson(content);
}

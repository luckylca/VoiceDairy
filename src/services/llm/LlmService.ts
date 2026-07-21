import type { AppSettings } from '../../types/settings';
import type { LlmOrganizeResult } from '../../types/llm';
import type { ProjectItem } from '../../types/project';
import { listProjects } from '../database/ProjectRepository';
import { buildSystemPrompt, buildUserPrompt } from './PromptBuilder';
import { parseAndValidateLlmJson } from './JsonRepair';
import { organizeTextLocally } from './LocalModelService';
import {
  getCloudProviderPreset,
  resolveCloudBaseUrl,
} from './CloudModelProviders';

export type OrganizeTextOptions = {
  text: string;
  settings: AppSettings;
};

function normalizeApiBaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/messages$/i, '')
    .replace(/\/models$/i, '');
}

function buildOpenAiHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const trimmedKey = apiKey.trim();
  if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;
  return headers;
}

function buildAnthropicHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey.trim(),
    'anthropic-version': '2023-06-01',
  };
}

function extractModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  const candidates = Array.isArray(record.data)
    ? record.data
    : Array.isArray(record.models)
      ? record.models
      : [];

  const ids = candidates
    .map(item => {
      if (typeof item === 'string') return item.trim();
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
  const preset = getCloudProviderPreset(settings.cloudModelProvider);
  const baseUrl = normalizeApiBaseUrl(resolveCloudBaseUrl(settings));
  if (!baseUrl) throw new Error('请先填写 API Base URL');

  const response = await fetch(`${baseUrl}/models`, {
    method: 'GET',
    headers:
      preset.protocol === 'anthropic'
        ? buildAnthropicHeaders(settings.apiKey)
        : buildOpenAiHeaders(settings.apiKey),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`获取模型列表失败：${response.status} ${message}`);
  }

  const models = extractModelIds(await response.json());
  if (models.length === 0) throw new Error('接口返回成功，但没有找到可用模型');
  return models;
}

function extractAnthropicText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const content = (payload as Record<string, unknown>).content;
  if (!Array.isArray(content)) return '';
  return content
    .map(block => {
      if (!block || typeof block !== 'object') return '';
      const record = block as Record<string, unknown>;
      return record.type === 'text' && typeof record.text === 'string' ? record.text : '';
    })
    .filter(Boolean)
    .join('\n');
}

async function organizeTextWithAnthropic(
  text: string,
  settings: AppSettings,
  projects: ProjectItem[],
  baseUrl: string,
): Promise<LlmOrganizeResult> {
  const response = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: buildAnthropicHeaders(settings.apiKey),
    body: JSON.stringify({
      model: settings.modelName,
      max_tokens: 4096,
      temperature: 0.2,
      system: buildSystemPrompt(settings.systemPrompt, undefined, projects),
      messages: [{ role: 'user', content: buildUserPrompt(text) }],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Claude 请求失败：${response.status} ${message}`);
  }

  const content = extractAnthropicText(await response.json());
  if (!content) throw new Error('Claude 返回格式异常：缺少文本内容');
  return parseAndValidateLlmJson(content);
}

async function organizeTextWithOpenAiCompatible(
  text: string,
  settings: AppSettings,
  projects: ProjectItem[],
  baseUrl: string,
): Promise<LlmOrganizeResult> {
  const preset = getCloudProviderPreset(settings.cloudModelProvider);
  const body: Record<string, unknown> = {
    model: settings.modelName,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(settings.systemPrompt, undefined, projects),
      },
      { role: 'user', content: buildUserPrompt(text) },
    ],
  };
  if (preset.jsonMode) body.response_format = { type: 'json_object' };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildOpenAiHeaders(settings.apiKey),
    body: JSON.stringify(body),
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

async function organizeTextWithCloud(
  text: string,
  settings: AppSettings,
  projects: ProjectItem[],
): Promise<LlmOrganizeResult> {
  const preset = getCloudProviderPreset(settings.cloudModelProvider);
  const baseUrl = normalizeApiBaseUrl(resolveCloudBaseUrl(settings));
  if (!baseUrl || !settings.modelName.trim()) {
    throw new Error('请先在设置中选择供应商并填写模型名');
  }

  return preset.protocol === 'anthropic'
    ? organizeTextWithAnthropic(text, settings, projects, baseUrl)
    : organizeTextWithOpenAiCompatible(text, settings, projects, baseUrl);
}

export async function organizeText(options: OrganizeTextOptions): Promise<LlmOrganizeResult> {
  const { text, settings } = options;
  const projects = await listProjects();
  if (settings.organizerProvider === 'local') {
    return organizeTextLocally(text, settings, projects);
  }
  return organizeTextWithCloud(text, settings, projects);
}

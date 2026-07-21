import type { AppSettings } from '../../types/settings';
import { getCloudProviderPreset, resolveCloudBaseUrl } from './CloudModelProviders';

export type CloudAgentRequest = {
  settings: AppSettings;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
};

function normalizeBaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/messages$/i, '');
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

export async function requestCloudAgentText(request: CloudAgentRequest): Promise<string> {
  const { settings } = request;
  if (settings.organizerProvider !== 'cloud') {
    throw new Error('此 Agent 仅支持云端 API，请先在设置中切换到云端模型。');
  }
  if (!settings.apiKey.trim() || !settings.modelName.trim()) {
    throw new Error('请先配置云端 API Key 和模型名。');
  }

  const preset = getCloudProviderPreset(settings.cloudModelProvider);
  const baseUrl = normalizeBaseUrl(resolveCloudBaseUrl(settings));
  if (!baseUrl) throw new Error('请先配置云端模型接口地址。');

  if (preset.protocol === 'anthropic') {
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: settings.modelName,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.2,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
      }),
    });
    if (!response.ok) {
      throw new Error(`Claude Agent 请求失败：${response.status} ${await response.text()}`);
    }
    const text = extractAnthropicText(await response.json());
    if (!text) throw new Error('Claude Agent 返回格式异常：没有文本内容。');
    return text;
  }

  const body: Record<string, unknown> = {
    model: settings.modelName,
    temperature: request.temperature ?? 0.2,
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ],
  };
  if (request.jsonMode && preset.jsonMode) body.response_format = { type: 'json_object' };
  if (request.maxTokens) body.max_tokens = request.maxTokens;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`云端 Agent 请求失败：${response.status} ${await response.text()}`);
  }
  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('云端 Agent 返回格式异常：缺少 message.content。');
  }
  return text;
}

export function extractJsonObject(text: string): Record<string, unknown> {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1];
  const candidate = (fenced ?? text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Agent 返回内容中没有可解析的 JSON 对象。');
  return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
}
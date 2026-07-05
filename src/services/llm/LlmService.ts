import type { AppSettings } from '../../types/settings';
import type { LlmOrganizeResult } from '../../types/llm';
import { buildSystemPrompt, buildUserPrompt } from './PromptBuilder';
import { parseAndValidateLlmJson } from './JsonRepair';

export type OrganizeTextOptions = {
  text: string;
  settings: AppSettings;
  demoMode?: boolean;
};

function buildDemoResult(text: string): LlmOrganizeResult {
  const normalized = text.trim();
  const hasReminder = /提醒|明天|后天|下周|晚上|早上/.test(normalized);
  const hasTodo = /要|需要|记得|完成|整理|修改|做/.test(normalized);

  return {
    summary: normalized.length > 32 ? `${normalized.slice(0, 32)}…` : normalized || '演示整理结果',
    items: [
      {
        type: hasReminder ? 'reminder' : hasTodo ? 'todo' : 'note',
        title: hasTodo ? '待处理事项' : '语音笔记',
        content: normalized || '这是一条演示内容。',
        datetime: null,
        due_date: null,
        priority: 'normal',
        tags: ['语音记录'],
        project: null,
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

  const response = await fetch(`${settings.apiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
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

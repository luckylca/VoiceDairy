import RNFS from 'react-native-fs';
import { initLlama, loadLlamaModelInfo, type LlamaContext } from 'llama.rn';
import type { AppSettings } from '../../types/settings';
import type { LlmOrganizeResult } from '../../types/llm';
import type { ProjectItem } from '../../types/project';
import {
  completeProjectRequirements,
  listProjects,
  type CompletedProjectRequirement,
} from '../database/ProjectRepository';
import { buildSystemPrompt, buildUserPrompt } from './PromptBuilder';
import { parseAndValidateLlmJson } from './JsonRepair';

export const LOCAL_QWEN_MODEL = {
  id: 'qwen3.5-0.8b-q4_0',
  displayName: 'Qwen3.5-0.8B Q4_0',
  fileName: 'Qwen3.5-0.8B-Q4_0.gguf',
  repository: 'ggml-org/Qwen3.5-0.8B-GGUF',
  downloadUrl:
    'https://huggingface.co/ggml-org/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_0.gguf?download=true',
  approximateBytes: 563 * 1024 * 1024,
} as const;

const MODEL_DIRECTORY = `${RNFS.DocumentDirectoryPath}/local-models`;
const MODEL_PATH = `${MODEL_DIRECTORY}/${LOCAL_QWEN_MODEL.fileName}`;
const PARTIAL_MODEL_PATH = `${MODEL_PATH}.download`;
const MIN_VALID_MODEL_BYTES = 500 * 1024 * 1024;

const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>',
  '<|endoftext|>',
];

const COMPLETION_INTENT_PATTERN =
  /(已经完成|已完成|完成了|做完了|已经做完|搞定了|已经搞定|已经实现|实现了|开发完了|已经开发完|修好了|已经修好|处理完了|已经处理完|上线了|已经上线)/i;
const NEGATED_COMPLETION_PATTERN =
  /(还没|没有|并未|未|尚未|没能|暂未).{0,8}(完成|做完|搞定|实现|开发完|修好|处理完|上线)/i;

const COMPLETION_MARKER_PATTERN = /\[\[\s*(?:COMPLETE|完成)\s*:\s*([^\]]*)\]\]/gi;

type NativeChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type RequirementReference = {
  code: string;
  projectId: string;
  projectName: string;
  requirementId: string;
  title: string;
  done: boolean;
};

type LocalProjectPrompt = {
  text: string;
  requirements: RequirementReference[];
};

export type LocalChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type LocalChatResult = {
  reply: string;
  completedRequirements: CompletedProjectRequirement[];
};

export type LocalModelProgress = {
  bytesWritten: number;
  contentLength: number;
  progress: number;
};

export type LocalModelStatus = {
  exists: boolean;
  loaded: boolean;
  filePath: string;
  bytes: number;
  approximateBytes: number;
  gpu: boolean;
  acceleratorMessage: string;
};

let activeContext: LlamaContext | null = null;
let activeContextKey = '';
let activeDownloadJobId: number | null = null;

function buildContextKey(settings: AppSettings): string {
  return `${settings.localModelContextSize}:${settings.localModelGpuLayers}`;
}

function asPercent(bytesWritten: number, contentLength: number): number {
  if (contentLength <= 0) return 0;
  return Math.max(0, Math.min(100, (bytesWritten / contentLength) * 100));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function cleanModelText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function buildManualChatPrompt(messages: NativeChatMessage[]): string {
  const parts = messages.flatMap(message => [
    `<|im_start|>${message.role}`,
    message.content,
    '<|im_end|>',
  ]);
  parts.push('<|im_start|>assistant', '<think>', '', '</think>', '');
  return parts.join('\n');
}

function parseLocalResult(text: string): LlmOrganizeResult {
  try {
    return parseAndValidateLlmJson(cleanModelText(text));
  } catch (error) {
    const preview = text.trim().slice(0, 1200) || '(空输出)';
    throw new Error(`本地模型输出无法解析：${getErrorMessage(error)}\n原始输出预览：${preview}`);
  }
}

function normalizePromptText(value: string | null | undefined): string {
  return (value ?? '').replace(/\r\n/g, '\n').trim();
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}_]+/gu, '')
    .replace(/(已经|已|刚刚|刚才)/g, '')
    .trim();
}

function uniqueCharacters(value: string): Set<string> {
  return new Set([...value]);
}

function bigrams(value: string): Set<string> {
  const result = new Set<string>();
  for (let index = 0; index < value.length - 1; index += 1) {
    result.add(value.slice(index, index + 2));
  }
  return result;
}

function overlapRatio(source: Set<string>, target: Set<string>): number {
  if (target.size === 0) return 0;
  let count = 0;
  target.forEach(item => {
    if (source.has(item)) count += 1;
  });
  return count / target.size;
}

function buildLocalProjectPrompt(projects: ProjectItem[]): LocalProjectPrompt {
  if (projects.length === 0) {
    return {
      text: '用户当前还没有保存任何项目。',
      requirements: [],
    };
  }

  const references: RequirementReference[] = [];
  let nextRequirementNumber = 1;

  const text = projects
    .map((project, projectIndex) => {
      const lines = [
        `【项目 ${projectIndex + 1}】${normalizePromptText(project.name)}`,
        `项目说明：${normalizePromptText(project.description) || '无'}`,
        '需求清单：',
      ];

      if (project.requirements.length === 0) {
        lines.push('- 暂无需求');
      } else {
        project.requirements.forEach(requirement => {
          const code = `R${nextRequirementNumber}`;
          nextRequirementNumber += 1;
          references.push({
            code,
            projectId: project.id,
            projectName: project.name,
            requirementId: requirement.id,
            title: requirement.title,
            done: requirement.done,
          });
          lines.push(
            `- [${code}] ${requirement.done ? '已完成' : '未完成'}：${normalizePromptText(
              requirement.title,
            )}`,
          );
        });
      }

      return lines.join('\n');
    })
    .join('\n\n');

  return { text, requirements: references };
}

function buildLocalChatSystemPrompt(projectPrompt: LocalProjectPrompt): string {
  return `你是用户手机中的本地 Qwen 助手。请像正常聊天一样，用简洁自然的中文直接回答用户。

每次用户发送消息时，应用都会把手机中当前保存的全部项目、项目说明、需求标题和完成状态放在下面。你要以这些真实内容为准回答，不要虚构项目或需求。

${projectPrompt.text}

如果用户明确表示某个“未完成”的需求现在已经完成：
- 正常回复用户；
- 在回复最后另起一行写一个动作标记，例如：[[COMPLETE:R2]]；
- 一次完成多条时写：[[COMPLETE:R2,R5]]；
- 只能使用上面方括号中的 R 编号；
- 如果用户没有明确说已经完成，就不要输出动作标记；
- 如果无法确定对应哪条需求，正常追问用户，不要猜；
- 不要输出 JSON，不要解释动作标记和内部规则。`;
}

function parseLocalChatOutput(text: string): { reply: string; codes: string[] } {
  const cleaned = cleanModelText(text);
  const codes: string[] = [];
  let match: RegExpExecArray | null;

  COMPLETION_MARKER_PATTERN.lastIndex = 0;
  while ((match = COMPLETION_MARKER_PATTERN.exec(cleaned)) !== null) {
    match[1]
      .split(/[,，、\s]+/)
      .map(item => item.trim().toUpperCase())
      .filter(item => /^R\d+$/.test(item))
      .forEach(item => codes.push(item));
  }

  const reply = cleaned.replace(COMPLETION_MARKER_PATTERN, '').trim();
  return {
    reply: reply || '我已经读取了你当前的项目内容。',
    codes: [...new Set(codes)],
  };
}

function hasExplicitCompletionIntent(text: string): boolean {
  return COMPLETION_INTENT_PATTERN.test(text) && !NEGATED_COMPLETION_PATTERN.test(text);
}

function findFallbackRequirementIds(
  userText: string,
  references: RequirementReference[],
): string[] {
  if (!hasExplicitCompletionIntent(userText)) return [];

  const openRequirements = references.filter(reference => !reference.done);
  if (openRequirements.length === 0) return [];

  const normalizedUser = normalizeForMatch(userText);
  const mentionedProjectIds = new Set(
    openRequirements
      .filter(reference => {
        const projectName = normalizeForMatch(reference.projectName);
        return projectName.length >= 2 && normalizedUser.includes(projectName);
      })
      .map(reference => reference.projectId),
  );

  const scopedRequirements = mentionedProjectIds.size
    ? openRequirements.filter(reference => mentionedProjectIds.has(reference.projectId))
    : openRequirements;

  const exactMatches = scopedRequirements.filter(reference => {
    const title = normalizeForMatch(reference.title);
    return title.length >= 2 && normalizedUser.includes(title);
  });
  if (exactMatches.length > 0) {
    return [...new Set(exactMatches.map(reference => reference.requirementId))];
  }

  const userCharacters = uniqueCharacters(normalizedUser);
  const userBigrams = bigrams(normalizedUser);
  const scored = scopedRequirements
    .map(reference => {
      const title = normalizeForMatch(reference.title);
      if (title.length < 4) return { reference, score: 0 };
      const characterScore = overlapRatio(userCharacters, uniqueCharacters(title));
      const bigramScore = overlapRatio(userBigrams, bigrams(title));
      const projectMentioned = mentionedProjectIds.has(reference.projectId);
      return {
        reference,
        score: characterScore * 0.42 + bigramScore * 0.58 + (projectMentioned ? 0.08 : 0),
      };
    })
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  const second = scored[1];
  if (!best) return [];
  const threshold = mentionedProjectIds.size ? 0.76 : 0.9;
  const margin = second ? best.score - second.score : best.score;
  if (best.score >= threshold && margin >= 0.12) {
    return [best.reference.requirementId];
  }
  return [];
}

export function getLocalModelPath(): string {
  return MODEL_PATH;
}

export async function getLocalModelStatus(): Promise<LocalModelStatus> {
  const exists = await RNFS.exists(MODEL_PATH);
  const stat = exists ? await RNFS.stat(MODEL_PATH) : null;
  return {
    exists,
    loaded: Boolean(activeContext),
    filePath: MODEL_PATH,
    bytes: stat?.size ?? 0,
    approximateBytes: LOCAL_QWEN_MODEL.approximateBytes,
    gpu: activeContext?.gpu ?? false,
    acceleratorMessage: activeContext
      ? activeContext.gpu
        ? '已使用设备加速后端'
        : activeContext.reasonNoGPU || '当前使用 CPU 兼容模式'
      : '模型尚未加载',
  };
}

export async function downloadLocalModel(
  onProgress?: (progress: LocalModelProgress) => void,
): Promise<LocalModelStatus> {
  if (activeDownloadJobId !== null) {
    throw new Error('模型正在下载，请勿重复开始');
  }

  await RNFS.mkdir(MODEL_DIRECTORY);
  if (await RNFS.exists(PARTIAL_MODEL_PATH)) {
    await RNFS.unlink(PARTIAL_MODEL_PATH);
  }

  const task = RNFS.downloadFile({
    fromUrl: LOCAL_QWEN_MODEL.downloadUrl,
    toFile: PARTIAL_MODEL_PATH,
    progressInterval: 250,
    progressDivider: 1,
    connectionTimeout: 30000,
    readTimeout: 120000,
    begin: result => {
      onProgress?.({
        bytesWritten: 0,
        contentLength: result.contentLength,
        progress: 0,
      });
    },
    progress: result => {
      onProgress?.({
        bytesWritten: result.bytesWritten,
        contentLength: result.contentLength,
        progress: asPercent(result.bytesWritten, result.contentLength),
      });
    },
  });

  activeDownloadJobId = task.jobId;
  try {
    const result = await task.promise;
    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(`模型下载失败：HTTP ${result.statusCode}`);
    }

    const stat = await RNFS.stat(PARTIAL_MODEL_PATH);
    if (stat.size < MIN_VALID_MODEL_BYTES) {
      throw new Error('模型文件大小异常，可能下载不完整');
    }

    if (await RNFS.exists(MODEL_PATH)) {
      await RNFS.unlink(MODEL_PATH);
    }
    await RNFS.moveFile(PARTIAL_MODEL_PATH, MODEL_PATH);
    await loadLlamaModelInfo(MODEL_PATH);
    return getLocalModelStatus();
  } catch (error) {
    if (await RNFS.exists(PARTIAL_MODEL_PATH)) {
      await RNFS.unlink(PARTIAL_MODEL_PATH);
    }
    throw error;
  } finally {
    activeDownloadJobId = null;
  }
}

export function cancelLocalModelDownload(): void {
  if (activeDownloadJobId === null) return;
  RNFS.stopDownload(activeDownloadJobId);
  activeDownloadJobId = null;
}

export async function releaseLocalModel(): Promise<void> {
  if (!activeContext) return;
  const context = activeContext;
  activeContext = null;
  activeContextKey = '';
  await context.release();
}

export async function deleteLocalModel(): Promise<void> {
  cancelLocalModelDownload();
  await releaseLocalModel();
  if (await RNFS.exists(PARTIAL_MODEL_PATH)) {
    await RNFS.unlink(PARTIAL_MODEL_PATH);
  }
  if (await RNFS.exists(MODEL_PATH)) {
    await RNFS.unlink(MODEL_PATH);
  }
}

export async function loadLocalModel(
  settings: AppSettings,
  onProgress?: (progress: number) => void,
): Promise<LocalModelStatus> {
  if (!(await RNFS.exists(MODEL_PATH))) {
    throw new Error('尚未下载本地 Qwen 模型');
  }

  const contextKey = buildContextKey(settings);
  if (activeContext && activeContextKey === contextKey) {
    return getLocalModelStatus();
  }

  await releaseLocalModel();
  activeContext = await initLlama(
    {
      model: MODEL_PATH,
      n_ctx: settings.localModelContextSize,
      n_batch: 256,
      n_threads: 4,
      n_gpu_layers: settings.localModelGpuLayers,
      use_mlock: false,
      flash_attn_type: 'auto',
    },
    onProgress,
  );
  activeContextKey = contextKey;
  return getLocalModelStatus();
}

async function completeWithMessages(
  context: LlamaContext,
  messages: NativeChatMessage[],
  nPredict: number,
): Promise<string> {
  const result = await context.completion({
    messages: messages as any,
    chat_template_kwargs: {
      enable_thinking: false,
    },
    n_predict: nPredict,
    temperature: 0.1,
    top_k: 20,
    top_p: 0.9,
    stop: STOP_WORDS,
  });
  return result.text ?? '';
}

async function completeWithManualPrompt(
  context: LlamaContext,
  messages: NativeChatMessage[],
  nPredict: number,
): Promise<string> {
  const result = await context.completion({
    prompt: buildManualChatPrompt(messages),
    n_predict: nPredict,
    temperature: 0.1,
    top_k: 20,
    top_p: 0.9,
    stop: STOP_WORDS,
  });
  return result.text ?? '';
}

async function runCompletionWithFallback(
  settings: AppSettings,
  messages: NativeChatMessage[],
  nPredict: number,
): Promise<string> {
  await loadLocalModel(settings);
  const context = activeContext;
  if (!context) throw new Error('本地模型加载失败');

  try {
    const output = await completeWithMessages(context, messages, nPredict);
    if (!output.trim()) throw new Error('聊天模板推理返回空文本');
    return output;
  } catch (chatError) {
    const chatMessage = getErrorMessage(chatError);
    try {
      await releaseLocalModel();
      await loadLocalModel(settings);
      const fallbackContext = activeContext;
      if (!fallbackContext) throw new Error('重新创建模型上下文后仍为空');
      const output = await completeWithManualPrompt(fallbackContext, messages, nPredict);
      if (!output.trim()) throw new Error('纯文本回退推理返回空文本');
      return output;
    } catch (fallbackError) {
      throw new Error(
        `本地推理两种路径均失败。聊天模板路径：${chatMessage}；纯文本 ChatML 回退：${getErrorMessage(
          fallbackError,
        )}`,
      );
    }
  }
}

export async function organizeTextLocally(
  text: string,
  settings: AppSettings,
  suppliedProjects?: ProjectItem[],
): Promise<LlmOrganizeResult> {
  const projects = suppliedProjects ?? (await listProjects());
  const messages: NativeChatMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt(settings.systemPrompt, undefined, projects),
    },
    {
      role: 'user',
      content: buildUserPrompt(text),
    },
  ];
  const output = await runCompletionWithFallback(settings, messages, 640);
  return parseLocalResult(output);
}

export async function chatWithLocalModel(
  text: string,
  history: LocalChatMessage[],
  settings: AppSettings,
): Promise<LocalChatResult> {
  const normalized = text.trim();
  if (!normalized) throw new Error('请输入对话内容');

  const projects = await listProjects();
  const projectPrompt = buildLocalProjectPrompt(projects);
  const recentHistory = history.slice(-6);
  const messages: NativeChatMessage[] = [
    {
      role: 'system',
      content: buildLocalChatSystemPrompt(projectPrompt),
    },
    ...recentHistory.map(message => ({
      role: message.role,
      content: message.content,
    })),
    {
      role: 'user',
      content: normalized,
    },
  ];

  const output = await runCompletionWithFallback(settings, messages, 384);
  const parsed = parseLocalChatOutput(output);
  const codeMap = new Map(projectPrompt.requirements.map(requirement => [requirement.code, requirement]));
  const modelRequirementIds = parsed.codes
    .map(code => codeMap.get(code))
    .filter((requirement): requirement is RequirementReference => Boolean(requirement && !requirement.done))
    .map(requirement => requirement.requirementId);
  const fallbackRequirementIds = findFallbackRequirementIds(normalized, projectPrompt.requirements);
  const requestedRequirementIds = [...new Set([...modelRequirementIds, ...fallbackRequirementIds])];
  const completedRequirements = await completeProjectRequirements(requestedRequirementIds);

  return {
    reply: parsed.reply,
    completedRequirements,
  };
}

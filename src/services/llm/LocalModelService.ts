import RNFS from 'react-native-fs';
import { initLlama, loadLlamaModelInfo, type LlamaContext } from 'llama.rn';
import type { AppSettings } from '../../types/settings';
import type { LlmOrganizeResult } from '../../types/llm';
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

function buildManualChatPrompt(systemPrompt: string, userPrompt: string): string {
  return [
    '<|im_start|>system',
    systemPrompt,
    '<|im_end|>',
    '<|im_start|>user',
    userPrompt,
    '<|im_end|>',
    '<|im_start|>assistant',
    '<think>',
    '',
    '</think>',
    '',
  ].join('\n');
}

function parseLocalResult(text: string): LlmOrganizeResult {
  try {
    return parseAndValidateLlmJson(text);
  } catch (error) {
    const preview = text.trim().slice(0, 1200) || '(空输出)';
    throw new Error(`本地模型输出无法解析：${getErrorMessage(error)}\n原始输出预览：${preview}`);
  }
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
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const result = await context.completion({
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    chat_template_kwargs: {
      enable_thinking: false,
    },
    n_predict: 640,
    temperature: 0.1,
    top_k: 20,
    top_p: 0.9,
    stop: STOP_WORDS,
  });
  return result.text ?? '';
}

async function completeWithManualPrompt(
  context: LlamaContext,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const result = await context.completion({
    prompt: buildManualChatPrompt(systemPrompt, userPrompt),
    n_predict: 640,
    temperature: 0.1,
    top_k: 20,
    top_p: 0.9,
    stop: STOP_WORDS,
  });
  return result.text ?? '';
}

export async function organizeTextLocally(
  text: string,
  settings: AppSettings,
): Promise<LlmOrganizeResult> {
  await loadLocalModel(settings);
  const context = activeContext;
  if (!context) {
    throw new Error('本地模型加载失败');
  }

  const systemPrompt = buildSystemPrompt(settings.systemPrompt);
  const userPrompt = buildUserPrompt(text);

  try {
    const output = await completeWithMessages(context, systemPrompt, userPrompt);
    if (!output.trim()) {
      throw new Error('聊天模板推理返回空文本');
    }
    return parseLocalResult(output);
  } catch (chatError) {
    const chatMessage = getErrorMessage(chatError);

    try {
      // A native completion failure may leave the current llama.cpp context unusable.
      // Recreate it before the plain-text fallback instead of reusing damaged KV state.
      await releaseLocalModel();
      await loadLocalModel(settings);
      const fallbackContext = activeContext;
      if (!fallbackContext) {
        throw new Error('重新创建模型上下文后仍为空');
      }

      const output = await completeWithManualPrompt(fallbackContext, systemPrompt, userPrompt);
      if (!output.trim()) {
        throw new Error('纯文本回退推理返回空文本');
      }
      return parseLocalResult(output);
    } catch (fallbackError) {
      throw new Error(
        `本地推理两种路径均失败。聊天模板路径：${chatMessage}；纯文本 ChatML 回退：${getErrorMessage(
          fallbackError,
        )}`,
      );
    }
  }
}

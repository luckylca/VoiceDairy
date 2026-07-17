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

const ORGANIZE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'items'],
  properties: {
    summary: { type: 'string' },
    items: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'type',
          'title',
          'content',
          'datetime',
          'due_date',
          'priority',
          'tags',
          'project',
          'confidence',
        ],
        properties: {
          type: { type: 'string', enum: ['idea', 'todo', 'project', 'reminder'] },
          title: { type: 'string' },
          content: { type: 'string' },
          datetime: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          due_date: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          priority: { type: 'string', enum: ['low', 'normal', 'high'] },
          tags: { type: 'array', items: { type: 'string' }, maxItems: 8 },
          project: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  },
} as const;

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
      n_threads_batch: 4,
      n_gpu_layers: settings.localModelGpuLayers,
      use_mlock: false,
      flash_attn_type: 'auto',
    },
    onProgress,
  );
  activeContextKey = contextKey;
  return getLocalModelStatus();
}

export async function organizeTextLocally(
  text: string,
  settings: AppSettings,
): Promise<LlmOrganizeResult> {
  await loadLocalModel(settings);
  if (!activeContext) {
    throw new Error('本地模型加载失败');
  }

  await activeContext.clearCache(true);
  const result = await activeContext.completion({
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
    jinja: true,
    force_pure_content: true,
    enable_thinking: false,
    reasoning_format: 'none',
    response_format: {
      type: 'json_schema',
      json_schema: {
        strict: true,
        schema: ORGANIZE_JSON_SCHEMA,
      },
    },
    n_predict: 768,
    temperature: 0.1,
    top_k: 20,
    top_p: 0.9,
    stop: ['<|im_end|>', '<|endoftext|>'],
  });

  if (!result.text?.trim()) {
    throw new Error('本地模型没有返回整理结果');
  }
  return parseAndValidateLlmJson(result.text);
}

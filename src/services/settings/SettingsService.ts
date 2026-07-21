import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AppSettings,
  CloudModelProvider,
  MotionLevel,
  StartupPage,
  VisualStyle,
} from '../../types/settings';
import { DEFAULT_SYSTEM_PROMPT } from '../llm/PromptBuilder';
import { inferCloudModelProvider } from '../llm/CloudModelProviders';

const SETTINGS_KEY = 'voicedairy.settings.v1';
const LEGACY_DEFAULT_CATEGORY_SIGNATURE = 'idea、todo、reminder、note、journal、question、project、unknown';
const listeners = new Set<(settings: AppSettings) => void>();

export const defaultSettings: AppSettings = {
  cloudModelProvider: 'openai',
  apiBaseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  modelName: 'gpt-4o-mini',
  organizerProvider: 'cloud',
  localModelName: 'Qwen3.5-0.8B-Q4_0',
  localModelContextSize: 2048,
  localModelGpuLayers: 0,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  themeMode: 'system',
  colorSeed: '#6750A4',
  visualStyle: 'classic',
  motionLevel: 'standard',
  startupPage: 'quick_record',
  autoOrganizeAfterRecognition: false,
  agentAutoSendVoice: false,
  dailyPlanEnabled: false,
  dailyPlanTime: '08:00',
  dailyReviewEnabled: false,
  dailyReviewTime: '21:30',
  persistentQuickRecordNotification: true,
  conflictDetectionEnabled: true,
};

function normalizeVisualStyle(value: unknown): VisualStyle {
  return value === 'tech' ? 'tech' : 'classic';
}

function normalizeMotionLevel(value: unknown): MotionLevel {
  return value === 'full' || value === 'reduced' || value === 'off' ? value : 'standard';
}

function normalizeStartupPage(value: unknown): StartupPage {
  return value === 'last_page' || value === 'agent' ? value : 'quick_record';
}

function normalizeCloudModelProvider(value: unknown, baseUrl: string): CloudModelProvider {
  const allowed: CloudModelProvider[] = [
    'openai',
    'deepseek',
    'anthropic',
    'minimax',
    'zhipu',
    'moonshot',
    'aliyun',
    'custom',
  ];
  return allowed.includes(value as CloudModelProvider)
    ? (value as CloudModelProvider)
    : inferCloudModelProvider(baseUrl);
}

function normalizeTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return fallback;
  }
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;

  try {
    const saved = JSON.parse(raw) as Partial<AppSettings>;
    const systemPrompt =
      typeof saved.systemPrompt === 'string' &&
      saved.systemPrompt.includes(LEGACY_DEFAULT_CATEGORY_SIGNATURE)
        ? DEFAULT_SYSTEM_PROMPT
        : saved.systemPrompt;
    const apiBaseUrl = typeof saved.apiBaseUrl === 'string' ? saved.apiBaseUrl : defaultSettings.apiBaseUrl;

    return {
      ...defaultSettings,
      ...saved,
      cloudModelProvider: normalizeCloudModelProvider(saved.cloudModelProvider, apiBaseUrl),
      apiBaseUrl,
      organizerProvider: saved.organizerProvider === 'local' ? 'local' : 'cloud',
      localModelContextSize:
        typeof saved.localModelContextSize === 'number' && saved.localModelContextSize >= 1024
          ? saved.localModelContextSize
          : defaultSettings.localModelContextSize,
      localModelGpuLayers:
        typeof saved.localModelGpuLayers === 'number' && saved.localModelGpuLayers >= 0
          ? saved.localModelGpuLayers
          : defaultSettings.localModelGpuLayers,
      systemPrompt: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      visualStyle: normalizeVisualStyle(saved.visualStyle),
      motionLevel: normalizeMotionLevel(saved.motionLevel),
      startupPage: normalizeStartupPage(saved.startupPage),
      autoOrganizeAfterRecognition: saved.autoOrganizeAfterRecognition === true,
      agentAutoSendVoice: saved.agentAutoSendVoice === true,
      dailyPlanEnabled: saved.dailyPlanEnabled === true,
      dailyPlanTime: normalizeTime(saved.dailyPlanTime, defaultSettings.dailyPlanTime),
      dailyReviewEnabled: saved.dailyReviewEnabled === true,
      dailyReviewTime: normalizeTime(saved.dailyReviewTime, defaultSettings.dailyReviewTime),
      persistentQuickRecordNotification: saved.persistentQuickRecordNotification !== false,
      conflictDetectionEnabled: saved.conflictDetectionEnabled !== false,
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  listeners.forEach(listener => listener(settings));
}

export function subscribeSettings(listener: (settings: AppSettings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
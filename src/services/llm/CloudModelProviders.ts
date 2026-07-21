import type { AppSettings, CloudModelProvider } from '../../types/settings';

export type CloudApiProtocol = 'openai' | 'anthropic';

export type CloudModelProviderPreset = {
  id: CloudModelProvider;
  label: string;
  shortLabel: string;
  baseUrl: string;
  protocol: CloudApiProtocol;
  suggestedModel: string;
  description: string;
  jsonMode: boolean;
};

export const CLOUD_MODEL_PROVIDERS: CloudModelProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    shortLabel: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    protocol: 'openai',
    suggestedModel: 'gpt-4o-mini',
    description: 'OpenAI 官方接口',
    jsonMode: true,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    shortLabel: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    protocol: 'openai',
    suggestedModel: 'deepseek-v4-flash',
    description: 'DeepSeek OpenAI 兼容接口',
    jsonMode: true,
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    shortLabel: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    protocol: 'anthropic',
    suggestedModel: 'claude-sonnet-4-20250514',
    description: 'Anthropic Messages API',
    jsonMode: false,
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    shortLabel: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/v1',
    protocol: 'openai',
    suggestedModel: 'MiniMax-M2.7',
    description: 'MiniMax OpenAI 兼容接口',
    jsonMode: false,
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    shortLabel: 'GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    protocol: 'openai',
    suggestedModel: 'glm-5-turbo',
    description: '智谱 OpenAI 兼容接口',
    jsonMode: true,
  },
  {
    id: 'moonshot',
    label: 'Moonshot Kimi',
    shortLabel: 'Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    protocol: 'openai',
    suggestedModel: 'moonshot-v1-8k',
    description: 'Moonshot OpenAI 兼容接口',
    jsonMode: true,
  },
  {
    id: 'aliyun',
    label: '阿里云百炼',
    shortLabel: '百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    protocol: 'openai',
    suggestedModel: 'qwen-plus',
    description: '百炼北京共享域名',
    jsonMode: true,
  },
  {
    id: 'custom',
    label: '自定义兼容接口',
    shortLabel: '自定义',
    baseUrl: '',
    protocol: 'openai',
    suggestedModel: '',
    description: '填写自己的 OpenAI 兼容 Base URL',
    jsonMode: true,
  },
];

export function getCloudProviderPreset(provider: CloudModelProvider): CloudModelProviderPreset {
  return CLOUD_MODEL_PROVIDERS.find(item => item.id === provider) ?? CLOUD_MODEL_PROVIDERS[0];
}

export function resolveCloudBaseUrl(settings: AppSettings): string {
  const preset = getCloudProviderPreset(settings.cloudModelProvider);
  return (preset.id === 'custom' ? settings.apiBaseUrl : preset.baseUrl).trim();
}

export function inferCloudModelProvider(baseUrl: string): CloudModelProvider {
  const value = baseUrl.toLowerCase();
  if (value.includes('api.openai.com')) return 'openai';
  if (value.includes('deepseek.com')) return 'deepseek';
  if (value.includes('anthropic.com')) return 'anthropic';
  if (value.includes('minimaxi.com') || value.includes('minimax.io')) return 'minimax';
  if (value.includes('bigmodel.cn')) return 'zhipu';
  if (value.includes('moonshot.cn')) return 'moonshot';
  if (value.includes('dashscope') || value.includes('maas.aliyuncs.com')) return 'aliyun';
  return 'custom';
}

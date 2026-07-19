export type ThemeMode = 'system' | 'light' | 'dark';
export type OrganizerProvider = 'cloud' | 'local';
export type VisualStyle = 'classic' | 'tech';
export type MotionLevel = 'full' | 'standard' | 'reduced' | 'off';
export type StartupPage = 'quick_record' | 'last_page' | 'agent';

export type AppSettings = {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  organizerProvider: OrganizerProvider;
  localModelName: string;
  localModelContextSize: number;
  localModelGpuLayers: number;
  systemPrompt: string;
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  themeMode: ThemeMode;
  colorSeed: string;
  visualStyle: VisualStyle;
  motionLevel: MotionLevel;
  startupPage: StartupPage;
  autoOrganizeAfterRecognition: boolean;
  agentAutoSendVoice: boolean;
};

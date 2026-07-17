export type ThemeMode = 'system' | 'light' | 'dark';
export type OrganizerProvider = 'cloud' | 'local';

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
};

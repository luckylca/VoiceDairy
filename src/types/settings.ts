export type ThemeMode = 'system' | 'light' | 'dark';

export type AppSettings = {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  systemPrompt: string;
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  asrModelPath?: string;
  themeMode: ThemeMode;
  colorSeed: string;
};

import type { ConfigurableCategoryType } from '../types/category';
import type { DailyAgentMode } from '../types/dailyAgent';

export type RootTabParamList = {
  Record: undefined;
  Timeline: undefined;
  Agent: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  VoiceInput: undefined;
  DailyAgent: { mode?: DailyAgentMode } | undefined;
  PromptSettings: undefined;
  LocalModelSettings: undefined;
  LocalModelChat: undefined;
  DeveloperOptions: undefined;
  About: undefined;
  CategorySettings: undefined;
  ProjectSettings: undefined;
  ProjectDetail: { projectId: string };
  EntryDetail: { entryId: string };
  CategoryEntries: { type: ConfigurableCategoryType };
};
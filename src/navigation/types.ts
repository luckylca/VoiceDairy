import type { ConfigurableCategoryType } from '../types/category';

export type RootTabParamList = {
  Home: undefined;
  Category: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  VoiceInput: undefined;
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

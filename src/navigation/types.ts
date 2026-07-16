import type { EntryType } from '../types/entry';

export type RootTabParamList = {
  Home: undefined;
  Category: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  VoiceInput: undefined;
  PromptSettings: undefined;
  EntryDetail: { entryId: string };
  CategoryEntries: { type: EntryType };
};

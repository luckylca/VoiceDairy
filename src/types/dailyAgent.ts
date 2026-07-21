export type DailyAgentMode = 'plan' | 'review';

export type DailyAgentSection = {
  title: string;
  items: string[];
};

export type DailyAgentResult = {
  mode: DailyAgentMode;
  date: string;
  title: string;
  overview: string;
  sections: DailyAgentSection[];
  risks: string[];
  nextAction: string;
  generatedAt: string;
  modelName: string;
};
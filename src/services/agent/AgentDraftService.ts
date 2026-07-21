import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LlmOrganizeResult } from '../../types/llm';

const AGENT_DRAFT_KEY = 'voicediary.agent.draft.v1';

type AgentDraft = {
  rawText: string;
  organizedResult?: LlmOrganizeResult | null;
  createdAt: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

export async function saveAgentDraft(draft: AgentDraft): Promise<void> {
  await AsyncStorage.setItem(AGENT_DRAFT_KEY, JSON.stringify(draft));
  listeners.forEach(listener => listener());
}

export async function consumeAgentDraft(): Promise<AgentDraft | null> {
  const raw = await AsyncStorage.getItem(AGENT_DRAFT_KEY);
  if (!raw) return null;

  await AsyncStorage.removeItem(AGENT_DRAFT_KEY);
  try {
    return JSON.parse(raw) as AgentDraft;
  } catch {
    return null;
  }
}

export function subscribeAgentDraft(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

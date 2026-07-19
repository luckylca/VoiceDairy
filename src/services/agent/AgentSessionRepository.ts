import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AgentMessage } from '../../types/agent';

const CURRENT_AGENT_SESSION_KEY = 'voicediary.agent.current-session.v1';

export async function loadCurrentAgentSession(): Promise<AgentMessage[]> {
  const raw = await AsyncStorage.getItem(CURRENT_AGENT_SESSION_KEY);
  if (!raw) return [];
  try {
    const messages = JSON.parse(raw) as AgentMessage[];
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
}

export async function saveCurrentAgentSession(messages: AgentMessage[]): Promise<void> {
  await AsyncStorage.setItem(CURRENT_AGENT_SESSION_KEY, JSON.stringify(messages.slice(-100)));
}

export async function clearCurrentAgentSession(): Promise<void> {
  await AsyncStorage.removeItem(CURRENT_AGENT_SESSION_KEY);
}

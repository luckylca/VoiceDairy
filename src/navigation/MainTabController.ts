export type MainTabName = 'record' | 'timeline' | 'agent' | 'settings';

type Listener = (tab: MainTabName) => void;

const listeners = new Set<Listener>();

export function openMainTab(tab: MainTabName): void {
  listeners.forEach(listener => listener(tab));
}

export function subscribeMainTab(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

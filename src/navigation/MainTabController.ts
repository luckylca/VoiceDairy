export type MainTabName = 'record' | 'timeline' | 'agent' | 'settings';

type Listener = (tab: MainTabName) => void;

const listeners = new Set<Listener>();
let pendingTab: MainTabName | null = null;

export function openMainTab(tab: MainTabName): void {
  pendingTab = tab;
  listeners.forEach(listener => listener(tab));
}

export function subscribeMainTab(listener: Listener): () => void {
  listeners.add(listener);
  if (pendingTab) {
    const tab = pendingTab;
    pendingTab = null;
    listener(tab);
  }
  return () => listeners.delete(listener);
}
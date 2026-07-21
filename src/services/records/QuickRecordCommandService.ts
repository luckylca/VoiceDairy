type Listener = () => void;

const listeners = new Set<Listener>();
let pendingStart = false;

export function requestQuickRecordStart(): void {
  pendingStart = true;
  listeners.forEach(listener => listener());
}

export function consumeQuickRecordStart(): boolean {
  if (!pendingStart) return false;
  pendingStart = false;
  return true;
}

export function subscribeQuickRecordStart(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
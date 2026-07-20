import { AppState, type NativeEventSubscription } from 'react-native';
import { useEffect, useState } from 'react';

type Subscriber = {
  listener: (elapsedMs: number) => void;
  minIntervalMs: number;
  lastEmitMs: number;
};

type MotionClockStore = {
  subscribers: Set<Subscriber>;
  frameHandle: number | null;
  startedAt: number;
  appActive: boolean;
  appStateSubscription: NativeEventSubscription | null;
};

type MotionClockGlobal = typeof globalThis & {
  __VOICE_DIARY_TECH_MOTION_CLOCK__?: MotionClockStore;
};

const globalClock = globalThis as MotionClockGlobal;
const existingStore = globalClock.__VOICE_DIARY_TECH_MOTION_CLOCK__;
if (existingStore) {
  existingStore.subscribers.clear();
  if (existingStore.frameHandle !== null) {
    cancelAnimationFrame(existingStore.frameHandle);
    existingStore.frameHandle = null;
  }
}

const store: MotionClockStore =
  existingStore ?? {
    subscribers: new Set<Subscriber>(),
    frameHandle: null,
    startedAt: Date.now(),
    appActive: AppState.currentState === 'active',
    appStateSubscription: null,
  };
store.startedAt = Date.now();
globalClock.__VOICE_DIARY_TECH_MOTION_CLOCK__ = store;

function stopClock() {
  if (store.frameHandle !== null) {
    cancelAnimationFrame(store.frameHandle);
    store.frameHandle = null;
  }
}

function scheduleClock() {
  if (!store.appActive || store.subscribers.size === 0 || store.frameHandle !== null) return;
  store.frameHandle = requestAnimationFrame(tick);
}

function tick() {
  store.frameHandle = null;
  if (!store.appActive || store.subscribers.size === 0) return;

  const now = Date.now();
  const elapsedMs = now - store.startedAt;
  store.subscribers.forEach(subscriber => {
    if (now - subscriber.lastEmitMs >= subscriber.minIntervalMs) {
      subscriber.lastEmitMs = now;
      subscriber.listener(elapsedMs);
    }
  });
  scheduleClock();
}

if (!store.appStateSubscription) {
  store.appStateSubscription = AppState.addEventListener('change', state => {
    store.appActive = state === 'active';
    if (!store.appActive) stopClock();
    else {
      store.startedAt = Date.now();
      scheduleClock();
    }
  });
}

function subscribeMotionClock(listener: (elapsedMs: number) => void, fps: number): () => void {
  const subscriber: Subscriber = {
    listener,
    minIntervalMs: 1000 / Math.max(1, fps),
    lastEmitMs: 0,
  };
  store.subscribers.add(subscriber);
  scheduleClock();

  return () => {
    store.subscribers.delete(subscriber);
    if (store.subscribers.size === 0) stopClock();
  };
}

export function useTechMotionPhase(
  enabled: boolean,
  fps: number,
  periodMs: number,
): number {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setPhase(0);
      return;
    }

    return subscribeMotionClock(elapsedMs => {
      setPhase((elapsedMs % periodMs) / periodMs);
    }, fps);
  }, [enabled, fps, periodMs]);

  return phase;
}

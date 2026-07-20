import { AppState } from 'react-native';
import { useEffect, useState } from 'react';

type Subscriber = {
  listener: (elapsedMs: number) => void;
  minIntervalMs: number;
  lastEmitMs: number;
};

const subscribers = new Set<Subscriber>();
let frameHandle: number | null = null;
let startedAt = Date.now();
let appActive = AppState.currentState === 'active';

function stopClock() {
  if (frameHandle !== null) {
    cancelAnimationFrame(frameHandle);
    frameHandle = null;
  }
}

function scheduleClock() {
  if (!appActive || subscribers.size === 0 || frameHandle !== null) return;
  frameHandle = requestAnimationFrame(tick);
}

function tick() {
  frameHandle = null;
  if (!appActive || subscribers.size === 0) return;

  const now = Date.now();
  const elapsedMs = now - startedAt;
  subscribers.forEach(subscriber => {
    if (now - subscriber.lastEmitMs >= subscriber.minIntervalMs) {
      subscriber.lastEmitMs = now;
      subscriber.listener(elapsedMs);
    }
  });
  scheduleClock();
}

AppState.addEventListener('change', state => {
  appActive = state === 'active';
  if (!appActive) stopClock();
  else {
    startedAt = Date.now();
    scheduleClock();
  }
});

function subscribeMotionClock(listener: (elapsedMs: number) => void, fps: number): () => void {
  const subscriber: Subscriber = {
    listener,
    minIntervalMs: 1000 / Math.max(1, fps),
    lastEmitMs: 0,
  };
  subscribers.add(subscriber);
  scheduleClock();

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) stopClock();
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

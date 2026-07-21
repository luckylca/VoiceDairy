import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, AppState } from 'react-native';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import {
  getAsrActivity,
  subscribeAsrActivity,
  type AsrActivity,
} from '../../services/asr/AsrService';

type TechMotionContextValue = {
  phase: Animated.Value;
  running: boolean;
};

const TechMotionContext = createContext<TechMotionContextValue | null>(null);

export function TechMotionProvider({ children }: { children: React.ReactNode }) {
  const { isTech, motion, motionLevel } = useVisualStyle();
  const phase = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [asrActivity, setAsrActivity] = useState<AsrActivity>(getAsrActivity());

  const running = isTech && motion.ambient && appActive && asrActivity === 'idle';

  useEffect(() => {
    const appSubscription = AppState.addEventListener('change', state => {
      setAppActive(state === 'active');
    });
    const asrSubscription = subscribeAsrActivity(setAsrActivity);
    return () => {
      appSubscription.remove();
      asrSubscription();
    };
  }, []);

  useEffect(() => {
    animationRef.current?.stop();
    animationRef.current = null;
    phase.setValue(0);

    if (!running) return;

    const duration = motionLevel === 'full' ? 11000 : 14500;
    const loop = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration,
        useNativeDriver: true,
        isInteraction: false,
      }),
      { resetBeforeIteration: true },
    );
    animationRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
      if (animationRef.current === loop) animationRef.current = null;
    };
  }, [motionLevel, phase, running]);

  return (
    <TechMotionContext.Provider value={{ phase, running }}>
      {children}
    </TechMotionContext.Provider>
  );
}

export function useTechMotionValue(): TechMotionContextValue {
  const context = useContext(TechMotionContext);
  if (!context) {
    throw new Error('useTechMotionValue must be used inside TechMotionProvider');
  }
  return context;
}

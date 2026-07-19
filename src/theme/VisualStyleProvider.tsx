import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { MotionLevel, VisualStyle } from '../types/settings';
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  subscribeSettings,
} from '../services/settings/SettingsService';

type VisualStyleContextValue = {
  visualStyle: VisualStyle;
  motionLevel: MotionLevel;
  isTech: boolean;
  reduceMotion: boolean;
  setVisualStyle: (style: VisualStyle) => Promise<void>;
  setMotionLevel: (level: MotionLevel) => Promise<void>;
};

const VisualStyleContext = createContext<VisualStyleContextValue | null>(null);

export function VisualStyleProvider({ children }: { children: React.ReactNode }) {
  const [visualStyle, setVisualStyleState] = useState<VisualStyle>(defaultSettings.visualStyle);
  const [motionLevel, setMotionLevelState] = useState<MotionLevel>(defaultSettings.motionLevel);

  useEffect(() => {
    loadSettings().then(settings => {
      setVisualStyleState(settings.visualStyle);
      setMotionLevelState(settings.motionLevel);
    });

    return subscribeSettings(settings => {
      setVisualStyleState(settings.visualStyle);
      setMotionLevelState(settings.motionLevel);
    });
  }, []);

  const persist = useCallback(async (patch: Partial<{ visualStyle: VisualStyle; motionLevel: MotionLevel }>) => {
    const current = await loadSettings();
    await saveSettings({ ...current, ...patch });
  }, []);

  const setVisualStyle = useCallback(
    async (style: VisualStyle) => {
      setVisualStyleState(style);
      await persist({ visualStyle: style });
    },
    [persist],
  );

  const setMotionLevel = useCallback(
    async (level: MotionLevel) => {
      setMotionLevelState(level);
      await persist({ motionLevel: level });
    },
    [persist],
  );

  const value = useMemo<VisualStyleContextValue>(
    () => ({
      visualStyle,
      motionLevel,
      isTech: visualStyle === 'tech',
      reduceMotion: motionLevel === 'reduced' || motionLevel === 'off',
      setVisualStyle,
      setMotionLevel,
    }),
    [motionLevel, setMotionLevel, setVisualStyle, visualStyle],
  );

  return <VisualStyleContext.Provider value={value}>{children}</VisualStyleContext.Provider>;
}

export function useVisualStyle(): VisualStyleContextValue {
  const context = useContext(VisualStyleContext);
  if (!context) {
    throw new Error('useVisualStyle must be used inside VisualStyleProvider');
  }
  return context;
}

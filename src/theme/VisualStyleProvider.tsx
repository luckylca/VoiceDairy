import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { MotionLevel, VisualStyle } from '../types/settings';
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  subscribeSettings,
} from '../services/settings/SettingsService';

export type MotionProfile = {
  ambient: boolean;
  decorative: boolean;
  entrances: boolean;
  pressFeedback: boolean;
  particleCount: number;
  durationScale: number;
  staggerMs: number;
  intensity: number;
};

const MOTION_PROFILES: Record<MotionLevel, MotionProfile> = {
  full: {
    ambient: true,
    decorative: true,
    entrances: true,
    pressFeedback: true,
    particleCount: 16,
    durationScale: 1,
    staggerMs: 38,
    intensity: 0.86,
  },
  standard: {
    ambient: true,
    decorative: true,
    entrances: true,
    pressFeedback: true,
    particleCount: 8,
    durationScale: 0.82,
    staggerMs: 22,
    intensity: 0.58,
  },
  reduced: {
    ambient: false,
    decorative: false,
    entrances: true,
    pressFeedback: false,
    particleCount: 0,
    durationScale: 0.38,
    staggerMs: 0,
    intensity: 0.18,
  },
  off: {
    ambient: false,
    decorative: false,
    entrances: false,
    pressFeedback: false,
    particleCount: 0,
    durationScale: 0,
    staggerMs: 0,
    intensity: 0,
  },
};

type VisualStyleContextValue = {
  visualStyle: VisualStyle;
  motionLevel: MotionLevel;
  motion: MotionProfile;
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

  const motion = useMemo(() => MOTION_PROFILES[motionLevel], [motionLevel]);

  const value = useMemo<VisualStyleContextValue>(
    () => ({
      visualStyle,
      motionLevel,
      motion,
      isTech: visualStyle === 'tech',
      reduceMotion: motionLevel === 'reduced' || motionLevel === 'off',
      setVisualStyle,
      setMotionLevel,
    }),
    [motion, motionLevel, setMotionLevel, setVisualStyle, visualStyle],
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

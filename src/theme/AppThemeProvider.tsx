import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider, type MD3Theme } from 'react-native-paper';
import type { ThemeMode } from '../types/settings';
import { defaultSettings, loadSettings, saveSettings, subscribeSettings } from '../services/settings/SettingsService';
import { useVisualStyle } from './VisualStyleProvider';
import { techTokens } from './tech/tokens';

type ThemeColors = {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
};

export type ThemePreset = {
  label: string;
  seed: string;
  light: ThemeColors;
  dark: ThemeColors;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    label: '紫罗兰', seed: '#6750A4',
    light: { primary: '#6750A4', onPrimary: '#FFFFFF', primaryContainer: '#EADDFF', onPrimaryContainer: '#21005D', secondary: '#625B71', secondaryContainer: '#E8DEF8', onSecondaryContainer: '#1D192B' },
    dark: { primary: '#D0BCFF', onPrimary: '#381E72', primaryContainer: '#4F378B', onPrimaryContainer: '#EADDFF', secondary: '#CCC2DC', secondaryContainer: '#4A4458', onSecondaryContainer: '#E8DEF8' },
  },
  {
    label: '海洋蓝', seed: '#0061A4',
    light: { primary: '#0061A4', onPrimary: '#FFFFFF', primaryContainer: '#D1E4FF', onPrimaryContainer: '#001D36', secondary: '#535F70', secondaryContainer: '#D7E3F7', onSecondaryContainer: '#101C2B' },
    dark: { primary: '#9ECAFF', onPrimary: '#003258', primaryContainer: '#00497D', onPrimaryContainer: '#D1E4FF', secondary: '#BBC7DB', secondaryContainer: '#3B4858', onSecondaryContainer: '#D7E3F7' },
  },
  {
    label: '森林绿', seed: '#006E2F',
    light: { primary: '#006E2F', onPrimary: '#FFFFFF', primaryContainer: '#9AF6AA', onPrimaryContainer: '#00210B', secondary: '#506352', secondaryContainer: '#D2E8D2', onSecondaryContainer: '#0E1F12' },
    dark: { primary: '#7DDA90', onPrimary: '#003916', primaryContainer: '#005323', onPrimaryContainer: '#9AF6AA', secondary: '#B6CCB7', secondaryContainer: '#384B3B', onSecondaryContainer: '#D2E8D2' },
  },
  {
    label: '日落橙', seed: '#8C5000',
    light: { primary: '#8C5000', onPrimary: '#FFFFFF', primaryContainer: '#FFDCC2', onPrimaryContainer: '#2D1600', secondary: '#725A42', secondaryContainer: '#FEDDBF', onSecondaryContainer: '#291806' },
    dark: { primary: '#FFB873', onPrimary: '#4A2800', primaryContainer: '#6A3B00', onPrimaryContainer: '#FFDCC2', secondary: '#E1C1A4', secondaryContainer: '#59432D', onSecondaryContainer: '#FEDDBF' },
  },
  {
    label: '玫瑰粉', seed: '#984061',
    light: { primary: '#984061', onPrimary: '#FFFFFF', primaryContainer: '#FFD9E2', onPrimaryContainer: '#3E001D', secondary: '#74565F', secondaryContainer: '#FFD9E2', onSecondaryContainer: '#2B151C' },
    dark: { primary: '#FFB1C8', onPrimary: '#5E1133', primaryContainer: '#7B2949', onPrimaryContainer: '#FFD9E2', secondary: '#E3BDC6', secondaryContainer: '#5B3F47', onSecondaryContainer: '#FFD9E2' },
  },
];

type AppThemeContextValue = {
  theme: MD3Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  colorSeed: string;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setColorSeed: (seed: string) => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function findPreset(seed: string): ThemePreset {
  return THEME_PRESETS.find(item => item.seed.toLowerCase() === seed.toLowerCase()) ?? THEME_PRESETS[0];
}

function buildTechPaperTheme(): MD3Theme {
  return {
    ...MD3DarkTheme,
    roundness: 2,
    colors: {
      ...MD3DarkTheme.colors,
      primary: techTokens.colors.primary,
      onPrimary: techTokens.colors.backgroundDeep,
      primaryContainer: '#103746',
      onPrimaryContainer: '#C9F4FF',
      secondary: techTokens.colors.secondary,
      onSecondary: '#09051D',
      secondaryContainer: '#27214B',
      onSecondaryContainer: '#E6E0FF',
      tertiary: techTokens.colors.success,
      onTertiary: '#00261B',
      tertiaryContainer: '#0C4032',
      onTertiaryContainer: '#B8FFE7',
      background: 'transparent',
      onBackground: techTokens.colors.text,
      surface: techTokens.colors.surface,
      onSurface: techTokens.colors.text,
      surfaceVariant: techTokens.colors.surfaceRaised,
      onSurfaceVariant: techTokens.colors.textMuted,
      surfaceDisabled: 'rgba(143, 168, 181, 0.12)',
      onSurfaceDisabled: 'rgba(143, 168, 181, 0.38)',
      outline: 'rgba(119, 193, 221, 0.42)',
      outlineVariant: techTokens.colors.line,
      error: techTokens.colors.error,
      onError: '#330007',
      errorContainer: '#55131C',
      onErrorContainer: '#FFD9DC',
      inverseSurface: techTokens.colors.text,
      inverseOnSurface: techTokens.colors.backgroundDeep,
      inversePrimary: techTokens.colors.primaryStrong,
      shadow: '#000000',
      scrim: '#000000',
      backdrop: 'rgba(0, 4, 8, 0.76)',
      elevation: {
        level0: 'transparent', level1: '#0B1923', level2: '#0E202C', level3: '#112733', level4: '#132C3A', level5: '#153241',
      },
    },
  };
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { isTech } = useVisualStyle();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(defaultSettings.themeMode);
  const [colorSeed, setColorSeedState] = useState(defaultSettings.colorSeed);

  useEffect(() => {
    loadSettings().then(settings => {
      setThemeModeState(settings.themeMode);
      setColorSeedState(settings.colorSeed);
    });
    return subscribeSettings(settings => {
      setThemeModeState(settings.themeMode);
      setColorSeedState(settings.colorSeed);
    });
  }, []);

  const classicIsDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  const isDark = isTech || classicIsDark;
  const preset = useMemo(() => findPreset(colorSeed), [colorSeed]);

  const theme = useMemo<MD3Theme>(() => {
    if (isTech) return buildTechPaperTheme();
    const base = classicIsDark ? MD3DarkTheme : MD3LightTheme;
    const selectedColors = classicIsDark ? preset.dark : preset.light;
    return { ...base, roundness: 4, colors: { ...base.colors, ...selectedColors } };
  }, [classicIsDark, isTech, preset]);

  const persistTheme = useCallback(async (patch: { themeMode?: ThemeMode; colorSeed?: string }) => {
    const current = await loadSettings();
    await saveSettings({ ...current, ...patch });
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await persistTheme({ themeMode: mode });
  }, [persistTheme]);

  const setColorSeed = useCallback(async (seed: string) => {
    setColorSeedState(seed);
    await persistTheme({ colorSeed: seed });
  }, [persistTheme]);

  const value = useMemo<AppThemeContextValue>(
    () => ({ theme, isDark, themeMode, colorSeed, setThemeMode, setColorSeed }),
    [theme, isDark, themeMode, colorSeed, setThemeMode, setColorSeed],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeContextValue {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return context;
}

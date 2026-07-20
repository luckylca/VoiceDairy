import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '../navigation/RootNavigator';
import { AppThemeProvider, useAppTheme } from '../theme/AppThemeProvider';
import { VisualStyleProvider, useVisualStyle } from '../theme/VisualStyleProvider';
import { FluidNotificationProvider } from '../notifications/FluidNotificationProvider';
import { TechMotionProvider } from '../components/tech/TechMotionProvider';
import { TechTapEffectsProvider } from '../components/tech/TechTapEffectsProvider';
import { techTokens } from '../theme/tech/tokens';
import { prewarmAsr } from '../services/asr/AsrService';

function AppContent() {
  const { theme, isDark } = useAppTheme();
  const { isTech } = useVisualStyle();

  useEffect(() => {
    const timer = setTimeout(() => {
      void prewarmAsr({ numThreads: 2, language: 'auto' });
    }, 850);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StatusBar
        barStyle={isTech || isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isTech ? techTokens.colors.background : theme.colors.background}
      />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <VisualStyleProvider>
        <AppThemeProvider>
          <TechMotionProvider>
            <TechTapEffectsProvider>
              <FluidNotificationProvider>
                <AppContent />
              </FluidNotificationProvider>
            </TechTapEffectsProvider>
          </TechMotionProvider>
        </AppThemeProvider>
      </VisualStyleProvider>
    </SafeAreaProvider>
  );
}

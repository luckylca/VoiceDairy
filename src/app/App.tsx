import React, { useEffect } from 'react';
import { InteractionManager, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '../navigation/RootNavigator';
import { AppThemeProvider, useAppTheme } from '../theme/AppThemeProvider';
import { VisualStyleProvider, useVisualStyle } from '../theme/VisualStyleProvider';
import { FluidNotificationProvider } from '../notifications/FluidNotificationProvider';
import { techTokens } from '../theme/tech/tokens';
import { prewarmAsr } from '../services/asr/AsrService';

function AppContent() {
  const { theme, isDark } = useAppTheme();
  const { isTech } = useVisualStyle();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      // Delay the CPU-heavy model load until the first navigation/layout work
      // has settled. initAsr is cached, so tapping record reuses this promise.
      timer = setTimeout(() => {
        void prewarmAsr({ numThreads: 2, language: 'auto' });
      }, 650);
    });

    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
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
          <FluidNotificationProvider>
            <AppContent />
          </FluidNotificationProvider>
        </AppThemeProvider>
      </VisualStyleProvider>
    </SafeAreaProvider>
  );
}

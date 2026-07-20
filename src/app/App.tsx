import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
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
    // Do not use InteractionManager here: long-running decorative Animated
    // loops can keep its interaction queue occupied. Native initialization now
    // runs on a low-priority executor, so a short timer is deterministic and
    // does not block the JS/UI threads.
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
          <FluidNotificationProvider>
            <AppContent />
          </FluidNotificationProvider>
        </AppThemeProvider>
      </VisualStyleProvider>
    </SafeAreaProvider>
  );
}

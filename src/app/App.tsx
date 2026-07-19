import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '../navigation/RootNavigator';
import { AppThemeProvider, useAppTheme } from '../theme/AppThemeProvider';
import { VisualStyleProvider, useVisualStyle } from '../theme/VisualStyleProvider';
import { FluidNotificationProvider } from '../notifications/FluidNotificationProvider';
import { techTokens } from '../theme/tech/tokens';

function AppContent() {
  const { theme, isDark } = useAppTheme();
  const { isTech } = useVisualStyle();

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

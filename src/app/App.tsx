import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '../navigation/RootNavigator';
import { AppThemeProvider, useAppTheme } from '../theme/AppThemeProvider';
import { FluidNotificationProvider } from '../notifications/FluidNotificationProvider';

function AppContent() {
  const { theme, isDark } = useAppTheme();

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <FluidNotificationProvider>
          <AppContent />
        </FluidNotificationProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

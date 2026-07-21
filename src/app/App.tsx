import React, { useEffect } from 'react';
import { Linking, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '../navigation/RootNavigator';
import { AppThemeProvider, useAppTheme } from '../theme/AppThemeProvider';
import { VisualStyleProvider, useVisualStyle } from '../theme/VisualStyleProvider';
import { FluidNotificationProvider } from '../notifications/FluidNotificationProvider';
import { TechMotionProvider } from '../components/tech/TechMotionProvider';
import { TechTapEffectsProvider } from '../components/tech/TechTapEffectsProvider';
import { techTokens } from '../theme/tech/tokens';
import { prewarmAsr } from '../services/asr/AsrService';
import { loadSettings, subscribeSettings } from '../services/settings/SettingsService';
import {
  bootstrapDailyNotifications,
  syncDailyNotifications,
} from '../services/notifications/DailyNotificationService';
import { openMainTab } from '../navigation/MainTabController';
import { requestQuickRecordStart } from '../services/records/QuickRecordCommandService';

function handleAppUrl(url: string | null): void {
  if (!url) return;
  if (url.startsWith('voicediary://record')) {
    openMainTab('record');
    if (/[?&]autostart=1(?:&|$)/.test(url)) requestQuickRecordStart();
  }
}

function AppContent() {
  const { theme, isDark } = useAppTheme();
  const { isTech } = useVisualStyle();

  useEffect(() => {
    const asrTimer = setTimeout(() => {
      void prewarmAsr({ numThreads: 2, language: 'auto' });
    }, 850);

    const notificationTimer = setTimeout(() => {
      void loadSettings().then(bootstrapDailyNotifications);
    }, 1200);

    const unsubscribeSettings = subscribeSettings(settings => {
      void syncDailyNotifications(settings, false);
    });

    void Linking.getInitialURL().then(handleAppUrl);
    const linkingSubscription = Linking.addEventListener('url', event => handleAppUrl(event.url));

    return () => {
      clearTimeout(asrTimer);
      clearTimeout(notificationTimer);
      unsubscribeSettings();
      linkingSubscription.remove();
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
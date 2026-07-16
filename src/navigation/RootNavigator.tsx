import React, { useMemo } from 'react';
import { NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabs } from './BottomTabs';
import type { RootStackParamList } from './types';
import { VoiceInputScreen } from '../screens/VoiceInputScreen';
import { PromptSettingsScreen } from '../screens/PromptSettingsScreen';
import { useAppTheme } from '../theme/AppThemeProvider';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { theme, isDark } = useAppTheme();

  const navigationTheme = useMemo<NavigationTheme>(
    () => ({
      dark: isDark,
      colors: {
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.onSurface,
        border: theme.colors.outlineVariant,
        notification: theme.colors.error,
      },
    }),
    [isDark, theme],
  );

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={BottomTabs} options={{ headerShown: false }} />
        <Stack.Screen name="VoiceInput" component={VoiceInputScreen} options={{ title: '新建记录' }} />
        <Stack.Screen name="PromptSettings" component={PromptSettingsScreen} options={{ title: '整理提示词' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

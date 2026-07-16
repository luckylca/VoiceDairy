import React, { useMemo } from 'react';
import { NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabs } from './BottomTabs';
import type { RootStackParamList } from './types';
import { VoiceInputScreen } from '../screens/VoiceInputScreen';
import { PromptSettingsScreen } from '../screens/PromptSettingsScreen';
import { EntryDetailScreen } from '../screens/EntryDetailScreen';
import { CategoryEntriesScreen } from '../screens/CategoryEntriesScreen';
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
          animation: 'slide_from_right',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={BottomTabs} options={{ headerShown: false }} />
        <Stack.Screen name="VoiceInput" component={VoiceInputScreen} options={{ title: '新建记录' }} />
        <Stack.Screen name="PromptSettings" component={PromptSettingsScreen} options={{ title: '整理提示词' }} />
        <Stack.Screen name="EntryDetail" component={EntryDetailScreen} options={{ title: '笔记详情' }} />
        <Stack.Screen name="CategoryEntries" component={CategoryEntriesScreen} options={{ title: '分类内容' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

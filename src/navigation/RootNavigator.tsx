import React, { useMemo } from 'react';
import { NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabs } from './BottomTabs';
import type { RootStackParamList } from './types';
import { VoiceInputScreen } from '../screens/VoiceInputScreen';
import { PromptSettingsScreen } from '../screens/PromptSettingsScreen';
import { LocalModelSettingsScreen } from '../screens/LocalModelSettingsScreen';
import { CategorySettingsScreen } from '../screens/CategorySettingsScreen';
import { ProjectSettingsScreen } from '../screens/ProjectSettingsScreen';
import { ProjectDetailScreen } from '../screens/ProjectDetailScreen';
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
          animation: 'simple_push',
          animationDuration: 160,
          freezeOnBlur: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onSurface,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={BottomTabs} options={{ headerShown: false }} />
        <Stack.Screen name="VoiceInput" component={VoiceInputScreen} options={{ title: '新建记录' }} />
        <Stack.Screen name="PromptSettings" component={PromptSettingsScreen} options={{ title: '整理提示词' }} />
        <Stack.Screen
          name="LocalModelSettings"
          component={LocalModelSettingsScreen}
          options={{ title: '本地模型' }}
        />
        <Stack.Screen name="CategorySettings" component={CategorySettingsScreen} options={{ title: '分类设置' }} />
        <Stack.Screen name="ProjectSettings" component={ProjectSettingsScreen} options={{ title: '项目设置' }} />
        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ title: '项目详情' }} />
        <Stack.Screen name="EntryDetail" component={EntryDetailScreen} options={{ title: '笔记详情' }} />
        <Stack.Screen name="CategoryEntries" component={CategoryEntriesScreen} options={{ title: '分类内容' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

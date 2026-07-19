import React, { useMemo } from 'react';
import { NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabs } from './BottomTabs';
import type { RootStackParamList } from './types';
import { VoiceInputScreen } from '../screens/VoiceInputScreen';
import { PromptSettingsScreen } from '../screens/PromptSettingsScreen';
import { LocalModelSettingsScreen } from '../screens/LocalModelSettingsScreen';
import { LocalModelChatScreen } from '../screens/LocalModelChatScreen';
import { DeveloperOptionsScreen } from '../screens/DeveloperOptionsScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { CategorySettingsScreen } from '../screens/CategorySettingsScreen';
import { ProjectSettingsScreen } from '../screens/ProjectSettingsScreen';
import { ProjectDetailScreen } from '../screens/ProjectDetailScreen';
import { EntryDetailScreen } from '../screens/EntryDetailScreen';
import { CategoryEntriesScreen } from '../screens/CategoryEntriesScreen';
import { useAppTheme } from '../theme/AppThemeProvider';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { techTokens } from '../theme/tech/tokens';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { theme, isDark } = useAppTheme();
  const { isTech, motionLevel, motion } = useVisualStyle();

  const navigationTheme = useMemo<NavigationTheme>(
    () => ({
      dark: isTech || isDark,
      colors: {
        primary: isTech ? techTokens.colors.primary : theme.colors.primary,
        background: isTech ? techTokens.colors.background : theme.colors.background,
        card: isTech ? techTokens.colors.surface : theme.colors.surface,
        text: isTech ? techTokens.colors.text : theme.colors.onSurface,
        border: isTech ? techTokens.colors.line : theme.colors.outlineVariant,
        notification: isTech ? techTokens.colors.error : theme.colors.error,
      },
    }),
    [isDark, isTech, theme],
  );

  const techAnimation =
    motionLevel === 'off'
      ? 'none'
      : motionLevel === 'reduced'
        ? 'fade'
        : motionLevel === 'standard'
          ? 'fade_from_bottom'
          : 'slide_from_right';

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          animation: isTech ? techAnimation : 'simple_push',
          animationDuration: isTech
            ? motionLevel === 'off'
              ? 0
              : Math.max(120, Math.round(410 * motion.durationScale))
            : 160,
          freezeOnBlur: true,
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: isTech ? 'rgba(5, 18, 27, 0.98)' : theme.colors.surface,
          },
          headerTintColor: isTech ? techTokens.colors.text : theme.colors.onSurface,
          headerTitleStyle: {
            fontWeight: '900',
            letterSpacing: isTech ? 0.45 : 0,
          },
          headerBackTitleVisible: false,
          contentStyle: {
            backgroundColor: isTech ? techTokens.colors.background : theme.colors.background,
          },
        }}
      >
        <Stack.Screen name="MainTabs" component={BottomTabs} options={{ headerShown: false }} />
        <Stack.Screen name="VoiceInput" component={VoiceInputScreen} options={{ title: '新建记录' }} />
        <Stack.Screen name="PromptSettings" component={PromptSettingsScreen} options={{ title: '整理提示词' }} />
        <Stack.Screen name="LocalModelSettings" component={LocalModelSettingsScreen} options={{ title: '本地模型管理' }} />
        <Stack.Screen name="LocalModelChat" component={LocalModelChatScreen} options={{ title: '本地模型对话' }} />
        <Stack.Screen name="DeveloperOptions" component={DeveloperOptionsScreen} options={{ title: '开发者选项' }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: '关于 VoiceDiary' }} />
        <Stack.Screen name="CategorySettings" component={CategorySettingsScreen} options={{ title: '分类设置' }} />
        <Stack.Screen name="ProjectSettings" component={ProjectSettingsScreen} options={{ title: '项目设置' }} />
        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={{ title: '项目详情' }} />
        <Stack.Screen name="EntryDetail" component={EntryDetailScreen} options={{ title: '笔记详情' }} />
        <Stack.Screen name="CategoryEntries" component={CategoryEntriesScreen} options={{ title: '分类内容' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

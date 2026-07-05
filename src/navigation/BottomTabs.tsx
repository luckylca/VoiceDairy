import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from 'react-native-paper';
import type { RootTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { VoiceInputScreen } from '../screens/VoiceInputScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { TodoScreen } from '../screens/TodoScreen';
import { ReminderScreen } from '../screens/ReminderScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarIcon: ({ color, size }) => {
          const icon =
            route.name === 'Home'
              ? 'timeline-clock-outline'
              : route.name === 'VoiceInput'
                ? 'microphone-outline'
                : route.name === 'Category'
                  ? 'shape-outline'
                  : route.name === 'Todo'
                    ? 'checkbox-marked-circle-outline'
                    : route.name === 'Reminder'
                      ? 'bell-outline'
                      : route.name === 'Search'
                        ? 'magnify'
                        : 'cog-outline';
          return <Icon source={icon} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '时间线' }} />
      <Tab.Screen name="VoiceInput" component={VoiceInputScreen} options={{ title: '记录' }} />
      <Tab.Screen name="Category" component={CategoryScreen} options={{ title: '分类' }} />
      <Tab.Screen name="Todo" component={TodoScreen} options={{ title: '待办' }} />
      <Tab.Screen name="Reminder" component={ReminderScreen} options={{ title: '提醒' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: '搜索' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
    </Tab.Navigator>
  );
}

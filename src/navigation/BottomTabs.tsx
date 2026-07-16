import React from 'react';
import { Dimensions } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Icon, useTheme } from 'react-native-paper';
import type { RootTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createMaterialTopTabNavigator<RootTabParamList>();
const initialWidth = Dimensions.get('window').width;

function withAlpha(color: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alpha}` : color;
}

export function BottomTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      initialLayout={{ width: initialWidth }}
      keyboardDismissMode="on-drag"
      backBehavior="history"
      overScrollMode="never"
      sceneContainerStyle={{ backgroundColor: theme.colors.background }}
      screenOptions={({ route }) => ({
        swipeEnabled: true,
        lazy: false,
        tabBarShowIcon: true,
        tabBarBounces: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarPressColor: withAlpha(theme.colors.primary, '24'),
        tabBarAndroidRipple: {
          borderless: false,
          color: withAlpha(theme.colors.primary, '24'),
        },
        tabBarStyle: {
          height: 72,
          paddingTop: 4,
          paddingBottom: 6,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
          elevation: 12,
          shadowColor: theme.colors.shadow,
        },
        tabBarItemStyle: {
          height: 62,
          padding: 0,
        },
        tabBarIndicatorStyle: {
          height: 3,
          borderRadius: 2,
          backgroundColor: theme.colors.primary,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
          textTransform: 'none',
          marginTop: 0,
        },
        tabBarIconStyle: {
          width: 28,
          height: 28,
          marginBottom: 0,
        },
        tabBarIcon: ({ color, focused }) => {
          const icon =
            route.name === 'Home'
              ? focused
                ? 'timeline-text'
                : 'timeline-text-outline'
              : route.name === 'Category'
                ? focused
                  ? 'shape'
                  : 'shape-outline'
                : focused
                  ? 'cog'
                  : 'cog-outline';
          return <Icon source={icon} color={color} size={24} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '时间线' }} />
      <Tab.Screen name="Category" component={CategoryScreen} options={{ title: '分类' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
    </Tab.Navigator>
  );
}

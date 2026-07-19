import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PagerView from 'react-native-pager-view';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { QuickRecordScreen } from '../screens/QuickRecordScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AgentScreen } from '../screens/AgentScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { loadSettings } from '../services/settings/SettingsService';
import { subscribeMainTab, type MainTabName } from './MainTabController';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { techTokens } from '../theme/tech/tokens';

const LAST_MAIN_TAB_KEY = 'voicediary.navigation.last-main-tab.v1';

type TabDefinition = {
  name: MainTabName;
  label: string;
  activeIcon: string;
  inactiveIcon: string;
};

const tabs: TabDefinition[] = [
  { name: 'record', label: '记录', activeIcon: 'microphone', inactiveIcon: 'microphone-outline' },
  { name: 'timeline', label: '时间线', activeIcon: 'clock', inactiveIcon: 'clock-outline' },
  {
    name: 'agent',
    label: 'Agent',
    activeIcon: 'message-processing',
    inactiveIcon: 'message-processing-outline',
  },
  { name: 'settings', label: '设置', activeIcon: 'cog', inactiveIcon: 'cog-outline' },
];

function ClassicTab({
  tab,
  focused,
  onPress,
}: {
  tab: TabDefinition;
  focused: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 130,
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);

  return (
    <View style={styles.tabSlot}>
      <TouchableRipple
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        style={[
          styles.classicTab,
          { backgroundColor: focused ? theme.colors.secondaryContainer : 'transparent' },
        ]}
      >
        <View style={styles.tabContent}>
          <Animated.View
            style={{
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
              ],
            }}
          >
            <Icon
              source={focused ? tab.activeIcon : tab.inactiveIcon}
              size={23}
              color={focused ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant}
            />
          </Animated.View>
          <Text
            variant="labelSmall"
            style={{
              marginTop: 2,
              fontWeight: '800',
              color: focused ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant,
            }}
          >
            {tab.label}
          </Text>
          <Animated.View
            style={[
              styles.classicIndicator,
              {
                opacity: progress,
                backgroundColor: theme.colors.primary,
                transform: [
                  {
                    scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                  },
                ],
              },
            ]}
          />
        </View>
      </TouchableRipple>
    </View>
  );
}

function TechTab({
  tab,
  focused,
  onPress,
}: {
  tab: TabDefinition;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.96)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1 : 0.96,
      speed: 28,
      bounciness: 3,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
      onPress={onPress}
      style={styles.techTab}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
        <View style={[styles.techIconShell, focused && styles.techIconShellFocused]}>
          <Icon
            source={focused ? tab.activeIcon : tab.inactiveIcon}
            size={22}
            color={focused ? techTokens.colors.primary : techTokens.colors.textMuted}
          />
        </View>
        <Text
          variant="labelSmall"
          style={{
            marginTop: 3,
            color: focused ? techTokens.colors.text : techTokens.colors.textMuted,
            fontWeight: focused ? '900' : '700',
          }}
        >
          {tab.label}
        </Text>
        <View style={[styles.techIndicator, { opacity: focused ? 1 : 0 }]} />
      </Animated.View>
    </Pressable>
  );
}

export function BottomTabs() {
  const theme = useTheme();
  const { isTech } = useVisualStyle();
  const pagerRef = useRef<PagerView>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const pages = useMemo(
    () => [
      <View key="record" collapsable={false} style={styles.page}>
        <QuickRecordScreen />
      </View>,
      <View key="timeline" collapsable={false} style={styles.page}>
        <HomeScreen />
      </View>,
      <View key="agent" collapsable={false} style={styles.page}>
        <AgentScreen />
      </View>,
      <View key="settings" collapsable={false} style={styles.page}>
        <SettingsScreen />
      </View>,
    ],
    [],
  );

  function openPage(index: number, animated = true) {
    if (index < 0 || index >= tabs.length || index === activeIndexRef.current) return;
    if (animated) pagerRef.current?.setPage(index);
    else pagerRef.current?.setPageWithoutAnimation(index);
  }

  useEffect(() => {
    const unsubscribe = subscribeMainTab(tab => {
      const index = tabs.findIndex(item => item.name === tab);
      if (index >= 0) openPage(index);
    });

    void (async () => {
      const settings = await loadSettings();
      let targetIndex = 0;
      if (settings.startupPage === 'agent') {
        targetIndex = tabs.findIndex(tab => tab.name === 'agent');
      } else if (settings.startupPage === 'last_page') {
        const lastTab = (await AsyncStorage.getItem(LAST_MAIN_TAB_KEY)) as MainTabName | null;
        const lastIndex = tabs.findIndex(tab => tab.name === lastTab);
        targetIndex = lastIndex >= 0 ? lastIndex : 0;
      }
      if (targetIndex > 0) {
        requestAnimationFrame(() => openPage(targetIndex, false));
      }
    })();

    return unsubscribe;
  }, []);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: isTech ? techTokens.colors.background : theme.colors.background },
      ]}
    >
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        orientation="horizontal"
        scrollEnabled
        overScrollMode="never"
        offscreenPageLimit={1}
        onPageSelected={event => {
          const index = event.nativeEvent.position;
          activeIndexRef.current = index;
          setActiveIndex(index);
          void AsyncStorage.setItem(LAST_MAIN_TAB_KEY, tabs[index]?.name ?? 'record');
        }}
      >
        {pages}
      </PagerView>

      <View
        style={[
          styles.tabBar,
          isTech
            ? styles.techTabBar
            : {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.outlineVariant,
              },
        ]}
      >
        {tabs.map((tab, index) =>
          isTech ? (
            <TechTab
              key={tab.name}
              tab={tab}
              focused={activeIndex === index}
              onPress={() => openPage(index)}
            />
          ) : (
            <ClassicTab
              key={tab.name}
              tab={tab}
              focused={activeIndex === index}
              onPress={() => openPage(index)}
            />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1 },
  page: { flex: 1 },
  tabBar: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  techTabBar: {
    height: 76,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 7,
    borderTopColor: techTokens.colors.line,
    backgroundColor: 'rgba(3, 10, 16, 0.98)',
  },
  tabSlot: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 2,
  },
  classicTab: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classicIndicator: {
    width: 22,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
  techTab: {
    flex: 1,
    height: '100%',
  },
  techIconShell: {
    width: 35,
    height: 30,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  techIconShellFocused: {
    borderColor: 'rgba(85, 217, 255, 0.32)',
    backgroundColor: 'rgba(85, 217, 255, 0.08)',
  },
  techIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: techTokens.colors.primary,
  },
});

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PagerView from 'react-native-pager-view';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { QuickRecordScreen } from '../screens/QuickRecordScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AgentScreen } from '../screens/AgentScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { loadSettings } from '../services/settings/SettingsService';
import { subscribeMainTab, type MainTabName } from './MainTabController';
import { MainTabActivityProvider } from './MainTabActivityContext';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { techTokens } from '../theme/tech/tokens';

const LAST_MAIN_TAB_KEY = 'voicediary.navigation.last-main-tab.v1';

type TabDefinition = {
  name: MainTabName;
  label: string;
  activeIcon: string;
  inactiveIcon: string;
  code: string;
};

const tabs: TabDefinition[] = [
  {
    name: 'record',
    label: '记录',
    activeIcon: 'microphone',
    inactiveIcon: 'microphone-outline',
    code: 'REC',
  },
  {
    name: 'timeline',
    label: '时间线',
    activeIcon: 'clock',
    inactiveIcon: 'clock-outline',
    code: 'TIME',
  },
  {
    name: 'agent',
    label: 'Agent',
    activeIcon: 'message-processing',
    inactiveIcon: 'message-processing-outline',
    code: 'AI',
  },
  {
    name: 'settings',
    label: '设置',
    activeIcon: 'cog',
    inactiveIcon: 'cog-outline',
    code: 'SYS',
  },
];

function withAlpha(color: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alpha}` : color;
}

function clampPage(index: number): number {
  return Math.max(0, Math.min(tabs.length - 1, index));
}

const BottomNavItem = memo(function BottomNavItem({
  tab,
  focused,
  isTech,
  onPress,
}: {
  tab: TabDefinition;
  focused: boolean;
  isTech: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 130,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [focused, progress]);

  const iconScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const indicatorScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });
  const focusedColor = isTech ? techTokens.colors.primary : theme.colors.onSecondaryContainer;
  const unfocusedColor = isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant;

  return (
    <View style={styles.tabItemSlot}>
      <TouchableRipple
        onPress={onPress}
        borderless={false}
        rippleColor={
          isTech
            ? 'rgba(85,217,255,0.20)'
            : withAlpha(theme.colors.primary, '2E')
        }
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        style={[
          styles.tabItem,
          isTech ? styles.techTabItem : styles.classicTabItem,
          {
            backgroundColor: focused
              ? isTech
                ? 'rgba(85,217,255,0.075)'
                : theme.colors.secondaryContainer
              : 'transparent',
            borderColor: isTech && focused
              ? 'rgba(85,217,255,0.25)'
              : 'transparent',
          },
        ]}
      >
        <View style={styles.tabItemContent}>
          <Animated.View
            style={[
              styles.iconShell,
              isTech && styles.techIconShell,
              isTech && focused && styles.techIconShellFocused,
              { transform: [{ scale: iconScale }] },
            ]}
          >
            <Icon
              source={focused ? tab.activeIcon : tab.inactiveIcon}
              size={24}
              color={focused ? focusedColor : unfocusedColor}
            />
            {isTech && focused ? <View style={styles.iconSignalDot} /> : null}
          </Animated.View>

          <Text
            variant="labelSmall"
            style={{
              marginTop: 2,
              fontWeight: '800',
              color: focused
                ? isTech
                  ? techTokens.colors.text
                  : theme.colors.onSecondaryContainer
                : unfocusedColor,
            }}
          >
            {tab.label}
          </Text>

          {isTech ? (
            <Text style={[styles.techCode, focused && styles.techCodeFocused]}>
              {tab.code}
            </Text>
          ) : null}

          <Animated.View
            style={[
              styles.indicator,
              {
                opacity: progress,
                backgroundColor: isTech ? techTokens.colors.primary : theme.colors.primary,
                transform: [{ scaleX: indicatorScale }],
              },
            ]}
          />
        </View>
      </TouchableRipple>
    </View>
  );
});

function ScreenSlot({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <MainTabActivityProvider active={active}>
      <View style={styles.page}>{children}</View>
    </MainTabActivityProvider>
  );
}

export function BottomTabs() {
  const theme = useTheme();
  const { isTech } = useVisualStyle();
  const pagerRef = useRef<PagerView>(null);
  const activeIndexRef = useRef(0);
  const receivedNavigationCommandRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const commitSelectedPage = useCallback((index: number, persist = true) => {
    const next = clampPage(index);
    const changed = activeIndexRef.current !== next;
    activeIndexRef.current = next;
    setActiveIndex(previous => (previous === next ? previous : next));
    if (changed && persist) {
      void AsyncStorage.setItem(LAST_MAIN_TAB_KEY, tabs[next]?.name ?? 'record');
    }
  }, []);

  const openPage = useCallback((index: number) => {
    const next = clampPage(index);
    if (next === activeIndexRef.current) return;

    // This is intentionally the same interaction pattern used before the technology
    // theme existed: send the command straight to the native pager and let
    // onPageSelected become the single source of truth for the selected tab.
    pagerRef.current?.setPage(next);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeMainTab(tab => {
      receivedNavigationCommandRef.current = true;
      const index = tabs.findIndex(item => item.name === tab);
      if (index >= 0) openPage(index);
    });

    void (async () => {
      const settings = await loadSettings();
      if (receivedNavigationCommandRef.current) return;

      let targetIndex = 0;
      if (settings.startupPage === 'agent') {
        targetIndex = tabs.findIndex(tab => tab.name === 'agent');
      } else if (settings.startupPage === 'last_page') {
        const lastTab = (await AsyncStorage.getItem(LAST_MAIN_TAB_KEY)) as MainTabName | null;
        const lastIndex = tabs.findIndex(tab => tab.name === lastTab);
        targetIndex = lastIndex >= 0 ? lastIndex : 0;
      }

      if (targetIndex > 0) {
        requestAnimationFrame(() => {
          pagerRef.current?.setPageWithoutAnimation(targetIndex);
          commitSelectedPage(targetIndex, false);
        });
      }
    })();

    return unsubscribe;
  }, [commitSelectedPage, openPage]);

  const pages = useMemo(
    () => [
      <View key="record" collapsable={false} style={styles.page}>
        <ScreenSlot active={activeIndex === 0}>
          <QuickRecordScreen />
        </ScreenSlot>
      </View>,
      <View key="timeline" collapsable={false} style={styles.page}>
        <ScreenSlot active={activeIndex === 1}>
          <HomeScreen />
        </ScreenSlot>
      </View>,
      <View key="agent" collapsable={false} style={styles.page}>
        <ScreenSlot active={activeIndex === 2}>
          <AgentScreen />
        </ScreenSlot>
      </View>,
      <View key="settings" collapsable={false} style={styles.page}>
        <ScreenSlot active={activeIndex === 3}>
          <SettingsScreen />
        </ScreenSlot>
      </View>,
    ],
    [activeIndex],
  );

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
        pageMargin={0}
        offscreenPageLimit={1}
        onPageSelected={event => commitSelectedPage(event.nativeEvent.position)}
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
        {tabs.map((tab, index) => (
          <BottomNavItem
            key={tab.name}
            tab={tab}
            focused={activeIndex === index}
            isTech={isTech}
            onPress={() => openPage(index)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBar: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  techTabBar: {
    height: 78,
    paddingTop: 5,
    paddingBottom: 6,
    borderTopColor: 'rgba(85,217,255,0.28)',
    backgroundColor: 'rgba(2,9,14,0.985)',
  },
  tabItemSlot: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 3,
  },
  tabItem: {
    flex: 1,
    overflow: 'hidden',
  },
  classicTabItem: {
    borderRadius: 20,
    borderWidth: 0,
  },
  techTabItem: {
    borderRadius: 15,
    borderWidth: 1,
  },
  tabItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShell: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techIconShell: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  techIconShellFocused: {
    borderColor: 'rgba(85,217,255,0.34)',
    backgroundColor: 'rgba(85,217,255,0.085)',
  },
  iconSignalDot: {
    position: 'absolute',
    right: 3,
    top: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: techTokens.colors.success,
  },
  indicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
  techCode: {
    marginTop: 1,
    color: 'rgba(143,168,181,0.42)',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.55,
  },
  techCodeFocused: {
    color: techTokens.colors.primary,
  },
});
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
const FORWARD_PREVIEW_THRESHOLD = 0.06;
const BACKWARD_PREVIEW_THRESHOLD = 0.94;

type TabDefinition = {
  name: MainTabName;
  label: string;
  activeIcon: string;
  inactiveIcon: string;
  code: string;
};

const tabs: TabDefinition[] = [
  { name: 'record', label: '记录', activeIcon: 'microphone', inactiveIcon: 'microphone-outline', code: 'REC' },
  { name: 'timeline', label: '时间线', activeIcon: 'clock', inactiveIcon: 'clock-outline', code: 'TIME' },
  { name: 'agent', label: 'Agent', activeIcon: 'message-processing', inactiveIcon: 'message-processing-outline', code: 'AI' },
  { name: 'settings', label: '设置', activeIcon: 'cog', inactiveIcon: 'cog-outline', code: 'SYS' },
];

const ClassicTab = memo(function ClassicTab({
  tab,
  focused,
  onPress,
}: {
  tab: TabDefinition;
  focused: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

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
          <Icon
            source={focused ? tab.activeIcon : tab.inactiveIcon}
            size={focused ? 24 : 23}
            color={focused ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant}
          />
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
        </View>
      </TouchableRipple>
    </View>
  );
});

const TechTab = memo(function TechTab({
  tab,
  focused,
  onPress,
}: {
  tab: TabDefinition;
  focused: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.techTab,
        focused && styles.techTabFocused,
        pressed && styles.techTabPressed,
      ]}
    >
      {focused ? (
        <View pointerEvents="none" style={styles.techSelectedFrame}>
          <View style={styles.techSelectedGlow} />
          <View style={styles.techSelectedLine} />
        </View>
      ) : null}
      <View style={[styles.tabContent, focused && styles.tabContentFocused]}>
        <View style={[styles.techIconShell, focused && styles.techIconShellFocused]}>
          <Icon
            source={focused ? tab.activeIcon : tab.inactiveIcon}
            size={focused ? 23 : 22}
            color={focused ? techTokens.colors.primary : techTokens.colors.textMuted}
          />
          {focused ? <View style={styles.iconSignalDot} /> : null}
        </View>
        <Text
          variant="labelSmall"
          style={{
            marginTop: 2,
            color: focused ? techTokens.colors.text : techTokens.colors.textMuted,
            fontWeight: focused ? '900' : '700',
          }}
        >
          {tab.label}
        </Text>
        <Text style={[styles.techCode, focused && styles.techCodeFocused]}>{tab.code}</Text>
      </View>
    </Pressable>
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
  const { isTech, motionLevel } = useVisualStyle();
  const pagerRef = useRef<PagerView>(null);
  const activeIndexRef = useRef(0);
  const dragOriginRef = useRef(0);
  const draggingRef = useRef(false);
  const pagingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visualIndex, setVisualIndex] = useState(0);
  const [paging, setPaging] = useState(false);

  const setPagingState = useCallback((value: boolean) => {
    pagingRef.current = value;
    setPaging(previous => (previous === value ? previous : value));
  }, []);

  const setVisualIndexSafe = useCallback((index: number) => {
    if (index < 0 || index >= tabs.length) return;
    setVisualIndex(previous => (previous === index ? previous : index));
  }, []);

  const commitIndex = useCallback(
    (index: number, persist = true) => {
      if (index < 0 || index >= tabs.length) return;
      const changed = index !== activeIndexRef.current;
      activeIndexRef.current = index;
      dragOriginRef.current = index;
      setActiveIndex(previous => (previous === index ? previous : index));
      setVisualIndexSafe(index);
      if (changed && persist) {
        void AsyncStorage.setItem(LAST_MAIN_TAB_KEY, tabs[index]?.name ?? 'record');
      }
    },
    [setVisualIndexSafe],
  );

  const openPage = useCallback(
    (index: number, animate = motionLevel !== 'off') => {
      if (index < 0 || index >= tabs.length) return;
      // Update the bottom bar before asking the native pager to animate.
      setVisualIndexSafe(index);
      commitIndex(index);
      if (animate) {
        setPagingState(true);
        pagerRef.current?.setPage(index);
      } else {
        pagerRef.current?.setPageWithoutAnimation(index);
      }
    },
    [commitIndex, motionLevel, setPagingState, setVisualIndexSafe],
  );

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
        requestAnimationFrame(() => {
          commitIndex(targetIndex, false);
          pagerRef.current?.setPageWithoutAnimation(targetIndex);
        });
      }
    })();

    return unsubscribe;
  }, [commitIndex, openPage]);

  return (
    <View style={[styles.root, { backgroundColor: isTech ? techTokens.colors.background : theme.colors.background }]}>
      <PagerView
        ref={pagerRef}
        style={styles.pagesContainer}
        initialPage={0}
        offscreenPageLimit={1}
        overdrag={false}
        onPageScrollStateChanged={event => {
          const state = event.nativeEvent.pageScrollState;
          if (state === 'dragging') {
            draggingRef.current = true;
            dragOriginRef.current = activeIndexRef.current;
            setPagingState(true);
            return;
          }
          if (state === 'idle') {
            draggingRef.current = false;
            setPagingState(false);
            setVisualIndexSafe(activeIndexRef.current);
          }
        }}
        onPageScroll={event => {
          if (!draggingRef.current) return;
          const { position, offset } = event.nativeEvent;
          const origin = dragOriginRef.current;
          let preview = origin;

          if (origin === position && offset > FORWARD_PREVIEW_THRESHOLD) {
            preview = Math.min(tabs.length - 1, origin + 1);
          } else if (origin === position + 1 && offset < BACKWARD_PREVIEW_THRESHOLD) {
            preview = Math.max(0, origin - 1);
          }
          setVisualIndexSafe(preview);
        }}
        onPageSelected={event => {
          commitIndex(event.nativeEvent.position);
          if (!draggingRef.current) setPagingState(false);
        }}
      >
        <View key="record" collapsable={false} style={styles.page}>
          <ScreenSlot active={activeIndex === 0 && !paging}><QuickRecordScreen /></ScreenSlot>
        </View>
        <View key="timeline" collapsable={false} style={styles.page}>
          <ScreenSlot active={activeIndex === 1 && !paging}><HomeScreen /></ScreenSlot>
        </View>
        <View key="agent" collapsable={false} style={styles.page}>
          <ScreenSlot active={activeIndex === 2 && !paging}><AgentScreen /></ScreenSlot>
        </View>
        <View key="settings" collapsable={false} style={styles.page}>
          <ScreenSlot active={activeIndex === 3 && !paging}><SettingsScreen /></ScreenSlot>
        </View>
      </PagerView>

      <View
        style={[
          styles.tabBar,
          isTech
            ? styles.techTabBar
            : { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant },
        ]}
      >
        {tabs.map((tab, index) =>
          isTech ? (
            <TechTab key={tab.name} tab={tab} focused={visualIndex === index} onPress={() => openPage(index)} />
          ) : (
            <ClassicTab key={tab.name} tab={tab} focused={visualIndex === index} onPress={() => openPage(index)} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pagesContainer: { flex: 1 },
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
    height: 78,
    paddingHorizontal: 8,
    paddingTop: 5,
    paddingBottom: 6,
    borderTopColor: 'rgba(85,217,255,0.28)',
    backgroundColor: 'rgba(2,9,14,0.985)',
    overflow: 'hidden',
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
    zIndex: 2,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContentFocused: {
    transform: [{ translateY: -1 }],
  },
  techTab: {
    flex: 1,
    height: '100%',
    marginHorizontal: 2,
    borderRadius: 15,
    overflow: 'hidden',
  },
  techTabFocused: {
    backgroundColor: 'rgba(85,217,255,0.025)',
  },
  techTabPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  techSelectedFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(85,217,255,0.24)',
    backgroundColor: 'rgba(85,217,255,0.055)',
    overflow: 'hidden',
  },
  techSelectedGlow: {
    position: 'absolute',
    left: '24%',
    right: '24%',
    top: -10,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(85,217,255,0.09)',
  },
  techSelectedLine: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: techTokens.colors.primary,
  },
  techIconShell: {
    width: 36,
    height: 29,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  techIconShellFocused: {
    borderColor: 'rgba(85,217,255,0.34)',
    backgroundColor: 'rgba(85,217,255,0.085)',
  },
  iconSignalDot: {
    position: 'absolute',
    right: 4,
    top: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: techTokens.colors.success,
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
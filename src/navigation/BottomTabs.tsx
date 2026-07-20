import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const SWIPE_DISTANCE = 46;
const SWIPE_VELOCITY = 0.35;

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
      <View style={styles.tabContent}>
        <View style={[styles.techIconShell, focused && styles.techIconShellFocused]}>
          <Icon
            source={focused ? tab.activeIcon : tab.inactiveIcon}
            size={22}
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
      <View
        pointerEvents={active ? 'auto' : 'none'}
        accessibilityElementsHidden={!active}
        importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
        style={[styles.pageSlot, active ? styles.pageActive : styles.pageHidden]}
      >
        {children}
      </View>
    </MainTabActivityProvider>
  );
}

function TabLoadingFallback({ isTech }: { isTech: boolean }) {
  return (
    <View style={[styles.loadingPage, { backgroundColor: isTech ? techTokens.colors.background : undefined }]}>
      <Text
        variant="titleMedium"
        style={{ color: isTech ? techTokens.colors.text : undefined, fontWeight: '800' }}
      >
        正在载入页面
      </Text>
      <Text
        variant="bodySmall"
        style={{ marginTop: 6, color: isTech ? techTokens.colors.textMuted : undefined }}
      >
        首次打开后会保持在内存中，后续切换将立即显示。
      </Text>
    </View>
  );
}

export function BottomTabs() {
  const theme = useTheme();
  const { isTech } = useVisualStyle();
  const activeIndexRef = useRef(0);
  const mountedMaskRef = useRef(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mountedMask, setMountedMask] = useState(1);

  const mountPage = useCallback((index: number) => {
    const bit = 1 << index;
    if ((mountedMaskRef.current & bit) !== 0) return;
    mountedMaskRef.current |= bit;
    setMountedMask(mountedMaskRef.current);
  }, []);

  const openPage = useCallback(
    (index: number) => {
      if (index < 0 || index >= tabs.length) return;

      if (index !== activeIndexRef.current) {
        activeIndexRef.current = index;
        setActiveIndex(index);
        void AsyncStorage.setItem(LAST_MAIN_TAB_KEY, tabs[index]?.name ?? 'record');
      }

      if ((mountedMaskRef.current & (1 << index)) === 0) {
        requestAnimationFrame(() => mountPage(index));
      }
    },
    [mountPage],
  );

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) => {
          const horizontal = Math.abs(gesture.dx);
          const vertical = Math.abs(gesture.dy);
          return horizontal > 14 && horizontal > vertical * 1.35;
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_event, gesture) => {
          const shouldSwitch =
            Math.abs(gesture.dx) >= SWIPE_DISTANCE || Math.abs(gesture.vx) >= SWIPE_VELOCITY;
          if (!shouldSwitch) return;

          const direction = gesture.dx < 0 ? 1 : -1;
          const nextIndex = Math.max(0, Math.min(tabs.length - 1, activeIndexRef.current + direction));
          openPage(nextIndex);
        },
        onPanResponderTerminate: () => undefined,
      }),
    [openPage],
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
      if (targetIndex > 0) openPage(targetIndex);
    })();

    return unsubscribe;
  }, [openPage]);

  useEffect(() => {
    // Pre-mount hidden tabs in small batches. Settings is intentionally first so
    // the page is ready before most users reach it, without blocking first paint.
    const settingsTimer = setTimeout(() => mountPage(3), 90);
    const timelineTimer = setTimeout(() => mountPage(1), 210);
    const agentTimer = setTimeout(() => mountPage(2), 380);
    return () => {
      clearTimeout(settingsTimer);
      clearTimeout(timelineTimer);
      clearTimeout(agentTimer);
    };
  }, [mountPage]);

  const activeMounted = (mountedMask & (1 << activeIndex)) !== 0;

  return (
    <View style={[styles.root, { backgroundColor: isTech ? techTokens.colors.background : theme.colors.background }]}>
      <View style={styles.pagesContainer} {...swipeResponder.panHandlers}>
        {(mountedMask & 1) !== 0 ? (
          <ScreenSlot active={activeIndex === 0}>
            <QuickRecordScreen />
          </ScreenSlot>
        ) : null}
        {(mountedMask & 2) !== 0 ? (
          <ScreenSlot active={activeIndex === 1}>
            <HomeScreen />
          </ScreenSlot>
        ) : null}
        {(mountedMask & 4) !== 0 ? (
          <ScreenSlot active={activeIndex === 2}>
            <AgentScreen />
          </ScreenSlot>
        ) : null}
        {(mountedMask & 8) !== 0 ? (
          <ScreenSlot active={activeIndex === 3}>
            <SettingsScreen />
          </ScreenSlot>
        ) : null}
        {!activeMounted ? <TabLoadingFallback isTech={isTech} /> : null}
      </View>

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
            <TechTab key={tab.name} tab={tab} focused={activeIndex === index} onPress={() => openPage(index)} />
          ) : (
            <ClassicTab key={tab.name} tab={tab} focused={activeIndex === index} onPress={() => openPage(index)} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pagesContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  pageSlot: {
    ...StyleSheet.absoluteFillObject,
  },
  pageActive: {
    opacity: 1,
    zIndex: 2,
  },
  pageHidden: {
    opacity: 0,
    zIndex: 0,
  },
  loadingPage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
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
    color: 'rgba(143,168,181,0.33)',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  techCodeFocused: {
    color: 'rgba(85,217,255,0.58)',
  },
});
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
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
const TAB_BAR_HORIZONTAL_PADDING = 8;
const TRACK_INSET = 4;

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
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: 120,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [focused, progress]);

  return (
    <View style={styles.tabSlot}>
      <TouchableRipple
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        style={[styles.classicTab, { backgroundColor: focused ? theme.colors.secondaryContainer : 'transparent' }]}
      >
        <View style={styles.tabContent}>
          <Animated.View
            style={{
              transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
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
  const { motion } = useVisualStyle();
  const focus = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    focus.stopAnimation();
    if (!motion.entrances) {
      focus.setValue(focused ? 1 : 0);
      return;
    }
    Animated.timing(focus, {
      toValue: focused ? 1 : 0,
      duration: Math.max(90, Math.round(150 * Math.max(0.5, motion.durationScale))),
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [focus, focused, motion.durationScale, motion.entrances]);

  function animatePress(value: number) {
    if (!motion.pressFeedback) return;
    press.stopAnimation();
    Animated.timing(press, {
      toValue: value,
      duration: 70,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
      onPress={onPress}
      onPressIn={() => animatePress(0.94)}
      onPressOut={() => animatePress(1)}
      style={styles.techTab}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            opacity: focus.interpolate({ inputRange: [0, 1], outputRange: [0.66, 1] }),
            transform: [
              { scale: Animated.multiply(press, focus.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.02] })) },
              { translateY: focus.interpolate({ inputRange: [0, 1], outputRange: [1, -1] }) },
            ],
          },
        ]}
      >
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
      </Animated.View>
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
        style={[styles.page, !active && styles.pageHidden]}
      >
        {children}
      </View>
    </MainTabActivityProvider>
  );
}

export function BottomTabs() {
  const theme = useTheme();
  const { isTech, motion } = useVisualStyle();
  const activeIndexRef = useRef(0);
  const activeTrack = useRef(new Animated.Value(0)).current;
  const pageEntrance = useRef(new Animated.Value(1)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const [mountedMask, setMountedMask] = useState(1);
  const [tabBarWidth, setTabBarWidth] = useState(0);

  const animateTrack = useCallback(
    (index: number) => {
      activeTrack.stopAnimation();
      if (!motion.entrances) {
        activeTrack.setValue(index);
        return;
      }
      Animated.timing(activeTrack, {
        toValue: index,
        duration: Math.max(90, Math.round(150 * Math.max(0.55, motion.durationScale))),
        useNativeDriver: true,
        isInteraction: false,
      }).start();
    },
    [activeTrack, motion.durationScale, motion.entrances],
  );

  const animatePageEntrance = useCallback(() => {
    pageEntrance.stopAnimation();
    if (!motion.entrances) {
      pageEntrance.setValue(1);
      return;
    }
    pageEntrance.setValue(0);
    Animated.timing(pageEntrance, {
      toValue: 1,
      duration: Math.max(100, Math.round(180 * Math.max(0.55, motion.durationScale))),
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [motion.durationScale, motion.entrances, pageEntrance]);

  const openPage = useCallback(
    (index: number, animate = true) => {
      if (index < 0 || index >= tabs.length || index === activeIndexRef.current) return;
      setMountedMask(mask => mask | (1 << index));
      activeIndexRef.current = index;
      setActiveIndex(index);
      animateTrack(index);
      if (animate) animatePageEntrance();
      else pageEntrance.setValue(1);
      void AsyncStorage.setItem(LAST_MAIN_TAB_KEY, tabs[index]?.name ?? 'record');
    },
    [animatePageEntrance, animateTrack, pageEntrance],
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
      if (targetIndex > 0) openPage(targetIndex, false);
    })();

    return unsubscribe;
  }, [openPage]);

  function handleTabBarLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    setTabBarWidth(previous => (Math.abs(previous - nextWidth) > 0.5 ? nextWidth : previous));
    activeTrack.setValue(activeIndexRef.current);
  }

  const innerWidth = Math.max(0, tabBarWidth - TAB_BAR_HORIZONTAL_PADDING * 2);
  const segmentWidth = innerWidth / tabs.length;
  const trackWidth = Math.max(0, segmentWidth - TRACK_INSET * 2);
  const trackStart = TAB_BAR_HORIZONTAL_PADDING + TRACK_INSET;
  const activePageStyle = {
    opacity: pageEntrance,
    transform: [{ translateY: pageEntrance.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }],
  };

  return (
    <View style={[styles.root, { backgroundColor: isTech ? techTokens.colors.background : theme.colors.background }]}>
      <View style={styles.pagesContainer}>
        {(mountedMask & 1) !== 0 ? (
          <ScreenSlot active={activeIndex === 0}>
            <Animated.View style={[styles.page, activeIndex === 0 && activePageStyle]}><QuickRecordScreen /></Animated.View>
          </ScreenSlot>
        ) : null}
        {(mountedMask & 2) !== 0 ? (
          <ScreenSlot active={activeIndex === 1}>
            <Animated.View style={[styles.page, activeIndex === 1 && activePageStyle]}><HomeScreen /></Animated.View>
          </ScreenSlot>
        ) : null}
        {(mountedMask & 4) !== 0 ? (
          <ScreenSlot active={activeIndex === 2}>
            <Animated.View style={[styles.page, activeIndex === 2 && activePageStyle]}><AgentScreen /></Animated.View>
          </ScreenSlot>
        ) : null}
        {(mountedMask & 8) !== 0 ? (
          <ScreenSlot active={activeIndex === 3}>
            <Animated.View style={[styles.page, activeIndex === 3 && activePageStyle]}><SettingsScreen /></Animated.View>
          </ScreenSlot>
        ) : null}
      </View>

      <View
        onLayout={handleTabBarLayout}
        style={[
          styles.tabBar,
          isTech
            ? styles.techTabBar
            : { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant },
        ]}
      >
        {isTech && tabBarWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeTrack,
              {
                width: trackWidth,
                transform: [
                  {
                    translateX: activeTrack.interpolate({
                      inputRange: [0, tabs.length - 1],
                      outputRange: [trackStart, trackStart + segmentWidth * (tabs.length - 1)],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.activeTrackGlow} />
            <View style={styles.activeTrackLine} />
          </Animated.View>
        ) : null}

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
  pagesContainer: { flex: 1 },
  page: { flex: 1 },
  pageHidden: {
    display: 'none',
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
    paddingHorizontal: TAB_BAR_HORIZONTAL_PADDING,
    paddingTop: 5,
    paddingBottom: 6,
    borderTopColor: 'rgba(85,217,255,0.28)',
    backgroundColor: 'rgba(2,9,14,0.985)',
    overflow: 'hidden',
  },
  activeTrack: {
    position: 'absolute',
    left: 0,
    top: 5,
    bottom: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(85,217,255,0.24)',
    backgroundColor: 'rgba(85,217,255,0.055)',
    overflow: 'hidden',
  },
  activeTrackGlow: {
    position: 'absolute',
    left: '24%',
    right: '24%',
    top: -10,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(85,217,255,0.09)',
  },
  activeTrackLine: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: techTokens.colors.primary,
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
  techTab: {
    zIndex: 2,
    flex: 1,
    height: '100%',
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

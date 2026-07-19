import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { TechShimmer } from '../components/tech/TechMotion';

const LAST_MAIN_TAB_KEY = 'voicediary.navigation.last-main-tab.v1';

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

function ClassicTab({ tab, focused, onPress }: { tab: TabDefinition; focused: boolean; onPress: () => void }) {
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
        style={[styles.classicTab, { backgroundColor: focused ? theme.colors.secondaryContainer : 'transparent' }]}
      >
        <View style={styles.tabContent}>
          <Animated.View
            style={{
              transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
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
                transform: [{ scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }],
              },
            ]}
          />
        </View>
      </TouchableRipple>
    </View>
  );
}

function TechTab({ tab, focused, onPress }: { tab: TabDefinition; focused: boolean; onPress: () => void }) {
  const { motion } = useVisualStyle();
  const focus = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    focus.stopAnimation();
    if (!motion.entrances) {
      focus.setValue(focused ? 1 : 0);
      return;
    }
    Animated.spring(focus, {
      toValue: focused ? 1 : 0,
      speed: 26,
      bounciness: focused ? 7 : 2,
      useNativeDriver: true,
    }).start();
  }, [focus, focused, motion.entrances]);

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    if (!focused || !motion.ambient) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: Math.max(420, Math.round(1050 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: Math.max(420, Math.round(1050 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [focused, motion.ambient, motion.durationScale, pulse]);

  function animatePress(value: number) {
    if (!motion.pressFeedback) return;
    Animated.spring(press, { toValue: value, speed: 38, bounciness: 4, useNativeDriver: true }).start();
  }

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
      onPress={onPress}
      onPressIn={() => animatePress(0.92)}
      onPressOut={() => animatePress(1)}
      style={styles.techTab}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            opacity: focus.interpolate({ inputRange: [0, 1], outputRange: [0.68, 1] }),
            transform: [
              { scale: Animated.multiply(press, focus.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] })) },
              { translateY: focus.interpolate({ inputRange: [0, 1], outputRange: [1, -2] }) },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.techIconShell,
            focused && styles.techIconShellFocused,
            {
              opacity: focused
                ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] })
                : 1,
              transform: [
                { rotate: focus.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '4deg'] }) },
              ],
            },
          ]}
        >
          <Icon
            source={focused ? tab.activeIcon : tab.inactiveIcon}
            size={22}
            color={focused ? techTokens.colors.primary : techTokens.colors.textMuted}
          />
          {focused ? <View style={styles.iconSignalDot} /> : null}
        </Animated.View>
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
}

export function BottomTabs() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { isTech, motion } = useVisualStyle();
  const pagerRef = useRef<PagerView>(null);
  const activeIndexRef = useRef(0);
  const activeTrack = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const pages = useMemo(
    () => [
      <View key="record" collapsable={false} style={styles.page}><QuickRecordScreen /></View>,
      <View key="timeline" collapsable={false} style={styles.page}><HomeScreen /></View>,
      <View key="agent" collapsable={false} style={styles.page}><AgentScreen /></View>,
      <View key="settings" collapsable={false} style={styles.page}><SettingsScreen /></View>,
    ],
    [],
  );

  function animateTrack(index: number) {
    activeTrack.stopAnimation();
    if (!motion.entrances) {
      activeTrack.setValue(index);
      return;
    }
    Animated.spring(activeTrack, {
      toValue: index,
      speed: 22,
      bounciness: motion.intensity > 0.8 ? 9 : 4,
      useNativeDriver: true,
    }).start();
  }

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
      if (targetIndex > 0) requestAnimationFrame(() => openPage(targetIndex, false));
    })();

    return unsubscribe;
  }, []);

  const trackWidth = Math.max(52, (width - 16) / tabs.length - 12);
  const trackStep = (width - 16) / tabs.length;

  return (
    <View style={[styles.root, { backgroundColor: isTech ? techTokens.colors.background : theme.colors.background }]}>
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
          animateTrack(index);
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
            : { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant },
        ]}
      >
        {isTech ? (
          <>
            <TechShimmer duration={2600} color="rgba(85,217,255,0.08)" />
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
                        outputRange: [6, 6 + trackStep * (tabs.length - 1)],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.activeTrackGlow} />
              <View style={styles.activeTrackLine} />
            </Animated.View>
          </>
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
    height: 78,
    paddingHorizontal: 8,
    paddingTop: 5,
    paddingBottom: 6,
    borderTopColor: 'rgba(85,217,255,0.28)',
    backgroundColor: 'rgba(2, 9, 14, 0.985)',
    overflow: 'hidden',
  },
  activeTrack: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(85,217,255,0.20)',
    backgroundColor: 'rgba(85,217,255,0.045)',
    overflow: 'hidden',
  },
  activeTrackGlow: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    top: -12,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(85,217,255,0.11)',
  },
  activeTrackLine: {
    position: 'absolute',
    left: 16,
    right: 16,
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
  classicIndicator: {
    width: 22,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
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
    borderColor: 'rgba(85,217,255,0.38)',
    backgroundColor: 'rgba(85,217,255,0.09)',
    shadowColor: techTokens.colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 3,
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

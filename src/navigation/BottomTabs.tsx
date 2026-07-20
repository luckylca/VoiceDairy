import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const TAB_LAYOUT_ANIMATION = {
  duration: 140,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

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
  const { isTech, motion, motionLevel } = useVisualStyle();
  const pagerRef = useRef<PagerView>(null);
  const activeIndexRef = useRef(0);
  const programmaticTargetRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const commitIndex = useCallback(
    (index: number, persist = true) => {
      if (index < 0 || index >= tabs.length || index === activeIndexRef.current) return;
      if (motion.entrances) LayoutAnimation.configureNext(TAB_LAYOUT_ANIMATION);
      activeIndexRef.current = index;
      setActiveIndex(index);
      if (persist) {
        void AsyncStorage.setItem(LAST_MAIN_TAB_KEY, tabs[index]?.name ?? 'record');
      }
    },
    [motion.entrances],
  );

  const openPage = useCallback(
    (index: number, animate = motionLevel !== 'off') => {
      if (index < 0 || index >= tabs.length) return;
      programmaticTargetRef.current = index;
      commitIndex(index);
      if (animate) pagerRef.current?.setPage(index);
      else pagerRef.current?.setPageWithoutAnimation(index);
    },
    [commitIndex, motionLevel],
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
          programmaticTargetRef.current = targetIndex;
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
        offscreenPageLimit={3}
        overdrag={false}
        onPageScrollStateChanged={event => {
          if (event.nativeEvent.pageScrollState === 'dragging') {
            programmaticTargetRef.current = null;
          }
        }}
        onPageSelected={event => {
          const position = event.nativeEvent.position;
          const target = programmaticTargetRef.current;
          if (target !== null) {
            if (position === target) {
              programmaticTargetRef.current = null;
              commitIndex(position);
            }
            return;
          }
          commitIndex(position);
        }}
      >
        <View key="record" collapsable={false} style={styles.page}>
          <ScreenSlot active={activeIndex === 0}><QuickRecordScreen /></ScreenSlot>
        </View>
        <View key="timeline" collapsable={false} style={styles.page}>
          <ScreenSlot active={activeIndex === 1}><HomeScreen /></ScreenSlot>
        </View>
        <View key="agent" collapsable={false} style={styles.page}>
          <ScreenSlot active={activeIndex === 2}><AgentScreen /></ScreenSlot>
        </View>
        <View key="settings" collapsable={false} style={styles.page}>
          <ScreenSlot active={activeIndex === 3}><SettingsScreen /></ScreenSlot>
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
    color: 'rgba(143,168,181,0.33)',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  techCodeFocused: {
    color: 'rgba(85,217,255,0.58)',
  },
});

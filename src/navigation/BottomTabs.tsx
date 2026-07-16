import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { HomeScreen } from '../screens/HomeScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

function withAlpha(color: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alpha}` : color;
}

type TabDefinition = {
  label: string;
  activeIcon: string;
  inactiveIcon: string;
};

const tabs: TabDefinition[] = [
  { label: '时间线', activeIcon: 'clock', inactiveIcon: 'clock-outline' },
  { label: '分类', activeIcon: 'shape', inactiveIcon: 'shape-outline' },
  { label: '设置', activeIcon: 'cog', inactiveIcon: 'cog-outline' },
];

function BottomNavItem({
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

  const iconScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const indicatorScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  return (
    <View style={styles.tabItemSlot}>
      <TouchableRipple
        onPress={onPress}
        borderless={false}
        rippleColor={withAlpha(theme.colors.primary, '2E')}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        style={[
          styles.tabItem,
          {
            backgroundColor: focused ? theme.colors.secondaryContainer : 'transparent',
          },
        ]}
      >
        <View style={styles.tabItemContent}>
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Icon
              source={focused ? tab.activeIcon : tab.inactiveIcon}
              size={24}
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
              styles.indicator,
              {
                opacity: progress,
                backgroundColor: theme.colors.primary,
                transform: [{ scaleX: indicatorScale }],
              },
            ]}
          />
        </View>
      </TouchableRipple>
    </View>
  );
}

export function BottomTabs() {
  const theme = useTheme();
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const pages = useMemo(
    () => [
      <View key="timeline" collapsable={false} style={styles.page}>
        <HomeScreen />
      </View>,
      <View key="category" collapsable={false} style={styles.page}>
        <CategoryScreen />
      </View>,
      <View key="settings" collapsable={false} style={styles.page}>
        <SettingsScreen />
      </View>,
    ],
    [],
  );

  function openPage(index: number) {
    if (index === activeIndex) {
      return;
    }
    pagerRef.current?.setPage(index);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        orientation="horizontal"
        scrollEnabled
        overScrollMode="never"
        pageMargin={0}
        offscreenPageLimit={1}
        onPageSelected={event => setActiveIndex(event.nativeEvent.position)}
      >
        {pages}
      </PagerView>

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outlineVariant,
          },
        ]}
      >
        {tabs.map((tab, index) => (
          <BottomNavItem
            key={tab.label}
            tab={tab}
            focused={activeIndex === index}
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
  tabItemSlot: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 3,
  },
  tabItem: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  tabItemContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
});

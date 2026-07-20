import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { techTokens } from '../theme/tech/tokens';
import { TechCornerBrackets } from '../components/tech/TechMotion';

export type FluidNotificationKind = 'info' | 'success' | 'warning' | 'error';

export type FluidNotificationInput = {
  title: string;
  message?: string;
  kind?: FluidNotificationKind;
  duration?: number;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type FluidNotificationContextValue = {
  showNotification: (input: FluidNotificationInput) => void;
  dismissNotification: () => void;
};

type ActiveNotification = FluidNotificationInput & { id: number };

const FluidNotificationContext = createContext<FluidNotificationContextValue | null>(null);

function withAlpha(color: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alpha}` : color;
}

function notificationIcon(kind: FluidNotificationKind): string {
  if (kind === 'success') return 'check-circle-outline';
  if (kind === 'warning') return 'alert-outline';
  if (kind === 'error') return 'alert-circle-outline';
  return 'information-outline';
}

export function FluidNotificationProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isTech, motion } = useVisualStyle();
  const [notification, setNotification] = useState<ActiveNotification | null>(null);
  const nextId = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const runningAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissNotification = useCallback(() => {
    clearTimer();
    runningAnimation.current?.stop();
    const animation = Animated.timing(progress, {
      toValue: 0,
      duration: motion.entrances ? 150 : 1,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    });
    runningAnimation.current = animation;
    animation.start(({ finished }) => {
      if (finished) setNotification(null);
    });
  }, [clearTimer, motion.entrances, progress]);

  const showNotification = useCallback(
    (input: FluidNotificationInput) => {
      clearTimer();
      runningAnimation.current?.stop();
      const active: ActiveNotification = {
        kind: 'info',
        duration: 2600,
        ...input,
        id: nextId.current++,
      };
      progress.setValue(0);
      setNotification(active);

      requestAnimationFrame(() => {
        const animation = Animated.timing(progress, {
          toValue: 1,
          duration: motion.entrances ? 220 : 1,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
          isInteraction: false,
        });
        runningAnimation.current = animation;
        animation.start();
      });

      if ((active.duration ?? 0) > 0) {
        timerRef.current = setTimeout(dismissNotification, active.duration);
      }
    },
    [clearTimer, dismissNotification, motion.entrances, progress],
  );

  const value = useMemo(
    () => ({ showNotification, dismissNotification }),
    [dismissNotification, showNotification],
  );

  const kind = notification?.kind ?? 'info';
  const accentColor = isTech
    ? kind === 'error'
      ? techTokens.colors.error
      : kind === 'warning'
        ? techTokens.colors.warning
        : kind === 'success'
          ? techTokens.colors.success
          : techTokens.colors.primary
    : kind === 'error'
      ? theme.colors.error
      : kind === 'warning'
        ? theme.colors.tertiary
        : kind === 'success'
          ? theme.colors.primary
          : theme.colors.secondary;

  function handlePress() {
    if (!notification) return;
    notification.onAction?.();
    dismissNotification();
  }

  return (
    <FluidNotificationContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {notification ? (
          <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 8 }]}>
            <Animated.View
              style={[
                styles.animationShell,
                {
                  opacity: progress,
                  transform: [
                    { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
                    { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                  ],
                },
              ]}
            >
              {isTech ? (
                <Pressable
                  onPress={handlePress}
                  style={({ pressed }) => [
                    styles.techNotice,
                    { borderColor: withAlpha(accentColor, '74'), opacity: pressed ? 0.82 : 1 },
                  ]}
                >
                  <TechCornerBrackets color={accentColor} />
                  <View style={[styles.techStatusLine, { backgroundColor: accentColor }]} />
                  <View style={styles.techHeaderRow}>
                    <Text style={[styles.techCode, { color: accentColor }]}>SYSTEM.NOTIFY / {kind.toUpperCase()}</Text>
                    <View style={[styles.techSignalDot, { backgroundColor: accentColor }]} />
                  </View>
                  <View style={styles.content}>
                    <View style={[styles.techIcon, { borderColor: withAlpha(accentColor, '72'), backgroundColor: withAlpha(accentColor, '16') }]}>
                      <Icon source={notification.icon ?? notificationIcon(kind)} size={22} color={accentColor} />
                    </View>
                    <View style={styles.textBlock}>
                      <Text numberOfLines={1} style={styles.techTitle}>{notification.title}</Text>
                      {notification.message ? (
                        <Text numberOfLines={2} style={styles.techMessage}>{notification.message}</Text>
                      ) : null}
                    </View>
                    {notification.actionLabel ? (
                      <Text style={[styles.actionText, { color: accentColor }]}>{notification.actionLabel}</Text>
                    ) : null}
                  </View>
                </Pressable>
              ) : (
                <Surface elevation={5} style={[styles.classicCloud, { backgroundColor: theme.colors.inverseSurface }]}>
                  <Pressable onPress={handlePress} style={({ pressed }) => [{ opacity: pressed ? 0.84 : 1 }]}>
                    <View style={styles.content}>
                      <View style={[styles.classicIcon, { backgroundColor: withAlpha(accentColor, '3D') }]}>
                        <Icon source={notification.icon ?? notificationIcon(kind)} size={22} color={theme.colors.inverseOnSurface} />
                      </View>
                      <View style={styles.textBlock}>
                        <Text variant="titleSmall" numberOfLines={1} style={{ color: theme.colors.inverseOnSurface, fontWeight: '900' }}>
                          {notification.title}
                        </Text>
                        {notification.message ? (
                          <Text variant="bodySmall" numberOfLines={2} style={{ marginTop: 2, color: withAlpha(theme.colors.inverseOnSurface, 'C7') }}>
                            {notification.message}
                          </Text>
                        ) : null}
                      </View>
                      {notification.actionLabel ? (
                        <Text variant="labelLarge" style={{ color: accentColor, marginLeft: 10, fontWeight: '900' }}>
                          {notification.actionLabel}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                </Surface>
              )}
            </Animated.View>
          </View>
        ) : null}
      </View>
    </FluidNotificationContext.Provider>
  );
}

export function useFluidNotification(): FluidNotificationContextValue {
  const context = useContext(FluidNotificationContext);
  if (!context) throw new Error('useFluidNotification must be used inside FluidNotificationProvider');
  return context;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 999,
    alignItems: 'center',
  },
  animationShell: { width: '92%', maxWidth: 480 },
  techNotice: {
    minHeight: 78,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(3,15,23,0.97)',
    paddingTop: 8,
    overflow: 'hidden',
    elevation: 8,
  },
  techStatusLine: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 2 },
  techHeaderRow: {
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  techCode: { fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  techSignalDot: { width: 5, height: 5, borderRadius: 3 },
  content: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  techIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techTitle: { color: techTokens.colors.text, fontSize: 14, fontWeight: '900' },
  techMessage: { marginTop: 3, color: techTokens.colors.textMuted, fontSize: 11, lineHeight: 16 },
  actionText: { marginLeft: 10, fontSize: 12, fontWeight: '900' },
  classicCloud: { borderRadius: 30, overflow: 'hidden' },
  classicIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1, minWidth: 0, marginLeft: 11 },
});

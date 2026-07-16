import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Icon, Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

type ActiveNotification = FluidNotificationInput & {
  id: number;
};

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
  const [notification, setNotification] = useState<ActiveNotification | null>(null);
  const nextId = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-34)).current;
  const scaleX = useRef(new Animated.Value(0.34)).current;
  const scaleY = useRef(new Animated.Value(0.72)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const blobScale = useRef(new Animated.Value(0.7)).current;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissNotification = useCallback(() => {
    clearTimer();
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -38,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleX, {
        toValue: 0.38,
        speed: 30,
        bounciness: 0,
        useNativeDriver: true,
      }),
      Animated.spring(scaleY, {
        toValue: 0.76,
        speed: 30,
        bounciness: 0,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setNotification(null);
      }
    });
  }, [clearTimer, contentOpacity, opacity, scaleX, scaleY, translateY]);

  const showNotification = useCallback(
    (input: FluidNotificationInput) => {
      clearTimer();
      const active: ActiveNotification = {
        kind: 'info',
        duration: 2600,
        ...input,
        id: nextId.current++,
      };

      opacity.stopAnimation();
      translateY.stopAnimation();
      scaleX.stopAnimation();
      scaleY.stopAnimation();
      contentOpacity.stopAnimation();
      blobScale.stopAnimation();

      opacity.setValue(0);
      translateY.setValue(-34);
      scaleX.setValue(0.34);
      scaleY.setValue(0.72);
      contentOpacity.setValue(0);
      blobScale.setValue(0.7);
      setNotification(active);

      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            speed: 20,
            bounciness: 7,
            useNativeDriver: true,
          }),
          Animated.spring(scaleX, {
            toValue: 1,
            speed: 17,
            bounciness: 8,
            useNativeDriver: true,
          }),
          Animated.spring(scaleY, {
            toValue: 1,
            speed: 20,
            bounciness: 6,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(90),
            Animated.timing(contentOpacity, {
              toValue: 1,
              duration: 170,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.spring(blobScale, {
              toValue: 1.12,
              speed: 16,
              bounciness: 10,
              useNativeDriver: true,
            }),
            Animated.spring(blobScale, {
              toValue: 1,
              speed: 20,
              bounciness: 2,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });

      if ((active.duration ?? 0) > 0) {
        timerRef.current = setTimeout(dismissNotification, active.duration);
      }
    },
    [
      blobScale,
      clearTimer,
      contentOpacity,
      dismissNotification,
      opacity,
      scaleX,
      scaleY,
      translateY,
    ],
  );

  const value = useMemo(
    () => ({ showNotification, dismissNotification }),
    [dismissNotification, showNotification],
  );

  const kind = notification?.kind ?? 'info';
  const accentColor =
    kind === 'error'
      ? theme.colors.error
      : kind === 'warning'
        ? theme.colors.tertiary
        : kind === 'success'
          ? theme.colors.primary
          : theme.colors.secondary;

  function handlePress() {
    if (!notification) return;
    if (notification.onAction) {
      notification.onAction();
    }
    dismissNotification();
  }

  return (
    <FluidNotificationContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {notification ? (
          <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 8 }]}>
            <Animated.View
              style={{
                width: '92%',
                maxWidth: 480,
                opacity,
                transform: [{ translateY }, { scaleX }, { scaleY }],
              }}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.leftBlob,
                  {
                    backgroundColor: withAlpha(accentColor, '42'),
                    transform: [{ scale: blobScale }],
                  },
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.rightBlob,
                  {
                    backgroundColor: withAlpha(accentColor, '35'),
                    transform: [{ scale: blobScale }],
                  },
                ]}
              />
              <Surface elevation={5} style={[styles.cloud, { backgroundColor: theme.colors.inverseSurface }]}>
                <TouchableRipple
                  borderless={false}
                  rippleColor={withAlpha(theme.colors.inverseOnSurface, '24')}
                  onPress={handlePress}
                  style={styles.cloudRipple}
                >
                  <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
                    <View style={[styles.iconBubble, { backgroundColor: withAlpha(accentColor, '3D') }]}>
                      <Icon
                        source={notification.icon ?? notificationIcon(kind)}
                        size={22}
                        color={theme.colors.inverseOnSurface}
                      />
                    </View>
                    <View style={styles.textBlock}>
                      <Text
                        variant="titleSmall"
                        numberOfLines={1}
                        style={{ color: theme.colors.inverseOnSurface, fontWeight: '900' }}
                      >
                        {notification.title}
                      </Text>
                      {notification.message ? (
                        <Text
                          variant="bodySmall"
                          numberOfLines={2}
                          style={{ marginTop: 2, color: withAlpha(theme.colors.inverseOnSurface, 'C7') }}
                        >
                          {notification.message}
                        </Text>
                      ) : null}
                    </View>
                    {notification.actionLabel ? (
                      <Text
                        variant="labelLarge"
                        style={{ color: accentColor, marginLeft: 10, fontWeight: '900' }}
                      >
                        {notification.actionLabel}
                      </Text>
                    ) : null}
                  </Animated.View>
                </TouchableRipple>
              </Surface>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </FluidNotificationContext.Provider>
  );
}

export function useFluidNotification(): FluidNotificationContextValue {
  const context = useContext(FluidNotificationContext);
  if (!context) {
    throw new Error('useFluidNotification must be used inside FluidNotificationProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 999,
    alignItems: 'center',
  },
  cloud: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  cloudRipple: {
    borderRadius: 30,
  },
  content: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  leftBlob: {
    position: 'absolute',
    left: 14,
    top: -7,
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  rightBlob: {
    position: 'absolute',
    right: 18,
    bottom: -6,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
});

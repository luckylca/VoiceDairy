import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';

export type VoiceOrbState =
  | 'idle'
  | 'initializing'
  | 'recording'
  | 'recognizing'
  | 'organizing'
  | 'success'
  | 'error';

type TechVoiceOrbProps = {
  state: VoiceOrbState;
  onPress: () => void;
  disabled?: boolean;
  durationText?: string;
};

const stateMeta: Record<VoiceOrbState, { label: string; icon: string; color: string }> = {
  idle: { label: '点击开始记录', icon: 'microphone-outline', color: techTokens.colors.primary },
  initializing: { label: '正在准备本地识别', icon: 'progress-clock', color: techTokens.colors.secondary },
  recording: { label: '再次点击停止', icon: 'stop', color: techTokens.colors.error },
  recognizing: { label: '正在本地识别', icon: 'waveform', color: techTokens.colors.primary },
  organizing: { label: '正在智能整理', icon: 'creation', color: techTokens.colors.secondary },
  success: { label: '记录已保存', icon: 'check-bold', color: techTokens.colors.success },
  error: { label: '处理失败，点击重试', icon: 'alert-circle-outline', color: techTokens.colors.error },
};

export function TechVoiceOrb({ state, onPress, disabled = false, durationText }: TechVoiceOrbProps) {
  const { motionLevel } = useVisualStyle();
  const pulse = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const meta = stateMeta[state];

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);

    if (motionLevel === 'off' || motionLevel === 'reduced' || state === 'success' || state === 'error') {
      return;
    }

    const duration = state === 'recording' ? 780 : state === 'idle' ? 1900 : 1180;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [motionLevel, pulse, state]);

  const animatedRing = useMemo(
    () => ({
      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.08] }),
      transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.42] }) }],
    }),
    [pulse],
  );

  const coreAnimated = useMemo(
    () => ({
      transform: [
        { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, state === 'recording' ? 1.1 : 1.04] }) },
      ],
    }),
    [pulse, state],
  );

  function animatePress(toValue: number) {
    Animated.spring(pressScale, {
      toValue,
      speed: 36,
      bounciness: 2,
      useNativeDriver: true,
    }).start();
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.ringOuter, { borderColor: meta.color }, animatedRing]} />
      <View style={[styles.ringStatic, { borderColor: `${meta.color}66` }]} />
      <Animated.View style={[styles.pressLayer, { transform: [{ scale: pressScale }] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={meta.label}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onPress}
          onPressIn={() => animatePress(0.94)}
          onPressOut={() => animatePress(1)}
        >
          <Animated.View
            style={[
              styles.core,
              { borderColor: `${meta.color}CC`, shadowColor: meta.color, opacity: disabled ? 0.55 : 1 },
              coreAnimated,
            ]}
          >
            <View style={[styles.coreInner, { backgroundColor: `${meta.color}20` }]}>
              <Icon source={meta.icon} size={state === 'recording' ? 42 : 48} color={meta.color} />
              {durationText ? <Text style={[styles.duration, { color: meta.color }]}>{durationText}</Text> : null}
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
      <Text style={[styles.label, { color: state === 'error' ? techTokens.colors.error : techTokens.colors.text }]}>
        {meta.label}
      </Text>
      <Text style={styles.hint}>SenseVoice · 端侧识别</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 330,
  },
  pressLayer: {
    zIndex: 3,
  },
  core: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1.5,
    backgroundColor: 'rgba(8, 24, 34, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.48,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  coreInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringStatic: {
    position: 'absolute',
    top: 58,
    width: 208,
    height: 208,
    borderRadius: 104,
    borderWidth: 1,
  },
  ringOuter: {
    position: 'absolute',
    top: 48,
    width: 228,
    height: 228,
    borderRadius: 114,
    borderWidth: 1,
  },
  duration: {
    marginTop: 8,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  label: {
    marginTop: 32,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  hint: {
    marginTop: 6,
    color: techTokens.colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
  },
});

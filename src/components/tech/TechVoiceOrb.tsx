import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { useMainTabActive } from '../../navigation/MainTabActivityContext';

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
  amplitude?: number;
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

export function TechVoiceOrb({
  state,
  onPress,
  disabled = false,
  durationText,
  amplitude = 0,
}: TechVoiceOrbProps) {
  const { motion } = useVisualStyle();
  const tabActive = useMainTabActive();
  const cycle = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const amplitudeValue = useRef(new Animated.Value(0)).current;
  const stateKick = useRef(new Animated.Value(1)).current;
  const meta = stateMeta[state];

  // During recording and inference, PCM/state feedback is already visible. Keep
  // the continuous orbit only in idle state so audio work gets the frame budget.
  const shouldAnimate = tabActive && motion.ambient && state === 'idle';

  useEffect(() => {
    amplitudeValue.stopAnimation();
    Animated.timing(amplitudeValue, {
      toValue: state === 'recording' ? Math.max(0, Math.min(1, amplitude)) : 0,
      duration: 85,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [amplitude, amplitudeValue, state]);

  useEffect(() => {
    stateKick.stopAnimation();
    stateKick.setValue(state === 'success' ? 0.86 : state === 'error' ? 0.92 : 0.96);
    Animated.spring(stateKick, {
      toValue: 1,
      speed: 28,
      bounciness: state === 'success' ? 8 : 3,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [state, stateKick]);

  useEffect(() => {
    cycle.stopAnimation();
    cycle.setValue(0);
    if (!shouldAnimate) return;

    const loop = Animated.loop(
      Animated.timing(cycle, {
        toValue: 1,
        duration: Math.max(3600, Math.round(9000 * motion.durationScale)),
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [cycle, motion.durationScale, shouldAnimate]);

  const pulse = cycle.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });
  const rotation = cycle.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const reverseRotation = cycle.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  const coreScale = useMemo(
    () =>
      Animated.multiply(
        stateKick,
        Animated.add(
          1,
          Animated.add(
            pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.012] }),
            amplitudeValue.interpolate({ inputRange: [0, 1], outputRange: [0, 0.11] }),
          ),
        ),
      ),
    [amplitudeValue, pulse, stateKick],
  );

  function animatePress(toValue: number) {
    if (!motion.pressFeedback) return;
    pressScale.stopAnimation();
    Animated.timing(pressScale, {
      toValue,
      duration: 65,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }

  const amplitudeBars = Array.from({ length: 9 }, (_, index) => {
    const centerDistance = Math.abs(index - 4) / 4;
    const base = 6 + (1 - centerDistance) * 8;
    const height = base + amplitude * (15 + (1 - centerDistance) * 20);
    return (
      <View
        key={index}
        style={[
          styles.miniBar,
          {
            height,
            opacity: 0.38 + amplitude * 0.5,
            backgroundColor: amplitude > 0.65 ? techTokens.colors.success : meta.color,
          },
        ]}
      />
    );
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.ringPulse,
          {
            borderColor: meta.color,
            opacity: shouldAnimate ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.04] }) : 0.12,
            transform: [
              {
                scale: Animated.add(
                  1,
                  Animated.add(
                    shouldAnimate ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }) : 0,
                    amplitudeValue.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] }),
                  ),
                ),
              },
            ],
          },
        ]}
      />

      <Animated.View style={[styles.orbitOuter, { borderColor: `${meta.color}36`, transform: [{ rotate: rotation }] }]}>
        <View style={[styles.orbitNode, styles.nodeOne, { backgroundColor: meta.color }]} />
        <View style={[styles.orbitNodeSmall, styles.nodeTwo, { backgroundColor: techTokens.colors.secondary }]} />
      </Animated.View>
      <Animated.View style={[styles.orbitInner, { borderColor: `${meta.color}48`, transform: [{ rotate: reverseRotation }] }]}>
        <View style={[styles.orbitNodeSmall, styles.nodeThree, { backgroundColor: techTokens.colors.success }]} />
      </Animated.View>

      <View style={[styles.crossHairHorizontal, { backgroundColor: `${meta.color}20` }]} />
      <View style={[styles.crossHairVertical, { backgroundColor: `${meta.color}20` }]} />

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
            renderToHardwareTextureAndroid
            style={[
              styles.core,
              {
                borderColor: `${meta.color}C7`,
                opacity: disabled ? 0.55 : 1,
                transform: [{ scale: coreScale }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.coreGlow,
                {
                  backgroundColor: `${meta.color}16`,
                  opacity: amplitudeValue.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.92] }),
                  transform: [
                    { scale: amplitudeValue.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }) },
                  ],
                },
              ]}
            />
            <View style={[styles.coreInner, { backgroundColor: `${meta.color}14` }]}>
              <Icon source={meta.icon} size={state === 'recording' ? 39 : 47} color={meta.color} />
              {durationText ? <Text style={[styles.duration, { color: meta.color }]}>{durationText}</Text> : null}
              {state === 'recording' ? <View style={styles.miniWave}>{amplitudeBars}</View> : null}
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>

      <Text style={[styles.label, { color: state === 'error' ? techTokens.colors.error : techTokens.colors.text }]}>
        {meta.label}
      </Text>
      <Text style={styles.hint}>
        {state === 'recording'
          ? `PCM LEVEL ${Math.round(amplitude * 100).toString().padStart(3, '0')}%`
          : 'SENSEVOICE · EDGE INFERENCE'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 336,
  },
  pressLayer: {
    zIndex: 6,
  },
  core: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    backgroundColor: 'rgba(5,19,28,0.97)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coreGlow: {
    position: 'absolute',
    width: 142,
    height: 142,
    borderRadius: 71,
  },
  coreInner: {
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitOuter: {
    position: 'absolute',
    top: 42,
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  orbitInner: {
    position: 'absolute',
    top: 61,
    width: 198,
    height: 198,
    borderRadius: 99,
    borderWidth: 1,
  },
  orbitNode: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  orbitNodeSmall: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  nodeOne: { right: 26, top: 50 },
  nodeTwo: { left: 28, bottom: 48 },
  nodeThree: { right: 1, top: 92 },
  ringPulse: {
    position: 'absolute',
    top: 52,
    width: 216,
    height: 216,
    borderRadius: 108,
    borderWidth: 1,
  },
  crossHairHorizontal: {
    position: 'absolute',
    top: 158,
    width: 266,
    height: StyleSheet.hairlineWidth,
  },
  crossHairVertical: {
    position: 'absolute',
    top: 28,
    width: StyleSheet.hairlineWidth,
    height: 260,
  },
  duration: {
    marginTop: 5,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  miniWave: {
    height: 27,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  miniBar: {
    width: 2,
    borderRadius: 1,
  },
  label: {
    marginTop: 27,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  hint: {
    marginTop: 6,
    color: techTokens.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    fontVariant: ['tabular-nums'],
  },
});

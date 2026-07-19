import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const pulse = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const reverseRotate = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const amplitudeValue = useRef(new Animated.Value(0)).current;
  const stateKick = useRef(new Animated.Value(1)).current;
  const meta = stateMeta[state];

  useEffect(() => {
    Animated.spring(amplitudeValue, {
      toValue: state === 'recording' ? Math.max(0, Math.min(1, amplitude)) : 0,
      speed: 42,
      bounciness: 1,
      useNativeDriver: true,
    }).start();
  }, [amplitude, amplitudeValue, state]);

  useEffect(() => {
    pulse.stopAnimation();
    rotate.stopAnimation();
    reverseRotate.stopAnimation();
    pulse.setValue(0);
    rotate.setValue(0);
    reverseRotate.setValue(0);

    Animated.sequence([
      Animated.timing(stateKick, {
        toValue: state === 'success' ? 0.82 : state === 'error' ? 0.9 : 0.94,
        duration: Math.max(70, Math.round(130 * Math.max(0.4, motion.durationScale))),
        useNativeDriver: true,
      }),
      Animated.spring(stateKick, {
        toValue: 1,
        speed: 25,
        bounciness: state === 'success' ? 10 : 5,
        useNativeDriver: true,
      }),
    ]).start();

    if (!motion.ambient || state === 'success' || state === 'error') return;

    const pulseDuration = state === 'recording' ? 620 : state === 'idle' ? 1800 : 980;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: Math.max(260, Math.round(pulseDuration * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: Math.max(260, Math.round(pulseDuration * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const rotateLoop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: Math.max(2100, Math.round((state === 'recording' ? 5200 : 9000) * motion.durationScale)),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const reverseLoop = Animated.loop(
      Animated.timing(reverseRotate, {
        toValue: 1,
        duration: Math.max(2600, Math.round((state === 'recording' ? 6900 : 12000) * motion.durationScale)),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    pulseLoop.start();
    rotateLoop.start();
    reverseLoop.start();
    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
      reverseLoop.stop();
    };
  }, [motion.ambient, motion.durationScale, pulse, reverseRotate, rotate, state, stateKick]);

  const coreScale = useMemo(
    () =>
      Animated.multiply(
        stateKick,
        Animated.add(
          1,
          Animated.add(
            pulse.interpolate({ inputRange: [0, 1], outputRange: [0, state === 'recording' ? 0.035 : 0.018] }),
            amplitudeValue.interpolate({ inputRange: [0, 1], outputRange: [0, 0.16] }),
          ),
        ),
      ),
    [amplitudeValue, pulse, state, stateKick],
  );

  const outerScale = Animated.add(
    1,
    Animated.add(
      pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.34] }),
      amplitudeValue.interpolate({ inputRange: [0, 1], outputRange: [0, 0.24] }),
    ),
  );

  const rotateValue = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const reverseRotateValue = reverseRotate.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  function animatePress(toValue: number) {
    if (!motion.pressFeedback) return;
    Animated.spring(pressScale, {
      toValue,
      speed: 38,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }

  const amplitudeBars = Array.from({ length: 13 }, (_, index) => {
    const centerDistance = Math.abs(index - 6) / 6;
    const base = 7 + (1 - centerDistance) * 11;
    const height = base + amplitude * (25 + (1 - centerDistance) * 25);
    return (
      <View
        key={index}
        style={[
          styles.miniBar,
          {
            height,
            opacity: 0.34 + amplitude * 0.66,
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
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.44, 0.04] }),
            transform: [{ scale: outerScale }],
          },
        ]}
      />

      <Animated.View style={[styles.orbitOuter, { borderColor: `${meta.color}3D`, transform: [{ rotate: rotateValue }] }]}>
        <View style={[styles.orbitNode, styles.nodeOne, { backgroundColor: meta.color, shadowColor: meta.color }]} />
        <View style={[styles.orbitNodeSmall, styles.nodeTwo, { backgroundColor: techTokens.colors.secondary }]} />
      </Animated.View>
      <Animated.View style={[styles.orbitInner, { borderColor: `${meta.color}55`, transform: [{ rotate: reverseRotateValue }] }]}>
        <View style={[styles.orbitNodeSmall, styles.nodeThree, { backgroundColor: techTokens.colors.success }]} />
      </Animated.View>

      <View style={[styles.crossHairHorizontal, { backgroundColor: `${meta.color}29` }]} />
      <View style={[styles.crossHairVertical, { backgroundColor: `${meta.color}29` }]} />

      <Animated.View style={[styles.pressLayer, { transform: [{ scale: pressScale }] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={meta.label}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onPress}
          onPressIn={() => animatePress(0.92)}
          onPressOut={() => animatePress(1)}
        >
          <Animated.View
            style={[
              styles.core,
              {
                borderColor: `${meta.color}D9`,
                shadowColor: meta.color,
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
                  opacity: amplitudeValue.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
                  transform: [
                    {
                      scale: amplitudeValue.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.16] }),
                    },
                  ],
                },
              ]}
            />
            <View style={[styles.coreInner, { backgroundColor: `${meta.color}16` }]}>
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
        {state === 'recording' ? `PCM LEVEL ${Math.round(amplitude * 100).toString().padStart(3, '0')}%` : 'SENSEVOICE · EDGE INFERENCE'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 344,
  },
  pressLayer: {
    zIndex: 6,
  },
  core: {
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 1.5,
    backgroundColor: 'rgba(5, 19, 28, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.56,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
    overflow: 'hidden',
  },
  coreGlow: {
    position: 'absolute',
    width: 145,
    height: 145,
    borderRadius: 73,
  },
  coreInner: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.055)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitOuter: {
    position: 'absolute',
    top: 42,
    width: 244,
    height: 244,
    borderRadius: 122,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  orbitInner: {
    position: 'absolute',
    top: 61,
    width: 206,
    height: 206,
    borderRadius: 103,
    borderWidth: 1,
  },
  orbitNode: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  orbitNodeSmall: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  nodeOne: { right: 26, top: 52 },
  nodeTwo: { left: 30, bottom: 50 },
  nodeThree: { right: 1, top: 96 },
  ringPulse: {
    position: 'absolute',
    top: 52,
    width: 224,
    height: 224,
    borderRadius: 112,
    borderWidth: 1,
  },
  crossHairHorizontal: {
    position: 'absolute',
    top: 163,
    width: 278,
    height: StyleSheet.hairlineWidth,
  },
  crossHairVertical: {
    position: 'absolute',
    top: 27,
    width: StyleSheet.hairlineWidth,
    height: 272,
  },
  duration: {
    marginTop: 6,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  miniWave: {
    height: 22,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  miniBar: {
    width: 2,
    minHeight: 3,
    borderRadius: 1,
  },
  label: {
    marginTop: 35,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  hint: {
    marginTop: 7,
    color: techTokens.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    fontVariant: ['tabular-nums'],
  },
});

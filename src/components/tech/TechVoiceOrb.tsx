import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { useMainTabActive } from '../../navigation/MainTabActivityContext';
import { useTechMotionValue } from './TechMotionProvider';

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
  const { phase, running } = useTechMotionValue();
  const meta = stateMeta[state];
  const level = state === 'recording' ? Math.max(0, Math.min(1, amplitude)) : 0;
  const runOrbit = tabActive && running && motion.ambient && state !== 'recording';

  const amplitudeBars = Array.from({ length: 9 }, (_, index) => {
    const centerDistance = Math.abs(index - 4) / 4;
    const base = 6 + (1 - centerDistance) * 8;
    const height = base + level * (15 + (1 - centerDistance) * 20);
    return (
      <View
        key={index}
        style={[
          styles.miniBar,
          {
            height,
            opacity: 0.38 + level * 0.5,
            backgroundColor: level > 0.65 ? techTokens.colors.success : meta.color,
          },
        ]}
      />
    );
  });

  const idlePulse = runOrbit
    ? phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.98, 1.035, 0.98] })
    : 1;

  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.ringPulse,
            {
              borderColor: meta.color,
              opacity:
                state === 'recording'
                  ? 0.14 + level * 0.28
                  : runOrbit
                    ? phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.26, 0.1] })
                    : 0.12,
              transform: [
                {
                  scale:
                    state === 'recording'
                      ? 1 + level * 0.12
                      : runOrbit
                        ? phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.96, 1.12, 0.96] })
                        : 1,
                },
              ],
            },
          ]}
        />

        <Animated.View
          renderToHardwareTextureAndroid
          style={[
            styles.orbitOuter,
            { borderColor: `${meta.color}36` },
            {
              transform: [
                {
                  rotate: runOrbit
                    ? phase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
                    : '14deg',
                },
              ],
            },
          ]}
        >
          <View style={[styles.orbitNode, styles.nodeOne, { backgroundColor: meta.color }]} />
          <View style={[styles.orbitNodeSmall, styles.nodeTwo, { backgroundColor: techTokens.colors.secondary }]} />
        </Animated.View>
        <Animated.View
          renderToHardwareTextureAndroid
          style={[
            styles.orbitInner,
            { borderColor: `${meta.color}48` },
            {
              transform: [
                {
                  rotate: runOrbit
                    ? phase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] })
                    : '-19deg',
                },
              ],
            },
          ]}
        >
          <View style={[styles.orbitNodeSmall, styles.nodeThree, { backgroundColor: techTokens.colors.success }]} />
        </Animated.View>

        <View style={[styles.crossHairHorizontal, { backgroundColor: `${meta.color}20` }]} />
        <View style={[styles.crossHairVertical, { backgroundColor: `${meta.color}20` }]} />

        <Animated.View style={[styles.corePosition, { transform: [{ scale: idlePulse }] }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={meta.label}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [
              styles.pressLayer,
              {
                opacity: disabled ? 0.55 : 1,
                transform: [
                  {
                    scale: (1 + level * 0.075) * (pressed && motion.pressFeedback ? 0.96 : 1),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.core, { borderColor: `${meta.color}C7` }]}>
              <View
                style={[
                  styles.coreGlow,
                  {
                    backgroundColor: `${meta.color}16`,
                    opacity: 0.55 + level * 0.37,
                    transform: [{ scale: 0.9 + level * 0.2 }],
                  },
                ]}
              />
              <View style={[styles.coreInner, { backgroundColor: `${meta.color}14` }]}>
                <Icon source={meta.icon} size={state === 'recording' ? 39 : 47} color={meta.color} />
                {durationText ? <Text style={[styles.duration, { color: meta.color }]}>{durationText}</Text> : null}
                {state === 'recording' ? <View style={styles.miniWave}>{amplitudeBars}</View> : null}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </View>

      <Text style={[styles.label, { color: state === 'error' ? techTokens.colors.error : techTokens.colors.text }]}>
        {meta.label}
      </Text>
      <Text style={styles.hint}>
        {state === 'recording'
          ? `PCM LEVEL ${Math.round(level * 100).toString().padStart(3, '0')}%`
          : 'SENSEVOICE · EDGE INFERENCE'}
      </Text>
    </View>
  );
}

const STAGE_SIZE = 276;

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 356,
  },
  stage: {
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corePosition: {
    position: 'absolute',
    left: (STAGE_SIZE - 160) / 2,
    top: (STAGE_SIZE - 160) / 2,
    width: 160,
    height: 160,
  },
  pressLayer: { width: 160, height: 160 },
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
    left: (STAGE_SIZE - 236) / 2,
    top: (STAGE_SIZE - 236) / 2,
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  orbitInner: {
    position: 'absolute',
    left: (STAGE_SIZE - 198) / 2,
    top: (STAGE_SIZE - 198) / 2,
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
    left: (STAGE_SIZE - 216) / 2,
    top: (STAGE_SIZE - 216) / 2,
    width: 216,
    height: 216,
    borderRadius: 108,
    borderWidth: 1,
  },
  crossHairHorizontal: {
    position: 'absolute',
    left: 5,
    top: STAGE_SIZE / 2,
    width: STAGE_SIZE - 10,
    height: StyleSheet.hairlineWidth,
  },
  crossHairVertical: {
    position: 'absolute',
    left: STAGE_SIZE / 2,
    top: 5,
    width: StyleSheet.hairlineWidth,
    height: STAGE_SIZE - 10,
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
  miniBar: { width: 2, borderRadius: 1 },
  label: {
    marginTop: 1,
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

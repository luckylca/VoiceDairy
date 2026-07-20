import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const meta = stateMeta[state];
  const level = state === 'recording' ? Math.max(0, Math.min(1, amplitude)) : 0;
  const coreScale = 1 + level * 0.075;
  const ringScale = 1 + level * 0.12;

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

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.ringPulse,
          {
            borderColor: meta.color,
            opacity: state === 'recording' ? 0.14 + level * 0.28 : 0.12,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      <View style={[styles.orbitOuter, { borderColor: `${meta.color}36` }]}>
        <View style={[styles.orbitNode, styles.nodeOne, { backgroundColor: meta.color }]} />
        <View style={[styles.orbitNodeSmall, styles.nodeTwo, { backgroundColor: techTokens.colors.secondary }]} />
      </View>
      <View style={[styles.orbitInner, { borderColor: `${meta.color}48` }]}>
        <View style={[styles.orbitNodeSmall, styles.nodeThree, { backgroundColor: techTokens.colors.success }]} />
      </View>

      <View style={[styles.crossHairHorizontal, { backgroundColor: `${meta.color}20` }]} />
      <View style={[styles.crossHairVertical, { backgroundColor: `${meta.color}20` }]} />

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
                scale: coreScale * (pressed && motion.pressFeedback ? 0.96 : 1),
              },
            ],
          },
        ]}
      >
        <View
          style={[
            styles.core,
            {
              borderColor: `${meta.color}C7`,
            },
          ]}
        >
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
    transform: [{ rotate: '14deg' }],
  },
  orbitInner: {
    position: 'absolute',
    top: 61,
    width: 198,
    height: 198,
    borderRadius: 99,
    borderWidth: 1,
    transform: [{ rotate: '-19deg' }],
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
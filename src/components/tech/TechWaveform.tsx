import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { useMainTabActive } from '../../navigation/MainTabActivityContext';
import { TechCornerBrackets } from './TechMotion';

type TechWaveformProps = {
  levels: number[];
  amplitude: number;
  active?: boolean;
  label?: string;
};

const BAR_COUNT = 24;

export function TechWaveform({
  levels,
  amplitude,
  active = false,
  label = 'LIVE PCM SIGNAL',
}: TechWaveformProps) {
  const { motion } = useVisualStyle();
  const tabActive = useMainTabActive();
  const pulse = useRef(new Animated.Value(0)).current;
  const shouldAnimate = active && tabActive && motion.ambient;

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    if (!shouldAnimate) return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: Math.max(360, Math.round(760 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: Math.max(360, Math.round(760 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [motion.durationScale, pulse, shouldAnimate]);

  const normalizedLevels = useMemo(() => {
    const source = levels.slice(-BAR_COUNT);
    const missing = BAR_COUNT - source.length;
    const seeded = Array.from({ length: Math.max(0, missing) }, (_, index) => {
      const taper = (index % 5) / 5;
      return active ? 0.035 + taper * 0.025 : 0.025;
    });
    return [...seeded, ...source].map(value => Math.max(0.02, Math.min(1, value)));
  }, [active, levels]);

  return (
    <View style={styles.root} renderToHardwareTextureAndroid>
      <TechCornerBrackets color={active ? techTokens.colors.primary : techTokens.colors.line} />
      <View style={styles.header}>
        <View style={styles.liveRow}>
          <Animated.View
            style={[
              styles.liveDot,
              {
                opacity: shouldAnimate
                  ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.42, 1] })
                  : 0.3,
                transform: [
                  {
                    scale: shouldAnimate
                      ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.18] })
                      : 1,
                  },
                ],
              },
            ]}
          />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.levelText}>{Math.round(amplitude * 100).toString().padStart(3, '0')}%</Text>
      </View>

      <View style={styles.waveArea}>
        <View style={styles.centerLine} />
        {normalizedLevels.map((value, index) => {
          const emphasis = index >= BAR_COUNT - 3 ? amplitude * 0.28 : 0;
          const height = 7 + Math.pow(Math.min(1, value + emphasis), 0.74) * 58;
          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  height,
                  opacity: active ? 0.42 + value * 0.5 : 0.22,
                  backgroundColor:
                    value > 0.72
                      ? techTokens.colors.secondary
                      : value > 0.38
                        ? techTokens.colors.success
                        : techTokens.colors.primary,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.meta}>16 KHZ</Text>
        <Text style={styles.meta}>MONO PCM16</Text>
        <Text style={[styles.meta, active && { color: techTokens.colors.success }]}>● {active ? 'CAPTURING' : 'STANDBY'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 126,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    backgroundColor: 'rgba(3,13,20,0.74)',
    paddingHorizontal: 13,
    paddingTop: 11,
    paddingBottom: 9,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 7,
    backgroundColor: techTokens.colors.error,
  },
  label: {
    color: techTokens.colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.35,
  },
  levelText: {
    color: techTokens.colors.primary,
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  waveArea: {
    height: 70,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  centerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(85,217,255,0.12)',
  },
  bar: {
    width: 3,
    minHeight: 4,
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    color: techTokens.colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
});

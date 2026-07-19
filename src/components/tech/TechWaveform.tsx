import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { TechCornerBrackets } from './TechMotion';

type TechWaveformProps = {
  levels: number[];
  amplitude: number;
  active?: boolean;
  label?: string;
};

const BAR_COUNT = 34;

export function TechWaveform({
  levels,
  amplitude,
  active = false,
  label = 'LIVE PCM SIGNAL',
}: TechWaveformProps) {
  const { motion } = useVisualStyle();
  const scan = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scan.stopAnimation();
    pulse.stopAnimation();
    scan.setValue(0);
    pulse.setValue(0);
    if (!active || !motion.decorative) return;

    const scanLoop = Animated.loop(
      Animated.timing(scan, {
        toValue: 1,
        duration: Math.max(700, Math.round(1800 * motion.durationScale)),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: Math.max(260, Math.round(620 * motion.durationScale)),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: Math.max(260, Math.round(620 * motion.durationScale)),
          useNativeDriver: true,
        }),
      ]),
    );
    scanLoop.start();
    pulseLoop.start();
    return () => {
      scanLoop.stop();
      pulseLoop.stop();
    };
  }, [active, motion.decorative, motion.durationScale, pulse, scan]);

  const normalizedLevels = useMemo(() => {
    const source = levels.slice(-BAR_COUNT);
    const missing = BAR_COUNT - source.length;
    const seeded = Array.from({ length: Math.max(0, missing) }, (_, index) => {
      const taper = (index % 7) / 7;
      return active ? 0.035 + taper * 0.035 : 0.025;
    });
    return [...seeded, ...source].map(value => Math.max(0.02, Math.min(1, value)));
  }, [active, levels]);

  return (
    <View style={styles.root}>
      <TechCornerBrackets color={active ? techTokens.colors.primary : techTokens.colors.line} />
      <View style={styles.header}>
        <View style={styles.liveRow}>
          <Animated.View
            style={[
              styles.liveDot,
              {
                opacity: active
                  ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.38, 1] })
                  : 0.25,
                transform: [
                  {
                    scale: active
                      ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.35] })
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
          const emphasis = index >= BAR_COUNT - 4 ? amplitude * 0.35 : 0;
          const height = 8 + Math.pow(Math.min(1, value + emphasis), 0.72) * 61;
          return (
            <Animated.View
              key={`${index}-${levels.length}`}
              style={[
                styles.bar,
                {
                  height,
                  opacity: active ? 0.45 + value * 0.55 : 0.24,
                  backgroundColor:
                    value > 0.72
                      ? techTokens.colors.secondary
                      : value > 0.38
                        ? techTokens.colors.success
                        : techTokens.colors.primary,
                  transform: [
                    {
                      scaleY: active
                        ? 1 + Math.sin((index / BAR_COUNT) * Math.PI) * motion.intensity * 0.08
                        : 1,
                    },
                  ],
                },
              ]}
            />
          );
        })}

        {active && motion.decorative ? (
          <Animated.View
            style={[
              styles.scanLine,
              {
                opacity: scan.interpolate({ inputRange: [0, 0.08, 0.92, 1], outputRange: [0, 1, 0.5, 0] }),
                transform: [
                  { translateX: scan.interpolate({ inputRange: [0, 1], outputRange: [-20, 340] }) },
                ],
              },
            ]}
          />
        ) : null}
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
    minHeight: 132,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    backgroundColor: 'rgba(3, 13, 20, 0.74)',
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
    shadowColor: techTokens.colors.error,
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 3,
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
    height: 75,
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
    backgroundColor: 'rgba(85, 217, 255, 0.14)',
  },
  bar: {
    width: 3.1,
    minHeight: 4,
    borderRadius: 2,
    shadowColor: techTokens.colors.primary,
    shadowOpacity: 0.42,
    shadowRadius: 3,
    elevation: 1,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    top: 2,
    bottom: 2,
    width: 2,
    backgroundColor: '#C6F7FF',
    shadowColor: techTokens.colors.primary,
    shadowOpacity: 1,
    shadowRadius: 9,
    elevation: 4,
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

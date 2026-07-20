import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { useMainTabActive } from '../../navigation/MainTabActivityContext';
import {
  getAsrActivity,
  subscribeAsrActivity,
  type AsrActivity,
} from '../../services/asr/AsrService';
import { useTechMotionPhase } from './TechMotionClock';

type TechScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  ambient?: boolean;
};

type Particle = {
  left: number;
  top: number;
  size: number;
  opacity: number;
};

export function TechScreen({ children, style, ambient = true }: TechScreenProps) {
  const { width, height } = useWindowDimensions();
  const { motion, motionLevel } = useVisualStyle();
  const tabActive = useMainTabActive();
  const [asrActivity, setAsrActivity] = useState<AsrActivity>(getAsrActivity());

  useEffect(() => subscribeAsrActivity(setAsrActivity), []);

  const effectsAllowed = tabActive && asrActivity === 'idle';
  const runAmbient = ambient && effectsAllowed && motion.ambient;
  const showDecorative = effectsAllowed && motion.decorative;
  const fps = motionLevel === 'full' ? 24 : 14;
  const periodMs = Math.max(5200, Math.round(9000 * Math.max(0.65, motion.durationScale)));
  const phase = useTechMotionPhase(runAmbient, fps, periodMs);

  const wave = (Math.sin(phase * Math.PI * 2) + 1) / 2;
  const reverseWave = 1 - wave;
  const scanProgress = (phase * 1.65) % 1;
  const rotation = `${-12 + phase * 40}deg`;
  const reverseRotation = `${18 - phase * 38}deg`;

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: showDecorative ? motion.particleCount : 0 }, (_, index) => ({
        left: (((index * 73 + 19) % 97) / 100) * width,
        top: (((index * 47 + 13) % 101) / 100) * height,
        size: 1.4 + (index % 3) * 0.8,
        opacity: 0.22 + (index % 4) * 0.11,
      })),
    [height, motion.particleCount, showDecorative, width],
  );

  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.gridLayer}>
          {Array.from({ length: 7 }, (_, index) => (
            <View key={`h-${index}`} style={[styles.gridHorizontal, { top: `${index * 16.66}%` }]} />
          ))}
          {Array.from({ length: 5 }, (_, index) => (
            <View key={`v-${index}`} style={[styles.gridVertical, { left: `${index * 25}%` }]} />
          ))}
        </View>

        <View
          style={[
            styles.glowPrimary,
            {
              opacity: runAmbient ? 0.2 + wave * 0.24 : 0.15,
              transform: [
                { translateX: runAmbient ? -20 + wave * 38 : 0 },
                { translateY: runAmbient ? 10 - wave * 26 : 0 },
                { scale: runAmbient ? 0.92 + wave * 0.13 : 0.96 },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.glowSecondary,
            {
              opacity: runAmbient ? 0.1 + reverseWave * 0.17 : 0.09,
              transform: [{ scale: runAmbient ? 0.93 + reverseWave * 0.1 : 0.96 }],
            },
          ]}
        />

        {showDecorative ? (
          <>
            <View style={[styles.orbitLarge, { transform: [{ rotate: rotation }] }]}>
              <View style={styles.orbitNodePrimary} />
              <View style={styles.orbitNodeSecondary} />
            </View>
            <View style={[styles.orbitSmall, { transform: [{ rotate: reverseRotation }] }]}>
              <View style={styles.orbitNodeSmall} />
            </View>
          </>
        ) : null}

        {particles.length > 0 ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: runAmbient ? 0.72 + wave * 0.28 : 0.7,
                transform: [
                  { translateY: runAmbient ? 8 - phase * 20 : 0 },
                  { translateX: runAmbient ? -4 + wave * 10 : 0 },
                ],
              },
            ]}
          >
            {particles.map((particle, index) => (
              <View
                key={`particle-${index}`}
                style={[
                  styles.particle,
                  {
                    left: particle.left,
                    top: particle.top,
                    width: particle.size,
                    height: particle.size,
                    borderRadius: particle.size,
                    opacity: particle.opacity,
                  },
                ]}
              />
            ))}
          </View>
        ) : null}

        {showDecorative && motion.particleCount > 4 ? (
          <View
            style={[
              styles.scanBeam,
              {
                opacity: runAmbient
                  ? scanProgress < 0.08
                    ? (scanProgress / 0.08) * 0.36
                    : (1 - scanProgress) * 0.22
                  : 0,
                transform: [{ translateY: -60 + scanProgress * (height + 120) }],
              },
            ]}
          />
        ) : null}

        <View style={styles.vignetteTop} />
        <View style={styles.vignetteBottom} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: techTokens.colors.background,
    overflow: 'hidden',
  },
  gridLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
  },
  gridHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: techTokens.colors.line,
  },
  gridVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: techTokens.colors.line,
  },
  glowPrimary: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -110,
    right: -135,
    backgroundColor: techTokens.colors.glow,
  },
  glowSecondary: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    left: -150,
    bottom: -120,
    backgroundColor: techTokens.colors.glowSecondary,
  },
  orbitLarge: {
    position: 'absolute',
    width: 290,
    height: 290,
    borderRadius: 145,
    borderWidth: 1,
    borderColor: 'rgba(85,217,255,0.08)',
    right: -170,
    top: 60,
  },
  orbitSmall: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(142,124,255,0.10)',
    left: -110,
    top: '43%',
  },
  orbitNodePrimary: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: techTokens.colors.primary,
    top: 36,
    right: 47,
  },
  orbitNodeSecondary: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: techTokens.colors.secondary,
    bottom: 48,
    left: 31,
  },
  orbitNodeSmall: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: techTokens.colors.success,
    right: 15,
    top: 68,
  },
  particle: {
    position: 'absolute',
    backgroundColor: techTokens.colors.primary,
  },
  scanBeam: {
    position: 'absolute',
    left: -20,
    right: -20,
    top: 0,
    height: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(116,229,255,0.38)',
    backgroundColor: 'rgba(85,217,255,0.018)',
  },
  vignetteTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 70,
    backgroundColor: 'rgba(3,8,13,0.18)',
  },
  vignetteBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    backgroundColor: 'rgba(3,8,13,0.22)',
  },
});

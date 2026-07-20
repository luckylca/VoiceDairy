import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { useMainTabActive } from '../../navigation/MainTabActivityContext';
import {
  getAsrActivity,
  subscribeAsrActivity,
  type AsrActivity,
} from '../../services/asr/AsrService';

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

/**
 * Static technology background.
 *
 * Native Animated loops were previously restarted whenever tabs, ASR state or
 * motion settings changed. On Android that could leave hundreds of pending
 * NativeAnimated callbacks. This version keeps the visual language while doing
 * no continuous bridge-driven animation.
 */
export function TechScreen({ children, style, ambient = true }: TechScreenProps) {
  const { width, height } = useWindowDimensions();
  const { motion } = useVisualStyle();
  const tabActive = useMainTabActive();
  const [asrActivity, setAsrActivity] = useState<AsrActivity>(getAsrActivity());

  const showDecorative = ambient && tabActive && asrActivity === 'idle' && motion.decorative;
  const staticParticleCount = showDecorative ? Math.min(motion.particleCount, 6) : 0;

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: staticParticleCount }, (_, index) => ({
        left: (((index * 73 + 19) % 97) / 100) * width,
        top: (((index * 47 + 13) % 101) / 100) * height,
        size: 1.4 + (index % 3) * 0.8,
        opacity: 0.24 + (index % 4) * 0.09,
      })),
    [height, staticParticleCount, width],
  );

  useEffect(() => subscribeAsrActivity(setAsrActivity), []);

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

        <View style={styles.glowPrimary} />
        <View style={styles.glowSecondary} />

        {showDecorative ? (
          <>
            <View style={styles.orbitLarge}>
              <View style={styles.orbitNodePrimary} />
              <View style={styles.orbitNodeSecondary} />
            </View>
            <View style={styles.orbitSmall}>
              <View style={styles.orbitNodeSmall} />
            </View>
          </>
        ) : null}

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

        {showDecorative && motion.particleCount > 4 ? <View style={styles.scanBeam} /> : null}
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
    opacity: 0.2,
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
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -105,
    right: -130,
    backgroundColor: techTokens.colors.glow,
    opacity: 0.22,
  },
  glowSecondary: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    left: -140,
    bottom: -112,
    backgroundColor: techTokens.colors.glowSecondary,
    opacity: 0.14,
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
    transform: [{ rotate: '18deg' }],
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
    transform: [{ rotate: '-14deg' }],
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
    top: '32%',
    height: 42,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(116,229,255,0.22)',
    backgroundColor: 'rgba(85,217,255,0.012)',
    transform: [{ rotate: '-3deg' }],
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
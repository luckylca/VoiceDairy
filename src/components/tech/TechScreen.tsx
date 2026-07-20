import React, { useMemo } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { useMainTabActive } from '../../navigation/MainTabActivityContext';
import { useTechMotionValue } from './TechMotionProvider';

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
  secondary: boolean;
};

export function TechScreen({ children, style, ambient = true }: TechScreenProps) {
  const { width, height } = useWindowDimensions();
  const { motion, motionLevel } = useVisualStyle();
  const tabActive = useMainTabActive();
  const { phase, running } = useTechMotionValue();

  const runAmbient = ambient && tabActive && running;
  const showDecorative = tabActive && motion.decorative;

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: showDecorative ? motion.particleCount : 0 }, (_, index) => ({
        left: (((index * 73 + 19) % 97) / 100) * width,
        top: (((index * 47 + 13) % 101) / 100) * height,
        size: 1.5 + (index % 3) * 0.75,
        opacity: 0.2 + (index % 5) * 0.1,
        secondary: index % 4 === 0,
      })),
    [height, motion.particleCount, showDecorative, width],
  );

  const primaryGlowStyle = runAmbient
    ? {
        opacity: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.46, 0.2] }),
        transform: [
          { translateX: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-20, 18, -20] }) },
          { translateY: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [10, -16, 10] }) },
          { scale: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 1.06, 0.92] }) },
        ],
      }
    : { opacity: 0.15, transform: [{ scale: 0.96 }] };

  const secondaryGlowStyle = runAmbient
    ? {
        opacity: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.28, 0.1, 0.28] }),
        transform: [{ scale: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1.03, 0.93, 1.03] }) }],
      }
    : { opacity: 0.09, transform: [{ scale: 0.96 }] };

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

        <Animated.View style={[styles.glowPrimary, primaryGlowStyle]} />
        <Animated.View style={[styles.glowSecondary, secondaryGlowStyle]} />

        {showDecorative ? (
          <>
            <Animated.View
              renderToHardwareTextureAndroid
              style={[
                styles.orbitLarge,
                {
                  transform: [
                    {
                      rotate: runAmbient
                        ? phase.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '348deg'] })
                        : '14deg',
                    },
                  ],
                },
              ]}
            >
              <View style={styles.cometTail} />
              <View style={styles.orbitNodePrimary} />
              <View style={styles.orbitNodeSecondary} />
            </Animated.View>
            <Animated.View
              renderToHardwareTextureAndroid
              style={[
                styles.orbitSmall,
                {
                  transform: [
                    {
                      rotate: runAmbient
                        ? phase.interpolate({ inputRange: [0, 1], outputRange: ['18deg', '-342deg'] })
                        : '-19deg',
                    },
                  ],
                },
              ]}
            >
              <View style={styles.orbitNodeSmall} />
            </Animated.View>
          </>
        ) : null}

        {particles.length > 0 ? (
          <Animated.View
            renderToHardwareTextureAndroid
            style={[
              StyleSheet.absoluteFill,
              runAmbient
                ? {
                    opacity: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.72, 1, 0.72] }),
                    transform: [
                      { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [8, -16] }) },
                      { translateX: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-4, 6, -4] }) },
                    ],
                  }
                : { opacity: 0.72 },
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
                    backgroundColor: particle.secondary
                      ? techTokens.colors.secondary
                      : techTokens.colors.primary,
                  },
                ]}
              />
            ))}
          </Animated.View>
        ) : null}

        {showDecorative && motionLevel === 'full' ? (
          <Animated.View
            renderToHardwareTextureAndroid
            style={[
              styles.scanBeam,
              runAmbient
                ? {
                    opacity: phase.interpolate({
                      inputRange: [0, 0.08, 0.78, 0.88, 1],
                      outputRange: [0, 0.38, 0.16, 0, 0],
                    }),
                    transform: [
                      {
                        translateY: phase.interpolate({
                          inputRange: [0, 0.88, 1],
                          outputRange: [-60, height + 60, height + 60],
                        }),
                      },
                    ],
                  }
                : { opacity: 0 },
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
    borderColor: 'rgba(85,217,255,0.09)',
    right: -170,
    top: 60,
  },
  orbitSmall: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(142,124,255,0.11)',
    left: -110,
    top: '43%',
  },
  cometTail: {
    position: 'absolute',
    right: 40,
    top: 31,
    width: 42,
    height: 2,
    borderRadius: 2,
    opacity: 0.35,
    backgroundColor: techTokens.colors.primary,
    transform: [{ rotate: '-36deg' }],
  },
  orbitNodePrimary: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
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
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: techTokens.colors.success,
    right: 15,
    top: 68,
  },
  particle: { position: 'absolute' },
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

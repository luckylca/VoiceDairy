import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';

type TechScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  ambient?: boolean;
};

type Particle = {
  left: number;
  top: number;
  size: number;
  phase: number;
};

export function TechScreen({ children, style, ambient = true }: TechScreenProps) {
  const { width, height } = useWindowDimensions();
  const { motion } = useVisualStyle();
  const drift = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(AppState.currentState === 'active');

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: motion.particleCount }, (_, index) => ({
        left: ((index * 73 + 19) % 97) / 100 * width,
        top: ((index * 47 + 13) % 101) / 100 * height,
        size: 1.2 + (index % 4) * 0.8,
        phase: (index % 7) / 7,
      })),
    [height, motion.particleCount, width],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    drift.stopAnimation();
    scan.stopAnimation();
    orbit.stopAnimation();
    drift.setValue(0);
    scan.setValue(0);
    orbit.setValue(0);

    if (!ambient || !active || !motion.ambient) return;

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: Math.max(2400, Math.round(6200 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: Math.max(2400, Math.round(6200 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(Math.round(700 * motion.durationScale)),
        Animated.timing(scan, {
          toValue: 1,
          duration: Math.max(1800, Math.round(4400 * motion.durationScale)),
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scan, { toValue: 0, duration: 1, useNativeDriver: true }),
        Animated.delay(Math.round(900 * motion.durationScale)),
      ]),
    );

    const orbitLoop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: Math.max(5000, Math.round(15000 * motion.durationScale)),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    driftLoop.start();
    scanLoop.start();
    orbitLoop.start();
    return () => {
      driftLoop.stop();
      scanLoop.stop();
      orbitLoop.stop();
    };
  }, [active, ambient, drift, motion.ambient, motion.durationScale, orbit, scan]);

  const orbitRotation = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const reverseOrbitRotation = orbit.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.gridLayer}>
          {Array.from({ length: 9 }, (_, index) => (
            <View key={`h-${index}`} style={[styles.gridHorizontal, { top: `${index * 12.5}%` }]} />
          ))}
          {Array.from({ length: 7 }, (_, index) => (
            <View key={`v-${index}`} style={[styles.gridVertical, { left: `${index * 16.66}%` }]} />
          ))}
        </View>

        <Animated.View
          style={[
            styles.glowPrimary,
            {
              opacity: motion.decorative
                ? drift.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.72] })
                : 0.18,
              transform: [
                { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-34, 30] }) },
                { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [18, -30] }) },
                { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.13] }) },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.glowSecondary,
            {
              opacity: motion.decorative
                ? drift.interpolate({ inputRange: [0, 1], outputRange: [0.48, 0.16] })
                : 0.12,
              transform: [
                { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [20, -18] }) },
                { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.08, 0.88] }) },
              ],
            },
          ]}
        />

        {motion.decorative ? (
          <>
            <Animated.View
              style={[
                styles.orbitLarge,
                { transform: [{ rotate: orbitRotation }, { scale: 1 + motion.intensity * 0.03 }] },
              ]}
            >
              <View style={styles.orbitNodePrimary} />
              <View style={styles.orbitNodeSecondary} />
            </Animated.View>
            <Animated.View style={[styles.orbitSmall, { transform: [{ rotate: reverseOrbitRotation }] }]}>
              <View style={styles.orbitNodeSmall} />
            </Animated.View>
          </>
        ) : null}

        {particles.map((particle, index) => {
          const phaseOffset = particle.phase * 24;
          return (
            <Animated.View
              key={`particle-${index}`}
              style={[
                styles.particle,
                {
                  left: particle.left,
                  top: particle.top,
                  width: particle.size,
                  height: particle.size,
                  borderRadius: particle.size,
                  opacity: drift.interpolate({
                    inputRange: [0, 0.35, 0.7, 1],
                    outputRange: [0.15 + particle.phase * 0.3, 0.82, 0.28, 0.6],
                  }),
                  transform: [
                    {
                      translateY: drift.interpolate({
                        inputRange: [0, 1],
                        outputRange: [phaseOffset, -34 - phaseOffset],
                      }),
                    },
                    {
                      translateX: drift.interpolate({
                        inputRange: [0, 1],
                        outputRange: [index % 2 === 0 ? -8 : 8, index % 2 === 0 ? 14 : -14],
                      }),
                    },
                    { scale: drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.5, 0.8] }) },
                  ],
                },
              ]}
            />
          );
        })}

        {motion.decorative ? (
          <Animated.View
            style={[
              styles.scanBeam,
              {
                opacity: scan.interpolate({ inputRange: [0, 0.08, 0.88, 1], outputRange: [0, 0.72, 0.34, 0] }),
                transform: [
                  { translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [-80, height + 80] }) },
                  { skewY: '-5deg' },
                ],
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
    opacity: 0.34,
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
    width: 370,
    height: 370,
    borderRadius: 185,
    top: -130,
    right: -150,
    backgroundColor: techTokens.colors.glow,
  },
  glowSecondary: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    left: -175,
    bottom: -138,
    backgroundColor: techTokens.colors.glowSecondary,
  },
  orbitLarge: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    borderWidth: 1,
    borderColor: 'rgba(85, 217, 255, 0.10)',
    right: -190,
    top: 52,
  },
  orbitSmall: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    borderColor: 'rgba(142, 124, 255, 0.12)',
    left: -126,
    top: '42%',
  },
  orbitNodePrimary: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: techTokens.colors.primary,
    top: 39,
    right: 54,
    shadowColor: techTokens.colors.primary,
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 5,
  },
  orbitNodeSecondary: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: techTokens.colors.secondary,
    bottom: 54,
    left: 34,
  },
  orbitNodeSmall: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: techTokens.colors.success,
    right: 18,
    top: 80,
  },
  particle: {
    position: 'absolute',
    backgroundColor: techTokens.colors.primary,
    shadowColor: techTokens.colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 2,
  },
  scanBeam: {
    position: 'absolute',
    left: -40,
    right: -40,
    top: 0,
    height: 72,
    borderTopWidth: 1,
    borderTopColor: 'rgba(116, 229, 255, 0.52)',
    backgroundColor: 'rgba(85, 217, 255, 0.035)',
  },
  vignetteTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 80,
    backgroundColor: 'rgba(3, 8, 13, 0.22)',
  },
  vignetteBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
    backgroundColor: 'rgba(3, 8, 13, 0.28)',
  },
});

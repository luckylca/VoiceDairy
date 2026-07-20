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
  phase: number;
};

export function TechScreen({ children, style, ambient = true }: TechScreenProps) {
  const { width, height } = useWindowDimensions();
  const { motion } = useVisualStyle();
  const tabActive = useMainTabActive();
  const drift = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [asrActivity, setAsrActivity] = useState<AsrActivity>(getAsrActivity());

  const effectsAllowed = tabActive && asrActivity === 'idle';
  const runAmbient = ambient && appActive && effectsAllowed && motion.ambient;
  const showDecorative = effectsAllowed && motion.decorative;

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: showDecorative ? motion.particleCount : 0 }, (_, index) => ({
        left: (((index * 73 + 19) % 97) / 100) * width,
        top: (((index * 47 + 13) % 101) / 100) * height,
        size: 1.4 + (index % 3) * 0.8,
        phase: (index % 5) / 5,
      })),
    [height, motion.particleCount, showDecorative, width],
  );

  useEffect(() => {
    const appSubscription = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    const asrSubscription = subscribeAsrActivity(setAsrActivity);
    return () => {
      appSubscription.remove();
      asrSubscription();
    };
  }, []);

  useEffect(() => {
    drift.stopAnimation();
    scan.stopAnimation();
    drift.setValue(0);
    scan.setValue(0);
    if (!runAmbient) return;

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: Math.max(2800, Math.round(6800 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: Math.max(2800, Math.round(6800 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );

    driftLoop.start();

    let scanLoop: Animated.CompositeAnimation | null = null;
    if (motion.particleCount > 4) {
      scanLoop = Animated.loop(
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(scan, {
            toValue: 1,
            duration: Math.max(2200, Math.round(5200 * motion.durationScale)),
            easing: Easing.linear,
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(scan, {
            toValue: 0,
            duration: 1,
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.delay(1400),
        ]),
      );
      scanLoop.start();
    }

    return () => {
      driftLoop.stop();
      scanLoop?.stop();
    };
  }, [drift, motion.durationScale, motion.particleCount, runAmbient, scan]);

  const orbitRotation = drift.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '28deg'] });
  const reverseOrbitRotation = drift.interpolate({ inputRange: [0, 1], outputRange: ['18deg', '-20deg'] });

  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill} renderToHardwareTextureAndroid>
        <View style={styles.gridLayer}>
          {Array.from({ length: 7 }, (_, index) => (
            <View key={`h-${index}`} style={[styles.gridHorizontal, { top: `${index * 16.66}%` }]} />
          ))}
          {Array.from({ length: 5 }, (_, index) => (
            <View key={`v-${index}`} style={[styles.gridVertical, { left: `${index * 25}%` }]} />
          ))}
        </View>

        <Animated.View
          style={[
            styles.glowPrimary,
            {
              opacity: runAmbient
                ? drift.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.5] })
                : 0.15,
              transform: [
                { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-20, 18] }) },
                { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [10, -16] }) },
                { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }) },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.glowSecondary,
            {
              opacity: runAmbient
                ? drift.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.12] })
                : 0.09,
              transform: [{ scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.03, 0.93] }) }],
            },
          ]}
        />

        {showDecorative ? (
          <>
            <Animated.View style={[styles.orbitLarge, { transform: [{ rotate: orbitRotation }] }]}>
              <View style={styles.orbitNodePrimary} />
              <View style={styles.orbitNodeSecondary} />
            </Animated.View>
            <Animated.View style={[styles.orbitSmall, { transform: [{ rotate: reverseOrbitRotation }] }]}>
              <View style={styles.orbitNodeSmall} />
            </Animated.View>
          </>
        ) : null}

        {particles.map((particle, index) => {
          const phaseOffset = particle.phase * 14;
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
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.18 + particle.phase * 0.18, 0.62, 0.25],
                  }),
                  transform: [
                    {
                      translateY: drift.interpolate({
                        inputRange: [0, 1],
                        outputRange: [phaseOffset, -20 - phaseOffset],
                      }),
                    },
                    {
                      translateX: drift.interpolate({
                        inputRange: [0, 1],
                        outputRange: [index % 2 === 0 ? -4 : 4, index % 2 === 0 ? 8 : -8],
                      }),
                    },
                  ],
                },
              ]}
            />
          );
        })}

        {showDecorative && motion.particleCount > 4 ? (
          <Animated.View
            style={[
              styles.scanBeam,
              {
                opacity: scan.interpolate({ inputRange: [0, 0.08, 0.88, 1], outputRange: [0, 0.42, 0.18, 0] }),
                transform: [
                  { translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [-60, height + 60] }) },
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

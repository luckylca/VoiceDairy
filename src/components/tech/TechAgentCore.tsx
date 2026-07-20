import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { useMainTabActive } from '../../navigation/MainTabActivityContext';
import { techTokens } from '../../theme/tech/tokens';

type TechAgentCoreProps = {
  active?: boolean;
  compact?: boolean;
  label?: string;
};

export function TechAgentCore({ active = true, compact = false, label = 'CONTEXT SYNTHESIS' }: TechAgentCoreProps) {
  const { motion } = useVisualStyle();
  const tabActive = useMainTabActive();
  const rotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const data = useRef(new Animated.Value(0)).current;
  const shouldAnimate = active && tabActive && motion.ambient;

  useEffect(() => {
    rotate.stopAnimation();
    pulse.stopAnimation();
    data.stopAnimation();
    rotate.setValue(0);
    pulse.setValue(0);
    data.setValue(0);

    if (!shouldAnimate) return;

    const rotateLoop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: Math.max(2800, Math.round(7600 * motion.durationScale)),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: Math.max(480, Math.round(1100 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: Math.max(480, Math.round(1100 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    rotateLoop.start();
    pulseLoop.start();

    let dataAnimation: Animated.CompositeAnimation | null = null;
    if (motion.decorative) {
      dataAnimation = Animated.sequence([
        Animated.delay(220),
        Animated.timing(data, {
          toValue: 1,
          duration: Math.max(650, Math.round(1200 * motion.durationScale)),
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
      dataAnimation.start();
    }

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
      dataAnimation?.stop();
    };
  }, [active, data, motion.ambient, motion.decorative, motion.durationScale, pulse, rotate, shouldAnimate, tabActive]);

  const size = compact ? 64 : 104;
  const rotation = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const reverseRotation = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            styles.outerOrbit,
            { width: size, height: size, borderRadius: size / 2, transform: [{ rotate: rotation }] },
          ]}
        >
          <View style={styles.nodePrimary} />
          <View style={styles.nodeSecondary} />
        </Animated.View>
        <Animated.View
          style={[
            styles.innerOrbit,
            {
              width: size * 0.75,
              height: size * 0.75,
              borderRadius: size * 0.375,
              transform: [{ rotate: reverseRotation }],
            },
          ]}
        >
          <View style={styles.nodeSuccess} />
        </Animated.View>
        <Animated.View
          style={[
            styles.core,
            {
              width: size * 0.48,
              height: size * 0.48,
              borderRadius: size * 0.24,
              opacity: shouldAnimate
                ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] })
                : 0.62,
              transform: [
                {
                  scale: shouldAnimate
                    ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] })
                    : 1,
                },
              ],
            },
          ]}
        >
          <Icon source="brain" size={compact ? 20 : 30} color={active ? techTokens.colors.primary : techTokens.colors.textMuted} />
        </Animated.View>
        {shouldAnimate && motion.decorative ? (
          <Animated.View
            style={[
              styles.dataRay,
              {
                width: size * 0.68,
                opacity: data.interpolate({ inputRange: [0, 0.2, 0.85, 1], outputRange: [0, 0.85, 0.35, 0] }),
                transform: [
                  { rotate: '-18deg' },
                  { translateX: data.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.42, size * 0.42] }) },
                ],
              },
            ]}
          />
        ) : null}
      </View>
      {!compact ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rootCompact: {
    width: 68,
  },
  outerOrbit: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(85,217,255,0.30)',
  },
  innerOrbit: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(142,124,255,0.30)',
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(85,217,255,0.50)',
    backgroundColor: 'rgba(85,217,255,0.09)',
  },
  nodePrimary: {
    position: 'absolute',
    right: 8,
    top: '25%',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: techTokens.colors.primary,
  },
  nodeSecondary: {
    position: 'absolute',
    left: 5,
    bottom: '28%',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: techTokens.colors.secondary,
  },
  nodeSuccess: {
    position: 'absolute',
    right: -2,
    top: '45%',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: techTokens.colors.success,
  },
  dataRay: {
    position: 'absolute',
    height: 1,
    backgroundColor: techTokens.colors.primary,
  },
  label: {
    marginTop: 9,
    color: techTokens.colors.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.25,
  },
});

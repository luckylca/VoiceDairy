import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { useMainTabActive } from '../../navigation/MainTabActivityContext';
import { useTechMotionValue } from './TechMotionProvider';

type TechAgentCoreProps = {
  active?: boolean;
  compact?: boolean;
  label?: string;
};

export function TechAgentCore({ active = true, compact = false, label = 'CONTEXT SYNTHESIS' }: TechAgentCoreProps) {
  const { motion } = useVisualStyle();
  const tabActive = useMainTabActive();
  const { phase, running } = useTechMotionValue();
  const size = compact ? 64 : 104;
  const coreSize = size * 0.48;
  const animate = active && tabActive && running && motion.ambient;

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          renderToHardwareTextureAndroid
          style={[
            styles.outerOrbit,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [
                {
                  rotate: animate
                    ? phase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
                    : '14deg',
                },
              ],
            },
          ]}
        >
          <View style={styles.nodePrimary} />
          <View style={styles.nodeSecondary} />
        </Animated.View>
        <Animated.View
          renderToHardwareTextureAndroid
          style={[
            styles.innerOrbit,
            {
              width: size * 0.75,
              height: size * 0.75,
              borderRadius: size * 0.375,
              transform: [
                {
                  rotate: animate
                    ? phase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] })
                    : '-22deg',
                },
              ],
            },
          ]}
        >
          <View style={styles.nodeSuccess} />
        </Animated.View>
        <Animated.View
          style={[
            styles.core,
            {
              width: coreSize,
              height: coreSize,
              borderRadius: coreSize / 2,
              opacity: active
                ? animate
                  ? phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.78, 1, 0.78] })
                  : 1
                : 0.62,
              transform: [
                {
                  scale: animate
                    ? phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.96, 1.06, 0.96] })
                    : 1,
                },
              ],
            },
          ]}
        >
          <Icon source="brain" size={compact ? 20 : 30} color={active ? techTokens.colors.primary : techTokens.colors.textMuted} />
        </Animated.View>
        {active && motion.decorative ? (
          <Animated.View
            style={[
              styles.dataRay,
              {
                width: size * 0.68,
                opacity: animate
                  ? phase.interpolate({ inputRange: [0, 0.18, 0.78, 1], outputRange: [0, 0.8, 0.3, 0] })
                  : 0.34,
                transform: [
                  { rotate: '-18deg' },
                  {
                    translateX: animate
                      ? phase.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.36, size * 0.36] })
                      : 0,
                  },
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

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { useMainTabActive } from '../../navigation/MainTabActivityContext';
import { useTechMotionPhase } from './TechMotionClock';

type TechAgentCoreProps = {
  active?: boolean;
  compact?: boolean;
  label?: string;
};

export function TechAgentCore({ active = true, compact = false, label = 'CONTEXT SYNTHESIS' }: TechAgentCoreProps) {
  const { motion, motionLevel } = useVisualStyle();
  const tabActive = useMainTabActive();
  const shouldAnimate = active && tabActive && motion.ambient;
  const phase = useTechMotionPhase(
    shouldAnimate,
    motionLevel === 'full' ? 22 : 13,
    Math.max(4200, Math.round(7600 * Math.max(0.65, motion.durationScale))),
  );
  const pulse = (Math.sin(phase * Math.PI * 2) + 1) / 2;
  const size = compact ? 64 : 104;
  const coreSize = size * 0.48;
  const rayProgress = (phase * 1.8) % 1;

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={[
            styles.outerOrbit,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ rotate: shouldAnimate ? `${phase * 360}deg` : '14deg' }],
            },
          ]}
        >
          <View style={styles.nodePrimary} />
          <View style={styles.nodeSecondary} />
        </View>
        <View
          style={[
            styles.innerOrbit,
            {
              width: size * 0.75,
              height: size * 0.75,
              borderRadius: size * 0.375,
              transform: [{ rotate: shouldAnimate ? `${-phase * 360}deg` : '-22deg' }],
            },
          ]}
        >
          <View style={styles.nodeSuccess} />
        </View>
        <View
          style={[
            styles.core,
            {
              width: coreSize,
              height: coreSize,
              borderRadius: coreSize / 2,
              opacity: active ? 0.78 + pulse * 0.22 : 0.62,
              transform: [{ scale: shouldAnimate ? 0.96 + pulse * 0.08 : 1 }],
            },
          ]}
        >
          <Icon
            source="brain"
            size={compact ? 20 : 30}
            color={active ? techTokens.colors.primary : techTokens.colors.textMuted}
          />
        </View>
        {active && motion.decorative ? (
          <View
            style={[
              styles.dataRay,
              {
                width: size * 0.68,
                opacity: shouldAnimate ? Math.max(0, 0.75 - Math.abs(rayProgress - 0.5) * 1.5) : 0.35,
                transform: [
                  { rotate: '-18deg' },
                  { translateX: shouldAnimate ? -size * 0.42 + rayProgress * size * 0.84 : 0 },
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

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { techTokens } from '../../theme/tech/tokens';

type TechAgentCoreProps = {
  active?: boolean;
  compact?: boolean;
  label?: string;
};

export function TechAgentCore({ active = true, compact = false, label = 'CONTEXT SYNTHESIS' }: TechAgentCoreProps) {
  const size = compact ? 64 : 104;
  const coreSize = size * 0.48;

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
              transform: [{ rotate: active ? '14deg' : '0deg' }],
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
              transform: [{ rotate: active ? '-22deg' : '0deg' }],
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
              opacity: active ? 1 : 0.62,
            },
          ]}
        >
          <Icon
            source="brain"
            size={compact ? 20 : 30}
            color={active ? techTokens.colors.primary : techTokens.colors.textMuted}
          />
        </View>
        {active ? <View style={[styles.dataRay, { width: size * 0.68 }]} /> : null}
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
    opacity: 0.46,
    transform: [{ rotate: '-18deg' }],
  },
  label: {
    marginTop: 9,
    color: techTokens.colors.textMuted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.25,
  },
});
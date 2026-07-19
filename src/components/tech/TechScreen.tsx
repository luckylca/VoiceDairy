import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, StyleSheet, View, type ViewStyle } from 'react-native';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';

type TechScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  ambient?: boolean;
};

export function TechScreen({ children, style, ambient = true }: TechScreenProps) {
  const { motionLevel } = useVisualStyle();
  const pulse = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);

    if (!ambient || !active || motionLevel === 'off' || motionLevel === 'reduced') {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: motionLevel === 'full' ? 3400 : 4800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: motionLevel === 'full' ? 3400 : 4800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, ambient, motionLevel, pulse]);

  const glowStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.72] }),
      transform: [
        { translateX: pulse.interpolate({ inputRange: [0, 1], outputRange: [-20, 26] }) },
        { translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [8, -18] }) },
        { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) },
      ],
    }),
    [pulse],
  );

  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.gridHorizontal} />
        <View style={styles.gridVertical} />
        <Animated.View style={[styles.glowPrimary, glowStyle]} />
        <Animated.View
          style={[
            styles.glowSecondary,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.2] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1.05, 0.9] }) }],
            },
          ]}
        />
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
  gridHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '31%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: techTokens.colors.line,
  },
  gridVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '72%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: techTokens.colors.line,
  },
  glowPrimary: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    top: -92,
    right: -120,
    backgroundColor: techTokens.colors.glow,
  },
  glowSecondary: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    left: -130,
    bottom: -100,
    backgroundColor: techTokens.colors.glowSecondary,
  },
});

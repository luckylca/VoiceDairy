import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { TechCornerBrackets, TechEntrance, TechShimmer } from './TechMotion';

type TechPanelProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: boolean;
  index?: number;
  animated?: boolean;
  corners?: boolean;
};

export function TechPanel({
  children,
  style,
  accent = false,
  index = 0,
  animated = true,
  corners = true,
}: TechPanelProps) {
  const { motion } = useVisualStyle();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    if (!accent || !motion.decorative) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: Math.max(900, Math.round(1800 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: Math.max(900, Math.round(1800 * motion.durationScale)),
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [accent, motion.decorative, motion.durationScale, pulse]);

  const panel = (
    <View style={[styles.panel, accent && styles.accent, style]}>
      {accent ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.accentLine,
            {
              opacity: motion.decorative
                ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1] })
                : 0.72,
              transform: [
                {
                  scaleY: motion.decorative
                    ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })
                    : 1,
                },
              ],
            },
          ]}
        />
      ) : null}
      {corners ? <TechCornerBrackets color={accent ? techTokens.colors.primary : 'rgba(119,193,221,0.42)'} /> : null}
      <TechShimmer duration={accent ? 1800 : 2600} />
      <View style={styles.content}>{children}</View>
    </View>
  );

  return animated ? <TechEntrance index={index}>{panel}</TechEntrance> : panel;
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: techTokens.radius.lg,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    backgroundColor: techTokens.colors.surfaceGlass,
    padding: techTokens.spacing.lg,
    overflow: 'hidden',
    ...techTokens.shadows.panel,
  },
  content: {
    zIndex: 2,
  },
  accent: {
    borderColor: 'rgba(85, 217, 255, 0.34)',
    backgroundColor: 'rgba(12, 31, 42, 0.86)',
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 2.5,
    borderRadius: 2,
    backgroundColor: techTokens.colors.primary,
    shadowColor: techTokens.colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 7,
    elevation: 4,
  },
});

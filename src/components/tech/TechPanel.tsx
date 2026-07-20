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
import { useMainTabActive } from '../../navigation/MainTabActivityContext';
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
  const tabActive = useMainTabActive();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    if (!accent || !motion.decorative || !tabActive) return;

    const animation = Animated.timing(pulse, {
      toValue: 1,
      duration: Math.max(320, Math.round(680 * Math.max(0.5, motion.durationScale))),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [accent, motion.decorative, motion.durationScale, pulse, tabActive]);

  const panel = (
    <View style={[styles.panel, accent && styles.accent, style]} renderToHardwareTextureAndroid>
      {accent ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.accentLine,
            {
              opacity: motion.decorative && tabActive
                ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.82] })
                : 0.7,
              transform: [
                {
                  scaleY: motion.decorative && tabActive
                    ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] })
                    : 1,
                },
              ],
            },
          ]}
        />
      ) : null}
      {corners ? <TechCornerBrackets color={accent ? techTokens.colors.primary : 'rgba(119,193,221,0.42)'} /> : null}
      <TechShimmer duration={accent ? 720 : 900} />
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
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  content: {
    zIndex: 2,
  },
  accent: {
    borderColor: 'rgba(85,217,255,0.30)',
    backgroundColor: 'rgba(12,31,42,0.84)',
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 2.5,
    borderRadius: 2,
    backgroundColor: techTokens.colors.primary,
  },
});

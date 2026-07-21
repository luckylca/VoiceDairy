import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutAnimation,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { useMainTabActive } from '../../navigation/MainTabActivityContext';
import { techTokens } from '../../theme/tech/tokens';

type TechEntranceProps = {
  children: React.ReactNode;
  index?: number;
  distance?: number;
  from?: 'bottom' | 'top' | 'left' | 'right' | 'scale';
  style?: StyleProp<ViewStyle>;
};

export function TechEntrance({ children, index = 0, style }: TechEntranceProps) {
  const { motion } = useVisualStyle();
  const tabActive = useMainTabActive();
  const hasEntered = useRef(false);
  const [visible, setVisible] = useState(!motion.entrances);

  useEffect(() => {
    if (!motion.entrances) {
      hasEntered.current = true;
      setVisible(true);
      return;
    }
    if (!tabActive || hasEntered.current) return;

    const timer = setTimeout(() => {
      LayoutAnimation.configureNext({
        duration: Math.max(120, Math.round(220 * Math.max(0.55, motion.durationScale))),
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
      });
      hasEntered.current = true;
      setVisible(true);
    }, Math.min(index, 6) * motion.staggerMs);

    return () => clearTimeout(timer);
  }, [index, motion.durationScale, motion.entrances, motion.staggerMs, tabActive]);

  return <View style={[style, { opacity: visible ? 1 : 0 }]}>{children}</View>;
}

type TechShimmerProps = {
  width?: number;
  height?: number | 'auto' | `${number}%`;
  color?: string;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A static glass highlight is used inside repeated cards. Continuous shimmer is
 * intentionally reserved for shared screen-level effects so lists never create
 * one animation clock per row.
 */
export function TechShimmer({
  width = 72,
  height = '100%',
  color = 'rgba(133,231,255,0.06)',
  style,
}: TechShimmerProps) {
  const { motion } = useVisualStyle();
  const tabActive = useMainTabActive();
  if (!motion.decorative || !tabActive) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.shimmer,
        {
          width,
          height,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function TechCornerBrackets({ color = techTokens.colors.primary }: { color?: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.corner, styles.topLeft, { borderColor: color }]} />
      <View style={[styles.corner, styles.topRight, { borderColor: color }]} />
      <View style={[styles.corner, styles.bottomLeft, { borderColor: color }]} />
      <View style={[styles.corner, styles.bottomRight, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  shimmer: {
    position: 'absolute',
    right: -24,
    top: -30,
    bottom: -30,
    opacity: 0.55,
    transform: [{ rotate: '16deg' }],
  },
  corner: { position: 'absolute', width: 11, height: 11, opacity: 0.68 },
  topLeft: { left: 6, top: 6, borderLeftWidth: 1.5, borderTopWidth: 1.5 },
  topRight: { right: 6, top: 6, borderRightWidth: 1.5, borderTopWidth: 1.5 },
  bottomLeft: { left: 6, bottom: 6, borderLeftWidth: 1.5, borderBottomWidth: 1.5 },
  bottomRight: { right: 6, bottom: 6, borderRightWidth: 1.5, borderBottomWidth: 1.5 },
});

import React from 'react';
import {
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

/**
 * Performance-safe entrance wrapper.
 *
 * The previous implementation started a native Animated node for every card,
 * message and settings section. Large lists could therefore accumulate
 * hundreds of pending NativeAnimated callbacks. The wrapper intentionally
 * keeps layout and styling only; richer motion can later be restored with a
 * UI-thread animation engine that does not enqueue bridge callbacks.
 */
export function TechEntrance({ children, style }: TechEntranceProps) {
  return <View style={style}>{children}</View>;
}

type TechShimmerProps = {
  width?: number;
  height?: number | 'auto' | `${number}%`;
  color?: string;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

/** Static highlight replacing the former per-component shimmer animation. */
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
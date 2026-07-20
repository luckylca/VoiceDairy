import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
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

export function TechEntrance({
  children,
  index = 0,
  distance = 18,
  from = 'bottom',
  style,
}: TechEntranceProps) {
  const { motion } = useVisualStyle();
  const tabActive = useMainTabActive();
  const progress = useRef(new Animated.Value(motion.entrances && tabActive ? 0 : 1)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (!motion.entrances || !tabActive) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      delay: Math.min(index, 8) * motion.staggerMs,
      duration: Math.max(80, Math.round(300 * Math.max(0.45, motion.durationScale))),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [index, motion.durationScale, motion.entrances, motion.staggerMs, progress, tabActive]);

  const animatedStyle = useMemo(() => {
    const translate = progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
    const negativeTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [-distance, 0] });
    const transform =
      from === 'top'
        ? [{ translateY: negativeTranslate }]
        : from === 'left'
          ? [{ translateX: negativeTranslate }]
          : from === 'right'
            ? [{ translateX: translate }]
            : from === 'scale'
              ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }]
              : [{ translateY: translate }];

    return { opacity: progress, transform };
  }, [distance, from, progress]);

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

type TechShimmerProps = {
  width?: number;
  height?: number | 'auto' | `${number}%`;
  color?: string;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export function TechShimmer({
  width = 110,
  height = '100%',
  color = 'rgba(133, 231, 255, 0.14)',
  duration = 900,
  style,
}: TechShimmerProps) {
  const { motion } = useVisualStyle();
  const tabActive = useMainTabActive();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(0);
    if (!motion.decorative || !tabActive) return;

    const animation = Animated.sequence([
      Animated.delay(Math.round(100 * motion.durationScale)),
      Animated.timing(progress, {
        toValue: 1,
        duration: Math.max(420, Math.round(duration * Math.max(0.5, motion.durationScale))),
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
        isInteraction: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [duration, motion.decorative, motion.durationScale, progress, tabActive]);

  if (!motion.decorative || !tabActive) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shimmer,
        {
          width,
          height,
          backgroundColor: color,
          opacity: progress.interpolate({ inputRange: [0, 0.18, 0.82, 1], outputRange: [0, 0.75, 0.35, 0] }),
          transform: [
            { rotate: '16deg' },
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-240, 480] }) },
          ],
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
  shimmer: { position: 'absolute', top: -30, bottom: -30 },
  corner: { position: 'absolute', width: 11, height: 11, opacity: 0.68 },
  topLeft: { left: 6, top: 6, borderLeftWidth: 1.5, borderTopWidth: 1.5 },
  topRight: { right: 6, top: 6, borderRightWidth: 1.5, borderTopWidth: 1.5 },
  bottomLeft: { left: 6, bottom: 6, borderLeftWidth: 1.5, borderBottomWidth: 1.5 },
  bottomRight: { right: 6, bottom: 6, borderRightWidth: 1.5, borderBottomWidth: 1.5 },
});

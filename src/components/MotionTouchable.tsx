import React, { useRef } from 'react';
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { techTokens } from '../theme/tech/tokens';

function withAlpha(color: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alpha}` : color;
}

type MotionTouchableProps = {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  accessibilityLabel?: string;
  rippleColor?: string;
};

export function MotionTouchable({
  children,
  onPress,
  onLongPress,
  delayLongPress = 450,
  disabled = false,
  style,
  contentStyle,
  borderRadius = 20,
  accessibilityLabel,
  rippleColor,
}: MotionTouchableProps) {
  const theme = useTheme();
  const { isTech, motion } = useVisualStyle();
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const longPressed = useRef(false);

  function animate(pressed: boolean) {
    if (!motion.pressFeedback) return;
    scale.stopAnimation();
    translateY.stopAnimation();
    Animated.parallel([
      Animated.spring(scale, {
        toValue: pressed ? (isTech ? 0.973 : 0.992) : 1,
        speed: 38,
        bounciness: pressed ? 0 : isTech ? 5 : 2,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: pressed && isTech ? 2 : 0,
        speed: 38,
        bounciness: 2,
        useNativeDriver: true,
      }),
    ]).start();
  }

  return (
    <Animated.View style={[style, { transform: [{ scale }, { translateY }] }]}>
      <Pressable
        onPress={() => {
          if (!longPressed.current) onPress?.();
          longPressed.current = false;
        }}
        onLongPress={() => {
          longPressed.current = true;
          onLongPress?.();
        }}
        delayLongPress={delayLongPress}
        onPressIn={() => {
          longPressed.current = false;
          animate(true);
        }}
        onPressOut={() => animate(false)}
        disabled={disabled || (!onPress && !onLongPress)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        android_ripple={{
          color:
            rippleColor ??
            (isTech ? 'rgba(85, 217, 255, 0.17)' : withAlpha(theme.colors.primary, '2E')),
          borderless: false,
          foreground: true,
        }}
        style={[
          {
            borderRadius,
            overflow: 'hidden',
            shadowColor: isTech ? techTokens.colors.primary : undefined,
            shadowOpacity: isTech && motion.decorative ? 0.08 : 0,
            shadowRadius: isTech ? 8 : 0,
          },
          contentStyle,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

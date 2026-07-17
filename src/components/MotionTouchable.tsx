import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

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
  const scale = useRef(new Animated.Value(1)).current;
  const longPressed = useRef(false);

  function animate(toValue: number, duration: number) {
    scale.stopAnimation();
    Animated.timing(scale, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
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
          animate(0.992, 55);
        }}
        onPressOut={() => animate(1, 95)}
        disabled={disabled || (!onPress && !onLongPress)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        android_ripple={{
          color: rippleColor ?? withAlpha(theme.colors.primary, '2E'),
          borderless: false,
          foreground: true,
        }}
        style={[
          {
            borderRadius,
            overflow: 'hidden',
          },
          contentStyle,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

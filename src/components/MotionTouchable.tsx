import React, { useRef } from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
import { TouchableRipple, useTheme } from 'react-native-paper';

function withAlpha(color: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alpha}` : color;
}

type MotionTouchableProps = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  accessibilityLabel?: string;
};

export function MotionTouchable({
  children,
  onPress,
  disabled = false,
  style,
  contentStyle,
  borderRadius = 20,
  accessibilityLabel,
}: MotionTouchableProps) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue,
      speed: 45,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}> 
      <TouchableRipple
        onPress={onPress}
        onPressIn={() => animate(0.985)}
        onPressOut={() => animate(1)}
        disabled={disabled}
        borderless={false}
        rippleColor={withAlpha(theme.colors.primary, '24')}
        accessibilityLabel={accessibilityLabel}
        style={[{ borderRadius, overflow: 'hidden' }, contentStyle]}
      >
        <View>{children}</View>
      </TouchableRipple>
    </Animated.View>
  );
}

import React, { useRef } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
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
  const longPressed = useRef(false);

  return (
    <View style={style}>
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
        }}
        disabled={disabled || (!onPress && !onLongPress)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        android_ripple={{
          color:
            rippleColor ??
            (isTech ? 'rgba(85,217,255,0.17)' : withAlpha(theme.colors.primary, '2E')),
          borderless: false,
          foreground: true,
        }}
        style={({ pressed }) => [
          {
            borderRadius,
            overflow: 'hidden',
            shadowColor: isTech ? techTokens.colors.primary : undefined,
            shadowOpacity: isTech && motion.decorative ? 0.05 : 0,
            shadowRadius: isTech ? 5 : 0,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed && motion.pressFeedback ? (isTech ? 0.982 : 0.994) : 1 }],
          },
          contentStyle,
        ]}
      >
        {children}
      </Pressable>
    </View>
  );
}
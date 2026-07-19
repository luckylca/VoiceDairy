import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { techTokens } from '../../theme/tech/tokens';

type TechButtonProps = {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  style?: ViewStyle;
};

export function TechButton({
  label,
  onPress,
  icon,
  disabled = false,
  variant = 'primary',
  style,
}: TechButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue,
      speed: 32,
      bounciness: 3,
      useNativeDriver: true,
    }).start();
  }

  const palette = {
    primary: {
      backgroundColor: techTokens.colors.primary,
      borderColor: techTokens.colors.primary,
      color: techTokens.colors.backgroundDeep,
    },
    secondary: {
      backgroundColor: 'rgba(142, 124, 255, 0.14)',
      borderColor: 'rgba(142, 124, 255, 0.44)',
      color: techTokens.colors.text,
    },
    ghost: {
      backgroundColor: 'rgba(255, 255, 255, 0.025)',
      borderColor: techTokens.colors.line,
      color: techTokens.colors.text,
    },
    danger: {
      backgroundColor: 'rgba(255, 111, 125, 0.12)',
      borderColor: 'rgba(255, 111, 125, 0.42)',
      color: techTokens.colors.error,
    },
  }[variant];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        style={[
          styles.button,
          {
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
            opacity: disabled ? 0.46 : 1,
          },
        ]}
      >
        <View style={styles.content}>
          {icon ? <Icon source={icon} size={19} color={palette.color} /> : null}
          <Text style={[styles.label, { color: palette.color, marginLeft: icon ? 8 : 0 }]}>{label}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: techTokens.radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

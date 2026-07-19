import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { techTokens } from '../../theme/tech/tokens';
import { useVisualStyle } from '../../theme/VisualStyleProvider';
import { TechCornerBrackets, TechShimmer } from './TechMotion';

type TechButtonProps = {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function TechButton({
  label,
  onPress,
  icon,
  disabled = false,
  variant = 'primary',
  style,
}: TechButtonProps) {
  const { motion } = useVisualStyle();
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  function animate(pressed: boolean) {
    if (!motion.pressFeedback) return;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: pressed ? (variant === 'primary' ? 0.955 : 0.97) : 1,
        speed: 34,
        bounciness: pressed ? 0 : 5,
        useNativeDriver: true,
      }),
      Animated.spring(lift, {
        toValue: pressed ? 2 : 0,
        speed: 34,
        bounciness: 2,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: pressed ? 0.86 : 1.12,
          duration: Math.max(55, Math.round(100 * motion.durationScale)),
          useNativeDriver: true,
        }),
        Animated.spring(iconPulse, {
          toValue: 1,
          speed: 35,
          bounciness: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }

  const palette = {
    primary: {
      backgroundColor: techTokens.colors.primary,
      borderColor: '#9DEBFF',
      color: techTokens.colors.backgroundDeep,
      cornerColor: 'rgba(3, 8, 13, 0.48)',
    },
    secondary: {
      backgroundColor: 'rgba(142, 124, 255, 0.16)',
      borderColor: 'rgba(164, 151, 255, 0.56)',
      color: techTokens.colors.text,
      cornerColor: techTokens.colors.secondary,
    },
    ghost: {
      backgroundColor: 'rgba(255, 255, 255, 0.026)',
      borderColor: techTokens.colors.line,
      color: techTokens.colors.text,
      cornerColor: 'rgba(119, 193, 221, 0.5)',
    },
    danger: {
      backgroundColor: 'rgba(255, 111, 125, 0.12)',
      borderColor: 'rgba(255, 111, 125, 0.48)',
      color: techTokens.colors.error,
      cornerColor: techTokens.colors.error,
    },
  }[variant];

  return (
    <Animated.View
      style={[
        {
          opacity: disabled ? 0.46 : 1,
          transform: [{ scale }, { translateY: lift }],
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animate(true)}
        onPressOut={() => animate(false)}
        android_ripple={{ color: 'rgba(255,255,255,0.16)', foreground: true }}
        style={[
          styles.button,
          {
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
            shadowColor: variant === 'primary' ? techTokens.colors.primary : palette.borderColor,
          },
        ]}
      >
        <TechCornerBrackets color={palette.cornerColor} />
        <TechShimmer
          duration={variant === 'primary' ? 1500 : 2400}
          color={variant === 'primary' ? 'rgba(255,255,255,0.34)' : 'rgba(133,231,255,0.12)'}
        />
        <View style={styles.content}>
          {icon ? (
            <Animated.View style={{ transform: [{ scale: iconPulse }] }}>
              <Icon source={icon} size={19} color={palette.color} />
            </Animated.View>
          ) : null}
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
    overflow: 'hidden',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  content: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.35,
  },
});

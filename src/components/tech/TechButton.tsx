import React from 'react';
import {
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

  const palette = {
    primary: {
      backgroundColor: techTokens.colors.primary,
      borderColor: '#9DEBFF',
      color: techTokens.colors.backgroundDeep,
      cornerColor: 'rgba(3,8,13,0.48)',
    },
    secondary: {
      backgroundColor: 'rgba(142,124,255,0.16)',
      borderColor: 'rgba(164,151,255,0.56)',
      color: techTokens.colors.text,
      cornerColor: techTokens.colors.secondary,
    },
    ghost: {
      backgroundColor: 'rgba(255,255,255,0.026)',
      borderColor: techTokens.colors.line,
      color: techTokens.colors.text,
      cornerColor: 'rgba(119,193,221,0.5)',
    },
    danger: {
      backgroundColor: 'rgba(255,111,125,0.12)',
      borderColor: 'rgba(255,111,125,0.48)',
      color: techTokens.colors.error,
      cornerColor: techTokens.colors.error,
    },
  }[variant];

  return (
    <View style={[{ opacity: disabled ? 0.46 : 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: 'rgba(255,255,255,0.14)', foreground: true }}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: palette.backgroundColor,
            borderColor: palette.borderColor,
            opacity: pressed ? 0.84 : 1,
            transform: [{ scale: pressed && motion.pressFeedback ? 0.98 : 1 }],
          },
        ]}
      >
        <TechCornerBrackets color={palette.cornerColor} />
        <TechShimmer
          color={variant === 'primary' ? 'rgba(255,255,255,0.10)' : 'rgba(133,231,255,0.045)'}
        />
        <View style={styles.content}>
          {icon ? <Icon source={icon} size={19} color={palette.color} /> : null}
          <Text style={[styles.label, { color: palette.color, marginLeft: icon ? 8 : 0 }]}>{label}</Text>
        </View>
      </Pressable>
    </View>
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
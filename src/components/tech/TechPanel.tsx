import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { techTokens } from '../../theme/tech/tokens';
import { TechCornerBrackets, TechEntrance, TechShimmer } from './TechMotion';

type TechPanelProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: boolean;
  index?: number;
  animated?: boolean;
  corners?: boolean;
};

export function TechPanel({
  children,
  style,
  accent = false,
  index = 0,
  animated = true,
  corners = true,
}: TechPanelProps) {
  const panel = (
    <View style={[styles.panel, accent && styles.accent, style]}>
      {accent ? <View pointerEvents="none" style={styles.accentLine} /> : null}
      {corners ? (
        <TechCornerBrackets color={accent ? techTokens.colors.primary : 'rgba(119,193,221,0.42)'} />
      ) : null}
      <TechShimmer color={accent ? 'rgba(85,217,255,0.055)' : 'rgba(133,231,255,0.035)'} />
      <View style={styles.content}>{children}</View>
    </View>
  );

  return animated ? <TechEntrance index={index}>{panel}</TechEntrance> : panel;
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: techTokens.radius.lg,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    backgroundColor: techTokens.colors.surfaceGlass,
    padding: techTokens.spacing.lg,
    overflow: 'hidden',
  },
  content: {
    zIndex: 2,
  },
  accent: {
    borderColor: 'rgba(85,217,255,0.30)',
    backgroundColor: 'rgba(12,31,42,0.84)',
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 2.5,
    borderRadius: 2,
    backgroundColor: techTokens.colors.primary,
    opacity: 0.78,
  },
});
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { techTokens } from '../../theme/tech/tokens';

type TechPanelProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: boolean;
};

export function TechPanel({ children, style, accent = false }: TechPanelProps) {
  return (
    <View style={[styles.panel, accent && styles.accent, style]}>
      {accent ? <View pointerEvents="none" style={styles.accentLine} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: techTokens.radius.lg,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    backgroundColor: techTokens.colors.surfaceGlass,
    padding: techTokens.spacing.lg,
    ...techTokens.shadows.panel,
  },
  accent: {
    borderColor: 'rgba(85, 217, 255, 0.32)',
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 2,
    borderRadius: 1,
    backgroundColor: techTokens.colors.primary,
  },
});

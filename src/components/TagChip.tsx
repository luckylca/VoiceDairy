import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Chip } from 'react-native-paper';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { techTokens } from '../theme/tech/tokens';

export function TagChip({ label }: { label: string }) {
  const { isTech } = useVisualStyle();

  if (!isTech) {
    return (
      <Chip compact style={{ marginRight: 6, marginTop: 6 }}>
        {label}
      </Chip>
    );
  }

  return (
    <View style={styles.techChip}>
      <View style={styles.techDot} />
      <Text numberOfLines={1} style={styles.techLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  techChip: {
    maxWidth: 160,
    minHeight: 27,
    marginRight: 6,
    marginTop: 6,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    backgroundColor: 'rgba(85, 217, 255, 0.055)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  techDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 6,
    backgroundColor: techTokens.colors.primary,
  },
  techLabel: {
    color: techTokens.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.35,
  },
});

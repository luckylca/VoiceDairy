import React from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text as NativeText, View } from 'react-native';
import { Icon, IconButton, Text, useTheme } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { entryTypeIcon, entryTypeLabel } from '../types/entry';
import { formatDateTime } from '../utils/date';
import { truncateText } from '../utils/text';
import { TagChip } from './TagChip';
import { MotionTouchable } from './MotionTouchable';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { techTokens } from '../theme/tech/tokens';
import { TechCornerBrackets, TechEntrance, TechShimmer } from './tech/TechMotion';

type EntryCardProps = {
  entry: Entry;
  typeLabel?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  onToggleDone?: () => void;
  index?: number;
};

const typeColors: Record<Entry['type'], string> = {
  idea: techTokens.colors.primary,
  todo: techTokens.colors.success,
  reminder: techTokens.colors.warning,
  note: '#83A9FF',
  journal: techTokens.colors.secondary,
  question: '#F19CFF',
  project: '#5DF0DB',
  unknown: techTokens.colors.textMuted,
};

export function EntryCard({
  entry,
  typeLabel,
  onPress,
  onLongPress,
  onToggleDone,
  index = 0,
}: EntryCardProps) {
  const theme = useTheme();
  const { isTech } = useVisualStyle();
  const isTodo = entry.type === 'todo';
  const isReminder = entry.type === 'reminder';
  const displayTime = isReminder
    ? entry.datetime ?? entry.dueDate ?? entry.createdAt
    : entry.createdAt;
  const accent = typeColors[entry.type];

  function handleToggleDone(event: GestureResponderEvent) {
    event.stopPropagation();
    onToggleDone?.();
  }

  if (isTech) {
    return (
      <TechEntrance index={index} from={index % 2 === 0 ? 'right' : 'left'}>
        <MotionTouchable
          onPress={onPress}
          onLongPress={onLongPress}
          borderRadius={18}
          accessibilityLabel={`打开${entry.title}，长按可以删除`}
          style={styles.techOuter}
          contentStyle={[styles.techCard, { borderColor: `${accent}42` }]}
        >
          <TechCornerBrackets color={`${accent}8C`} />
          <TechShimmer duration={2200 + (index % 4) * 340} color={`${accent}12`} />
          <View style={[styles.techAccent, { backgroundColor: accent }]} />
          <View style={styles.techContent}>
            <View style={styles.techHeader}>
              <View style={[styles.techIcon, { borderColor: `${accent}66`, backgroundColor: `${accent}10` }]}>
                <Icon source={entryTypeIcon[entry.type]} size={22} color={accent} />
              </View>

              <View style={styles.techTitleArea}>
                <View style={styles.techEyebrowRow}>
                  <NativeText style={[styles.techType, { color: accent }]}>
                    {(typeLabel ?? entryTypeLabel[entry.type]).toUpperCase()}
                  </NativeText>
                  <NativeText style={styles.techTime}>{formatDateTime(displayTime)}</NativeText>
                </View>
                <NativeText numberOfLines={1} style={styles.techTitle}>{entry.title}</NativeText>
              </View>

              {isTodo ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={entry.status === 'done' ? '标记为未完成' : '标记为完成'}
                  onPress={handleToggleDone}
                  style={[
                    styles.techStatusButton,
                    {
                      borderColor: entry.status === 'done' ? techTokens.colors.success : techTokens.colors.line,
                      backgroundColor: entry.status === 'done' ? 'rgba(82,230,184,0.11)' : 'transparent',
                    },
                  ]}
                >
                  <Icon
                    source={entry.status === 'done' ? 'check-bold' : 'circle-outline'}
                    size={18}
                    color={entry.status === 'done' ? techTokens.colors.success : techTokens.colors.textMuted}
                  />
                </Pressable>
              ) : (
                <View style={styles.techChevron}>
                  <Icon source="chevron-right" size={20} color={accent} />
                </View>
              )}
            </View>

            <NativeText
              numberOfLines={4}
              style={[
                styles.techBody,
                entry.status === 'done' && styles.techBodyDone,
              ]}
            >
              {truncateText(entry.content, 180)}
            </NativeText>

            {entry.project || entry.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {entry.project ? <TagChip label={entry.project} /> : null}
                {entry.tags.map(tag => <TagChip key={tag} label={tag} />)}
              </View>
            ) : null}

            <View style={styles.techFooter}>
              <NativeText style={styles.techCode}>ENTRY/{entry.id.slice(-6).toUpperCase()}</NativeText>
              <View style={styles.techConfidenceTrack}>
                <View
                  style={[
                    styles.techConfidenceFill,
                    { width: `${Math.max(8, Math.round(entry.confidence * 100))}%`, backgroundColor: accent },
                  ]}
                />
              </View>
            </View>
          </View>
        </MotionTouchable>
      </TechEntrance>
    );
  }

  return (
    <MotionTouchable
      onPress={onPress}
      onLongPress={onLongPress}
      borderRadius={22}
      accessibilityLabel={`打开${entry.title}，长按可以删除`}
      style={{ marginHorizontal: 16, marginVertical: 7 }}
      contentStyle={{
        borderRadius: 22,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
      }}
    >
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primaryContainer,
            }}
          >
            <Icon source={entryTypeIcon[entry.type]} size={24} color={theme.colors.onPrimaryContainer} />
          </View>

          <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
            <Text variant="titleMedium" numberOfLines={1} style={{ fontWeight: '900' }}>{entry.title}</Text>
            <Text variant="bodySmall" numberOfLines={1} style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
              {typeLabel ?? entryTypeLabel[entry.type]} · {formatDateTime(displayTime)}
            </Text>
          </View>

          {isTodo ? (
            <IconButton
              icon={entry.status === 'done' ? 'check-circle' : 'checkbox-blank-circle-outline'}
              iconColor={entry.status === 'done' ? theme.colors.primary : theme.colors.onSurfaceVariant}
              onPress={handleToggleDone}
              accessibilityLabel={entry.status === 'done' ? '标记为未完成' : '标记为完成'}
            />
          ) : (
            <Icon source="chevron-right" size={23} color={theme.colors.onSurfaceVariant} />
          )}
        </View>

        <Text
          variant="bodyMedium"
          numberOfLines={4}
          style={{
            marginTop: 13,
            lineHeight: 22,
            color: entry.status === 'done' ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
            opacity: entry.status === 'done' ? 0.55 : 1,
            textDecorationLine: entry.status === 'done' ? 'line-through' : 'none',
          }}
        >
          {truncateText(entry.content, 160)}
        </Text>

        {entry.project || entry.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 9 }}>
            {entry.project ? <TagChip label={entry.project} /> : null}
            {entry.tags.map(tag => <TagChip key={tag} label={tag} />)}
          </View>
        ) : null}
      </View>
    </MotionTouchable>
  );
}

const styles = StyleSheet.create({
  techOuter: {
    marginHorizontal: 16,
    marginVertical: 7,
  },
  techCard: {
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(8, 25, 35, 0.88)',
    overflow: 'hidden',
  },
  techAccent: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 2.5,
    borderRadius: 2,
  },
  techContent: {
    zIndex: 2,
    padding: 15,
    paddingLeft: 17,
  },
  techHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  techIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techTitleArea: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  techEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  techType: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.15,
  },
  techTime: {
    color: techTokens.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  techTitle: {
    marginTop: 5,
    color: techTokens.colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.15,
  },
  techStatusButton: {
    width: 38,
    height: 38,
    marginLeft: 9,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techChevron: {
    width: 32,
    height: 38,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techBody: {
    marginTop: 13,
    color: '#C9DDE6',
    fontSize: 14,
    lineHeight: 21,
  },
  techBodyDone: {
    color: techTokens.colors.textMuted,
    opacity: 0.55,
    textDecorationLine: 'line-through',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 7,
  },
  techFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  techCode: {
    color: 'rgba(143,168,181,0.42)',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  techConfidenceTrack: {
    width: 68,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(143,168,181,0.12)',
  },
  techConfidenceFill: {
    height: '100%',
    borderRadius: 1,
  },
});

import React from 'react';
import { GestureResponderEvent, View } from 'react-native';
import { Icon, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { entryTypeIcon, entryTypeLabel } from '../types/entry';
import { formatDateTime } from '../utils/date';
import { truncateText } from '../utils/text';
import { TagChip } from './TagChip';
import { MotionTouchable } from './MotionTouchable';

type EntryCardProps = {
  entry: Entry;
  onPress?: () => void;
  onToggleDone?: () => void;
};

export function EntryCard({ entry, onPress, onToggleDone }: EntryCardProps) {
  const theme = useTheme();
  const isTodo = entry.type === 'todo';

  function handleToggleDone(event: GestureResponderEvent) {
    event.stopPropagation();
    onToggleDone?.();
  }

  return (
    <MotionTouchable
      onPress={onPress}
      borderRadius={22}
      accessibilityLabel={`打开${entry.title}`}
      style={{ marginHorizontal: 16, marginVertical: 8 }}
    >
      <Surface
        elevation={1}
        style={{
          borderRadius: 22,
          padding: 16,
          backgroundColor: theme.colors.surface,
        }}
      >
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
            <Text variant="titleMedium" numberOfLines={1} style={{ fontWeight: '900' }}>
              {entry.title}
            </Text>
            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}
            >
              {entryTypeLabel[entry.type]} · {formatDateTime(entry.datetime ?? entry.dueDate ?? entry.createdAt)}
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
          }}
        >
          {truncateText(entry.content, 160)}
        </Text>

        {entry.project || entry.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 9 }}>
            {entry.project ? <TagChip label={entry.project} /> : null}
            {entry.tags.map(tag => (
              <TagChip key={tag} label={tag} />
            ))}
          </View>
        ) : null}
      </Surface>
    </MotionTouchable>
  );
}

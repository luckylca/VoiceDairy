import React from 'react';
import { View } from 'react-native';
import { Card, IconButton, Text } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { entryTypeIcon, entryTypeLabel } from '../types/entry';
import { formatDateTime } from '../utils/date';
import { truncateText } from '../utils/text';
import { TagChip } from './TagChip';

type EntryCardProps = {
  entry: Entry;
  onPress?: () => void;
  onToggleDone?: () => void;
};

export function EntryCard({ entry, onPress, onToggleDone }: EntryCardProps) {
  const isTodo = entry.type === 'todo';

  return (
    <Card mode="elevated" onPress={onPress} style={{ marginHorizontal: 16, marginVertical: 8, borderRadius: 20 }}>
      <Card.Title
        title={entry.title}
        subtitle={`${entryTypeLabel[entry.type]} · ${formatDateTime(entry.datetime ?? entry.dueDate ?? entry.createdAt)}`}
        left={props => <IconButton {...props} icon={entryTypeIcon[entry.type]} />}
        right={props =>
          isTodo ? (
            <IconButton
              {...props}
              icon={entry.status === 'done' ? 'check-circle' : 'checkbox-blank-circle-outline'}
              onPress={onToggleDone}
            />
          ) : null
        }
      />
      <Card.Content>
        <Text variant="bodyMedium" style={{ opacity: entry.status === 'done' ? 0.55 : 1 }}>
          {truncateText(entry.content, 120)}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {entry.project ? <TagChip label={entry.project} /> : null}
          {entry.tags.map(tag => (
            <TagChip key={tag} label={tag} />
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

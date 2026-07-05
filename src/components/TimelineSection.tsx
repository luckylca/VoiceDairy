import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { EntryCard } from './EntryCard';

export function TimelineSection({
  title,
  entries,
  onToggleDone,
}: {
  title: string;
  entries: Entry[];
  onToggleDone?: (entryId: string) => void;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={{ marginTop: 16 }}>
      <Text variant="titleMedium" style={{ marginHorizontal: 16, marginBottom: 4, fontWeight: '700' }}>
        {title}
      </Text>
      {entries.map(entry => (
        <EntryCard key={entry.id} entry={entry} onToggleDone={() => onToggleDone?.(entry.id)} />
      ))}
    </View>
  );
}

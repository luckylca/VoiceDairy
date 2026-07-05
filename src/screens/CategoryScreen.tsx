import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { List, Text } from 'react-native-paper';
import type { Entry, EntryType } from '../types/entry';
import { entryTypeIcon, entryTypeLabel } from '../types/entry';
import { listEntries } from '../services/database/EntryRepository';

const types: EntryType[] = ['idea', 'todo', 'reminder', 'note', 'journal', 'question', 'project', 'unknown'];

export function CategoryScreen() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useFocusEffect(
    useCallback(() => {
      listEntries().then(setEntries);
    }, []),
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text variant="headlineSmall" style={{ fontWeight: '800', marginBottom: 12 }}>
        分类统计
      </Text>
      {types.map(type => {
        const count = entries.filter(item => item.type === type).length;
        return (
          <List.Item
            key={type}
            title={entryTypeLabel[type]}
            description={`${count} 个条目`}
            left={props => <List.Icon {...props} icon={entryTypeIcon[type]} />}
          />
        );
      })}
    </ScrollView>
  );
}

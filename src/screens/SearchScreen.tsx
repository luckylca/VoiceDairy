import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, TextInput } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { EntryCard } from '../components/EntryCard';
import { listEntries } from '../services/database/EntryRepository';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);

  useFocusEffect(
    useCallback(() => {
      listEntries().then(setEntries);
    }, []),
  );

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return entries;

    return entries.filter(entry => {
      const haystack = [
        entry.title,
        entry.content,
        entry.type,
        entry.project ?? '',
        entry.tags.join(' '),
        entry.datetime ?? '',
        entry.dueDate ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [entries, query]);

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
      <Text variant="headlineSmall" style={{ fontWeight: '800', marginHorizontal: 16 }}>
        搜索
      </Text>
      <TextInput
        mode="outlined"
        label="搜索标题、内容、标签、项目、日期、类型"
        value={query}
        onChangeText={setQuery}
        style={{ margin: 16 }}
      />
      {results.length === 0 ? <Text style={{ marginHorizontal: 16, opacity: 0.72 }}>没有匹配结果。</Text> : null}
      {results.map(entry => <EntryCard key={entry.id} entry={entry} />)}
    </ScrollView>
  );
}

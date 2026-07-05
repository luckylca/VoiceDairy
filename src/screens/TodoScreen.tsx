import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { EntryCard } from '../components/EntryCard';
import { listEntriesByType, toggleTodoDone } from '../services/database/EntryRepository';

export function TodoScreen() {
  const [todos, setTodos] = useState<Entry[]>([]);

  const refresh = useCallback(async () => {
    setTodos(await listEntriesByType('todo'));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function handleToggleDone(entryId: string) {
    await toggleTodoDone(entryId);
    await refresh();
  }

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
          待办
        </Text>
        <Text style={{ marginTop: 6, opacity: 0.72 }}>查看所有待办，并快速标记完成。</Text>
      </View>
      {todos.length === 0 ? (
        <Text style={{ padding: 16, opacity: 0.72 }}>暂无待办。</Text>
      ) : (
        todos.map(todo => <EntryCard key={todo.id} entry={todo} onToggleDone={() => handleToggleDone(todo.id)} />)
      )}
    </ScrollView>
  );
}

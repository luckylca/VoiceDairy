import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { EntryCard } from '../components/EntryCard';
import { listEntriesByType } from '../services/database/EntryRepository';

export function ReminderScreen() {
  const [reminders, setReminders] = useState<Entry[]>([]);

  useFocusEffect(
    useCallback(() => {
      listEntriesByType('reminder').then(setReminders);
    }, []),
  );

  const now = Date.now();
  const upcoming = reminders.filter(item => item.datetime && new Date(item.datetime).getTime() >= now);
  const expired = reminders.filter(item => item.datetime && new Date(item.datetime).getTime() < now);
  const incomplete = reminders.filter(item => !item.datetime);

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
          提醒
        </Text>
        <Text style={{ marginTop: 6, opacity: 0.72 }}>第三阶段会接入 Android 本地通知。</Text>
      </View>

      <Text variant="titleMedium" style={{ margin: 16, fontWeight: '700' }}>未来提醒</Text>
      {upcoming.length === 0 ? <Text style={{ marginHorizontal: 16, opacity: 0.72 }}>暂无未来提醒。</Text> : null}
      {upcoming.map(entry => <EntryCard key={entry.id} entry={entry} />)}

      <Text variant="titleMedium" style={{ margin: 16, fontWeight: '700' }}>时间不完整</Text>
      {incomplete.length === 0 ? <Text style={{ marginHorizontal: 16, opacity: 0.72 }}>暂无需要补全时间的提醒。</Text> : null}
      {incomplete.map(entry => <EntryCard key={entry.id} entry={entry} />)}

      <Text variant="titleMedium" style={{ margin: 16, fontWeight: '700' }}>已过期</Text>
      {expired.length === 0 ? <Text style={{ marginHorizontal: 16, opacity: 0.72 }}>暂无过期提醒。</Text> : null}
      {expired.map(entry => <EntryCard key={entry.id} entry={entry} />)}
    </ScrollView>
  );
}

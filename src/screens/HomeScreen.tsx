import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Text } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { getTimelineGroup } from '../utils/date';
import { listEntries, toggleTodoDone } from '../services/database/EntryRepository';
import { TimelineSection } from '../components/TimelineSection';

const timelineGroups = ['今天', '昨天', '本周', '更早'] as const;

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const [entries, setEntries] = useState<Entry[]>([]);

  const refresh = useCallback(async () => {
    setEntries(await listEntries());
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
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingBottom: 96 }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
            今天有什么想法？
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 6, opacity: 0.72 }}>
            输入一段口语化文字，交给大模型整理成想法、待办、提醒和笔记。
          </Text>
          <Button mode="contained" icon="plus" style={{ marginTop: 16 }} onPress={() => navigation.navigate('VoiceInput')}>
            新建记录
          </Button>
        </View>

        {entries.length === 0 ? (
          <View style={{ padding: 24 }}>
            <Text variant="titleMedium">暂无记录</Text>
            <Text style={{ marginTop: 8, opacity: 0.72 }}>先去“记录”页输入一段文字试试。</Text>
          </View>
        ) : (
          timelineGroups.map(group => (
            <TimelineSection
              key={group}
              title={group}
              entries={entries.filter(entry => getTimelineGroup(entry.createdAt) === group)}
              onToggleDone={handleToggleDone}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

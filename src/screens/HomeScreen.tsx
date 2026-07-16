import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FAB, Searchbar, Surface, Text, useTheme } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { entryTypeLabel } from '../types/entry';
import { getTimelineGroup } from '../utils/date';
import { listEntries, toggleTodoDone } from '../services/database/EntryRepository';
import { TimelineSection } from '../components/TimelineSection';
import { SwipeableTabScreen } from '../components/SwipeableTabScreen';

const timelineGroups = ['今天', '昨天', '本周', '更早'] as const;

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    setEntries(await listEntries());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filteredEntries = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return entries;
    }

    return entries.filter(entry => {
      const searchableText = [
        entry.title,
        entry.content,
        entry.project ?? '',
        entry.tags.join(' '),
        entryTypeLabel[entry.type],
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(keyword);
    });
  }, [entries, query]);

  async function handleToggleDone(entryId: string) {
    await toggleTodoDone(entryId);
    await refresh();
  }

  return (
    <SwipeableTabScreen routeName="Home">
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 112 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingHorizontal: 16 }}>
            <Text variant="headlineMedium" style={{ fontWeight: '900' }}>
              时间线
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
              {query.trim() ? `找到 ${filteredEntries.length} 个条目` : `共 ${entries.length} 个条目`}
            </Text>
            <Searchbar
              placeholder="搜索标题、内容、标签或项目"
              value={query}
              onChangeText={setQuery}
              style={{ marginTop: 16, borderRadius: 18, backgroundColor: theme.colors.surfaceVariant }}
              inputStyle={{ minHeight: 0 }}
            />
          </View>

          {filteredEntries.length === 0 ? (
            <Surface
              elevation={1}
              style={{
                marginHorizontal: 16,
                marginTop: 24,
                padding: 24,
                borderRadius: 20,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                {query.trim() ? '没有匹配的内容' : '还没有记录'}
              </Text>
              <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                {query.trim() ? '换一个关键词，或清空搜索后查看全部内容。' : '点击右下角按钮，用语音或文字记录第一个想法。'}
              </Text>
            </Surface>
          ) : (
            timelineGroups.map(group => (
              <TimelineSection
                key={group}
                title={group}
                entries={filteredEntries.filter(entry => getTimelineGroup(entry.createdAt) === group)}
                onToggleDone={handleToggleDone}
              />
            ))
          )}
        </ScrollView>

        <FAB
          icon="microphone-outline"
          label="记录"
          onPress={() => navigation.navigate('VoiceInput')}
          style={{ position: 'absolute', right: 20, bottom: 20 }}
        />
      </View>
    </SwipeableTabScreen>
  );
}

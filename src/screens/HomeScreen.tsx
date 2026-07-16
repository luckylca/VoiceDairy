import React, { useCallback, useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FAB, Searchbar, Text, useTheme } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { entryTypeLabel } from '../types/entry';
import { getTimelineGroup } from '../utils/date';
import { listEntries, toggleTodoDone } from '../services/database/EntryRepository';
import { EntryCard } from '../components/EntryCard';
import { MotionTouchable } from '../components/MotionTouchable';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

const timelineGroups = ['今天', '昨天', '本周', '更早'] as const;

type TimelineSectionData = {
  title: (typeof timelineGroups)[number];
  data: Entry[];
};

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
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

  const sections = useMemo<TimelineSectionData[]>(
    () =>
      timelineGroups
        .map(title => ({
          title,
          data: filteredEntries.filter(entry => getTimelineGroup(entry.createdAt) === title),
        }))
        .filter(section => section.data.length > 0),
    [filteredEntries],
  );

  async function handleToggleDone(entry: Entry) {
    await toggleTodoDone(entry.id);
    await refresh();
    showNotification({
      title: entry.status === 'done' ? '已恢复待办' : '已完成待办',
      message: entry.title,
      kind: 'success',
      icon: entry.status === 'done' ? 'restore' : 'check-bold',
    });
  }

  function openEntry(entry: Entry) {
    navigation.navigate('EntryDetail', { entryId: entry.id });
  }

  const header = (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
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
        style={{ marginTop: 16, borderRadius: 20, backgroundColor: theme.colors.surfaceVariant }}
        inputStyle={{ minHeight: 0 }}
        elevation={0}
      />
    </View>
  );

  const emptyState = (
    <MotionTouchable
      onPress={() => navigation.navigate('VoiceInput')}
      borderRadius={22}
      style={{ marginHorizontal: 16, marginTop: 16 }}
      contentStyle={{
        borderRadius: 22,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
      }}
    >
      <View style={{ padding: 24 }}>
        <Text variant="titleMedium" style={{ fontWeight: '900' }}>
          {query.trim() ? '没有匹配的内容' : '还没有记录'}
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
          {query.trim()
            ? '点击这里新建记录，或清空搜索查看全部内容。'
            : '点击这里或右下角按钮，用语音或文字记录第一个想法。'}
        </Text>
      </View>
    </MotionTouchable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SectionList<Entry, TimelineSectionData>
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            onPress={() => openEntry(item)}
            onToggleDone={item.type === 'todo' ? () => handleToggleDone(item) : undefined}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Text
            variant="titleMedium"
            style={{
              marginHorizontal: 16,
              marginTop: 14,
              marginBottom: 2,
              fontWeight: '800',
              color: theme.colors.onSurface,
            }}
          >
            {section.title}
          </Text>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyState}
        contentContainerStyle={{ paddingBottom: 112, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        updateCellsBatchingPeriod={16}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="microphone-outline"
        label="记录"
        onPress={() => navigation.navigate('VoiceInput')}
        style={{ position: 'absolute', right: 20, bottom: 20 }}
      />
    </View>
  );
}

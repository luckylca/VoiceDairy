import React, { useCallback, useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Dialog, FAB, Portal, Searchbar, Text, useTheme } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { entryTypeLabel } from '../types/entry';
import type { CategorySetting, ConfigurableCategoryType } from '../types/category';
import { getTimelineGroup } from '../utils/date';
import { deleteEntry, listEntries, toggleTodoDone } from '../services/database/EntryRepository';
import { loadCategorySettings } from '../services/settings/CategorySettingsService';
import { EntryCard } from '../components/EntryCard';
import { MotionTouchable } from '../components/MotionTouchable';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

const timelineGroups = ['今天', '昨天', '本周', '更早'] as const;

type TimelineSectionData = {
  title: (typeof timelineGroups)[number];
  data: Entry[];
};

function isConfigurableCategory(type: string): type is ConfigurableCategoryType {
  return type === 'idea' || type === 'todo' || type === 'project' || type === 'reminder';
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categorySettings, setCategorySettings] = useState<CategorySetting[]>([]);
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    const [nextEntries, nextCategories] = await Promise.all([listEntries(), loadCategorySettings()]);
    setEntries(nextEntries);
    setCategorySettings(nextCategories);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const categoryLabels = useMemo(() => {
    return new Map(categorySettings.map(item => [item.type, item.label]));
  }, [categorySettings]);

  const labelForEntry = useCallback(
    (entry: Entry) =>
      isConfigurableCategory(entry.type)
        ? categoryLabels.get(entry.type) ?? entryTypeLabel[entry.type]
        : entryTypeLabel[entry.type],
    [categoryLabels],
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
        labelForEntry(entry),
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(keyword);
    });
  }, [entries, labelForEntry, query]);

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

  async function handleDeleteEntry() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEntry(deleteTarget.id);
      const deletedTitle = deleteTarget.title;
      setDeleteTarget(null);
      await refresh();
      showNotification({
        title: '笔记已删除',
        message: deletedTitle,
        kind: 'success',
        icon: 'delete-outline',
      });
    } finally {
      setDeleting(false);
    }
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
            typeLabel={labelForEntry(item)}
            onPress={() => openEntry(item)}
            onLongPress={() => setDeleteTarget(item)}
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

      <Portal>
        <Dialog visible={Boolean(deleteTarget)} onDismiss={() => !deleting && setDeleteTarget(null)}>
          <Dialog.Icon icon="delete-outline" />
          <Dialog.Title>删除这条笔记？</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {deleteTarget ? `“${deleteTarget.title}”删除后无法恢复。` : ''}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={deleting} onPress={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button loading={deleting} textColor={theme.colors.error} onPress={handleDeleteEntry}>
              删除
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

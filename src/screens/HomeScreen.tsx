import React, { useCallback, useMemo, useState } from 'react';
import {
  SectionList,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Dialog, FAB, Icon, Portal, Searchbar, Text, useTheme } from 'react-native-paper';
import type { Entry } from '../types/entry';
import { entryTypeLabel } from '../types/entry';
import type { CategorySetting, ConfigurableCategoryType } from '../types/category';
import { getTimelineGroup } from '../utils/date';
import { deleteEntry, listEntries, toggleTodoDone } from '../services/database/EntryRepository';
import { loadCategorySettings } from '../services/settings/CategorySettingsService';
import { EntryCard } from '../components/EntryCard';
import { MotionTouchable } from '../components/MotionTouchable';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { TechScreen } from '../components/tech/TechScreen';
import { TechPanel } from '../components/tech/TechPanel';
import { TechButton } from '../components/tech/TechButton';
import { TechEntrance } from '../components/tech/TechMotion';
import { techTokens } from '../theme/tech/tokens';
import { openMainTab } from '../navigation/MainTabController';

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
  const { isTech } = useVisualStyle();
  const { showNotification } = useFluidNotification();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categorySettings, setCategorySettings] = useState<CategorySetting[]>([]);
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    const [nextEntries, nextCategories] = await Promise.all([listEntries(), loadCategorySettings()]);
    setEntries(nextEntries);
    setCategorySettings(nextCategories);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
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
    if (!keyword) return entries;

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

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

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

  const classicHeader = (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
      <Text variant="headlineMedium" style={{ fontWeight: '900' }}>时间线</Text>
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

  const techHeader = (
    <TechEntrance from="top">
      <View style={styles.techHeader}>
        <View style={styles.techHeadingRow}>
          <View>
            <Text style={styles.techEyebrow}>PERSONAL DATA STREAM</Text>
            <Text style={styles.techTitle}>时间线</Text>
            <Text style={styles.techCount}>
              {query.trim() ? `FILTERED ${filteredEntries.length}` : `TOTAL ${entries.length}`} · LOCAL INDEX
            </Text>
          </View>
          <View style={styles.syncModule}>
            <View style={styles.syncRing}>
              <Icon source="database-check-outline" size={21} color={techTokens.colors.success} />
            </View>
            <Text style={styles.syncText}>SYNCED</Text>
          </View>
        </View>

        <View style={styles.techSearch}>
          <Icon source="magnify" size={21} color={techTokens.colors.primary} />
          <NativeTextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜索标题、内容、标签或项目"
            placeholderTextColor={techTokens.colors.textMuted}
            selectionColor={techTokens.colors.primary}
            style={styles.techSearchInput}
          />
          {query ? (
            <MotionTouchable onPress={() => setQuery('')} borderRadius={9} contentStyle={styles.clearButton}>
              <Icon source="close" size={17} color={techTokens.colors.textMuted} />
            </MotionTouchable>
          ) : (
            <Text style={styles.searchCode}>QUERY</Text>
          )}
        </View>
      </View>
    </TechEntrance>
  );

  const classicEmptyState = (
    <MotionTouchable
      onPress={() => openMainTab('record')}
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

  const techEmptyState = (
    <TechPanel accent index={1} style={{ marginHorizontal: 16, marginTop: 18 }}>
      <View style={styles.emptyIcon}>
        <Icon source={query.trim() ? 'database-search-outline' : 'timeline-plus-outline'} size={32} color={techTokens.colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{query.trim() ? '未发现匹配节点' : '等待第一条数据'}</Text>
      <Text style={styles.emptyBody}>
        {query.trim() ? '调整查询关键词，或创建一条新的语音记录。' : '语音、待办、提醒和项目进展会在这里汇入同一条时间流。'}
      </Text>
      <TechButton label="开始记录" icon="microphone-outline" onPress={() => openMainTab('record')} style={{ marginTop: 16 }} />
    </TechPanel>
  );

  const list = (
    <SectionList<Entry, TimelineSectionData>
      sections={sections}
      keyExtractor={item => item.id}
      renderItem={({ item, index }) => (
        <EntryCard
          entry={item}
          index={index}
          typeLabel={labelForEntry(item)}
          onPress={() => openEntry(item)}
          onLongPress={() => setDeleteTarget(item)}
          onToggleDone={item.type === 'todo' ? () => handleToggleDone(item) : undefined}
        />
      )}
      renderSectionHeader={({ section }) =>
        isTech ? (
          <View style={styles.techSectionHeader}>
            <View style={styles.timelineRail}>
              <View style={styles.timelineNode} />
            </View>
            <Text style={styles.techSectionTitle}>{section.title}</Text>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionCount}>{section.data.length.toString().padStart(2, '0')}</Text>
          </View>
        ) : (
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
        )
      }
      ListHeaderComponent={isTech ? techHeader : classicHeader}
      ListEmptyComponent={isTech ? techEmptyState : classicEmptyState}
      contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      stickySectionHeadersEnabled={false}
      removeClippedSubviews
      initialNumToRender={8}
      maxToRenderPerBatch={10}
      windowSize={7}
      updateCellsBatchingPeriod={16}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: isTech ? techTokens.colors.background : theme.colors.background }}>
      {isTech ? <TechScreen>{list}</TechScreen> : list}

      {isTech ? (
        <TechButton
          label="新记录"
          icon="microphone-outline"
          onPress={() => openMainTab('record')}
          style={styles.techFloatingButton}
        />
      ) : (
        <FAB
          icon="microphone-outline"
          label="记录"
          onPress={() => openMainTab('record')}
          style={{ position: 'absolute', right: 20, bottom: 20 }}
        />
      )}

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
            <Button disabled={deleting} onPress={() => setDeleteTarget(null)}>取消</Button>
            <Button loading={deleting} textColor={theme.colors.error} onPress={handleDeleteEntry}>删除</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  techHeader: {
    paddingHorizontal: 18,
    paddingTop: 21,
    paddingBottom: 8,
  },
  techHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  techEyebrow: {
    color: techTokens.colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.45,
  },
  techTitle: {
    marginTop: 5,
    color: techTokens.colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  techCount: {
    marginTop: 5,
    color: techTokens.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  syncModule: {
    alignItems: 'center',
  },
  syncRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(82,230,184,0.35)',
    backgroundColor: 'rgba(82,230,184,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncText: {
    marginTop: 4,
    color: techTokens.colors.success,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  techSearch: {
    height: 50,
    marginTop: 17,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    backgroundColor: 'rgba(4,16,24,0.82)',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  techSearchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    color: techTokens.colors.text,
    fontSize: 14,
  },
  clearButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  searchCode: {
    color: 'rgba(143,168,181,0.38)',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  techSectionHeader: {
    height: 43,
    marginHorizontal: 16,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineRail: {
    width: 18,
    alignItems: 'center',
  },
  timelineNode: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: techTokens.colors.primary,
    backgroundColor: techTokens.colors.background,
    shadowColor: techTokens.colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  techSectionTitle: {
    marginLeft: 5,
    color: techTokens.colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 10,
    backgroundColor: techTokens.colors.line,
  },
  sectionCount: {
    color: techTokens.colors.primary,
    fontSize: 9,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    backgroundColor: 'rgba(85,217,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 15,
    color: techTokens.colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  emptyBody: {
    marginTop: 8,
    color: techTokens.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  techFloatingButton: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    minWidth: 126,
  },
});

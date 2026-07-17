import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Icon, Text, useTheme } from 'react-native-paper';
import type { RootStackParamList } from '../navigation/types';
import type { Entry } from '../types/entry';
import type { CategorySetting } from '../types/category';
import type { ProjectItem } from '../types/project';
import { listEntriesByType, toggleTodoDone } from '../services/database/EntryRepository';
import { listProjects } from '../services/database/ProjectRepository';
import { loadCategorySettings } from '../services/settings/CategorySettingsService';
import { EntryCard } from '../components/EntryCard';
import { MotionTouchable } from '../components/MotionTouchable';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryEntries'>;

type CategoryContentItem =
  | { kind: 'project'; project: ProjectItem }
  | { kind: 'entry'; entry: Entry };

export function CategoryEntriesScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
  const { type } = route.params;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [category, setCategory] = useState<CategorySetting | null>(null);

  const refresh = useCallback(async () => {
    const [nextEntries, categories, nextProjects] = await Promise.all([
      listEntriesByType(type),
      loadCategorySettings(),
      type === 'project' ? listProjects() : Promise.resolve([]),
    ]);
    setEntries(nextEntries);
    setProjects(nextProjects);
    setCategory(categories.find(item => item.type === type) ?? null);
  }, [type]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: category?.label ?? '分类内容' });
  }, [category?.label, navigation]);

  const content = useMemo<CategoryContentItem[]>(() => {
    if (type !== 'project') {
      return entries.map(entry => ({ kind: 'entry', entry }));
    }

    return [
      ...projects.map(project => ({ kind: 'project' as const, project })),
      ...entries.map(entry => ({ kind: 'entry' as const, entry })),
    ];
  }, [entries, projects, type]);

  async function handleToggleDone(entry: Entry) {
    await toggleTodoDone(entry.id);
    await refresh();
    showNotification({
      title: entry.status === 'done' ? '已恢复待办' : '已完成待办',
      message: entry.title,
      kind: 'success',
    });
  }

  const summary =
    type === 'project'
      ? `${projects.length} 个项目 · ${entries.length} 条语音整理记录`
      : `共 ${entries.length} 个条目`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={content}
        keyExtractor={item => (item.kind === 'project' ? `project-${item.project.id}` : `entry-${item.entry.id}`)}
        renderItem={({ item }) => {
          if (item.kind === 'project') {
            const total = item.project.requirements.length;
            const completed = item.project.requirements.filter(requirement => requirement.done).length;
            return (
              <MotionTouchable
                onPress={() => navigation.navigate('ProjectDetail', { projectId: item.project.id })}
                borderRadius={22}
                style={{ marginHorizontal: 16, marginVertical: 7 }}
                contentStyle={{
                  borderRadius: 22,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                  backgroundColor: theme.colors.surface,
                }}
                accessibilityLabel={`打开项目${item.project.name}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors.primaryContainer,
                    }}
                  >
                    <Icon source="folder-outline" size={25} color={theme.colors.onPrimaryContainer} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                    <Text variant="titleMedium" numberOfLines={1} style={{ fontWeight: '900' }}>
                      {item.project.name}
                    </Text>
                    <Text
                      variant="bodySmall"
                      numberOfLines={2}
                      style={{ marginTop: 3, color: theme.colors.onSurfaceVariant }}
                    >
                      {item.project.description || '暂无项目说明'}
                    </Text>
                    <Text variant="labelMedium" style={{ marginTop: 7, color: theme.colors.primary }}>
                      需求进度 {completed}/{total}
                    </Text>
                  </View>
                  <Icon source="chevron-right" size={23} color={theme.colors.onSurfaceVariant} />
                </View>
              </MotionTouchable>
            );
          }

          return (
            <EntryCard
              entry={item.entry}
              typeLabel={category?.label}
              onPress={() => navigation.navigate('EntryDetail', { entryId: item.entry.id })}
              onToggleDone={item.entry.type === 'todo' ? () => handleToggleDone(item.entry) : undefined}
            />
          );
        }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 }}>
            <Text variant="headlineSmall" style={{ fontWeight: '900' }}>
              {category?.label ?? '分类内容'}
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
              {category?.description ?? summary}
            </Text>
            <Text variant="labelMedium" style={{ marginTop: 6, color: theme.colors.primary }}>
              {summary}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <MotionTouchable
            onPress={() => navigation.navigate(type === 'project' ? 'ProjectSettings' : 'VoiceInput')}
            borderRadius={22}
            style={{ marginHorizontal: 16, marginTop: 12 }}
            contentStyle={{
              borderRadius: 22,
              padding: 24,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <View>
              <Text variant="titleMedium" style={{ fontWeight: '900' }}>
                {type === 'project' ? '还没有项目' : '这个分类还没有内容'}
              </Text>
              <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                {type === 'project' ? '点击这里创建第一个项目。' : '点击这里新建记录。'}
              </Text>
            </View>
          </MotionTouchable>
        }
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={16}
        windowSize={7}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

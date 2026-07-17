import React, { useCallback, useLayoutEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Button, Chip, Icon, Text, useTheme } from 'react-native-paper';
import type { RootStackParamList } from '../navigation/types';
import type { Entry } from '../types/entry';
import { entryTypeIcon, entryTypeLabel } from '../types/entry';
import type { CategorySetting, ConfigurableCategoryType } from '../types/category';
import { formatDateTime } from '../utils/date';
import { getEntryById, toggleTodoDone } from '../services/database/EntryRepository';
import { loadCategorySettings } from '../services/settings/CategorySettingsService';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'EntryDetail'>;

function isConfigurableCategory(type: string): type is ConfigurableCategoryType {
  return type === 'idea' || type === 'todo' || type === 'project' || type === 'reminder';
}

export function EntryDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [categories, setCategories] = useState<CategorySetting[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextEntry, nextCategories] = await Promise.all([
      getEntryById(route.params.entryId),
      loadCategorySettings(),
    ]);
    setEntry(nextEntry);
    setCategories(nextCategories);
    setLoading(false);
  }, [route.params.entryId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: entry?.title ?? '笔记详情' });
  }, [entry?.title, navigation]);

  async function handleToggleTodo() {
    if (!entry) return;
    await toggleTodoDone(entry.id);
    await refresh();
    showNotification({
      title: entry.status === 'done' ? '已恢复待办' : '已完成待办',
      message: entry.title,
      kind: 'success',
    });
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <View
          style={{
            padding: 24,
            borderRadius: 22,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
          }}
        >
          <Text variant="titleLarge" style={{ fontWeight: '900' }}>
            记录不存在
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
            这条记录可能已经被删除或清空。
          </Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 18, borderRadius: 14 }}>
            返回
          </Button>
        </View>
      </View>
    );
  }

  const categoryLabel = isConfigurableCategory(entry.type)
    ? categories.find(item => item.type === entry.type)?.label ?? entryTypeLabel[entry.type]
    : entryTypeLabel[entry.type];
  const reminderTime = entry.type === 'reminder' ? entry.datetime ?? entry.dueDate : null;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          borderRadius: 24,
          padding: 20,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primaryContainer,
            }}
          >
            <Icon source={entryTypeIcon[entry.type]} size={28} color={theme.colors.onPrimaryContainer} />
          </View>
          <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
            <Text variant="headlineSmall" style={{ fontWeight: '900' }}>
              {entry.title}
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 3, color: theme.colors.onSurfaceVariant }}>
              {categoryLabel} · {formatDateTime(entry.createdAt)}
            </Text>
          </View>
        </View>

        <Text
          variant="bodyLarge"
          style={{
            marginTop: 22,
            lineHeight: 28,
            color: entry.status === 'done' ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
            opacity: entry.status === 'done' ? 0.55 : 1,
            textDecorationLine: entry.status === 'done' ? 'line-through' : 'none',
          }}
        >
          {entry.content}
        </Text>

        {entry.project || entry.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
            {entry.project ? (
              <Chip icon="folder-outline" onPress={() => navigation.navigate('ProjectSettings')}>
                {entry.project}
              </Chip>
            ) : null}
            {entry.tags.map(tag => (
              <Chip
                key={tag}
                onPress={() => showNotification({ title: `标签：${tag}`, message: '标签筛选将在后续版本加入。' })}
              >
                {tag}
              </Chip>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: 24, paddingTop: 18, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant }}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            更新时间
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 4 }}>
            {formatDateTime(entry.updatedAt)}
          </Text>
          {reminderTime ? (
            <>
              <Text variant="labelLarge" style={{ marginTop: 14, color: theme.colors.onSurfaceVariant }}>
                提醒时间
              </Text>
              <Text variant="bodyMedium" style={{ marginTop: 4 }}>
                {formatDateTime(reminderTime)}
              </Text>
            </>
          ) : null}
        </View>

        {entry.type === 'todo' ? (
          <Button
            mode={entry.status === 'done' ? 'outlined' : 'contained'}
            icon={entry.status === 'done' ? 'restore' : 'check'}
            onPress={handleToggleTodo}
            style={{ marginTop: 22, borderRadius: 14 }}
            contentStyle={{ height: 50 }}
          >
            {entry.status === 'done' ? '恢复为未完成' : '标记为已完成'}
          </Button>
        ) : null}
      </View>
    </ScrollView>
  );
}

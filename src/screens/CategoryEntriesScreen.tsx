import React, { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text, useTheme } from 'react-native-paper';
import type { RootStackParamList } from '../navigation/types';
import type { Entry } from '../types/entry';
import type { CategorySetting } from '../types/category';
import { listEntriesByType, toggleTodoDone } from '../services/database/EntryRepository';
import { loadCategorySettings } from '../services/settings/CategorySettingsService';
import { EntryCard } from '../components/EntryCard';
import { MotionTouchable } from '../components/MotionTouchable';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryEntries'>;

export function CategoryEntriesScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
  const { type } = route.params;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [category, setCategory] = useState<CategorySetting | null>(null);

  const refresh = useCallback(async () => {
    const [nextEntries, categories] = await Promise.all([
      listEntriesByType(type),
      loadCategorySettings(),
    ]);
    setEntries(nextEntries);
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

  async function handleToggleDone(entry: Entry) {
    await toggleTodoDone(entry.id);
    await refresh();
    showNotification({
      title: entry.status === 'done' ? '已恢复待办' : '已完成待办',
      message: entry.title,
      kind: 'success',
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            typeLabel={category?.label}
            onPress={() => navigation.navigate('EntryDetail', { entryId: item.id })}
            onToggleDone={item.type === 'todo' ? () => handleToggleDone(item) : undefined}
          />
        )}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 }}>
            <Text variant="headlineSmall" style={{ fontWeight: '900' }}>
              {category?.label ?? '分类内容'}
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
              {category?.description ?? `共 ${entries.length} 个条目`}
            </Text>
            <Text variant="labelMedium" style={{ marginTop: 6, color: theme.colors.primary }}>
              共 {entries.length} 个条目
            </Text>
          </View>
        }
        ListEmptyComponent={
          <MotionTouchable
            onPress={() => navigation.navigate('VoiceInput')}
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
                这个分类还没有内容
              </Text>
              <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                点击这里新建记录。
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

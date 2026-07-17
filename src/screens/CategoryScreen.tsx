import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Icon, Text, useTheme } from 'react-native-paper';
import type { Entry } from '../types/entry';
import type { CategorySetting, ConfigurableCategoryType } from '../types/category';
import { listEntries } from '../services/database/EntryRepository';
import { listProjects } from '../services/database/ProjectRepository';
import { loadCategorySettings } from '../services/settings/CategorySettingsService';
import { MotionTouchable } from '../components/MotionTouchable';

export function CategoryScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<CategorySetting[]>([]);
  const [managedProjectCount, setManagedProjectCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      Promise.all([listEntries(), loadCategorySettings(), listProjects()]).then(
        ([nextEntries, nextCategories, nextProjects]) => {
          setEntries(nextEntries);
          setCategories(nextCategories);
          setManagedProjectCount(nextProjects.length);
        },
      );
    }, []),
  );

  const counts = useMemo(() => {
    const result = new Map<ConfigurableCategoryType, number>();
    categories.forEach(category => result.set(category.type, 0));
    entries.forEach(entry => {
      if (result.has(entry.type as ConfigurableCategoryType)) {
        const type = entry.type as ConfigurableCategoryType;
        result.set(type, (result.get(type) ?? 0) + 1);
      }
    });

    // “项目设置”中的项目保存在独立 projects 集合中，项目进度分类需要同时统计它们。
    result.set('project', (result.get('project') ?? 0) + managedProjectCount);
    return result;
  }, [categories, entries, managedProjectCount]);

  return (
    <FlatList
      data={categories}
      keyExtractor={category => category.type}
      numColumns={2}
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingHorizontal: 9, paddingTop: 20, paddingBottom: 36 }}
      columnWrapperStyle={{ alignItems: 'stretch' }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 7, paddingBottom: 13 }}>
          <Text variant="headlineMedium" style={{ fontWeight: '900' }}>
            分类
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
            默认包含想法、待办、项目进度和提醒，可在设置中修改名称与说明。
          </Text>
        </View>
      }
      renderItem={({ item: category }) => {
        const count = counts.get(category.type) ?? 0;
        return (
          <View style={{ width: '50%', paddingHorizontal: 7, paddingVertical: 7 }}>
            <MotionTouchable
              onPress={() => navigation.navigate('CategoryEntries', { type: category.type })}
              borderRadius={22}
              accessibilityLabel={`打开${category.label}分类，共${count}个内容`}
              contentStyle={{
                minHeight: 154,
                borderRadius: 22,
                padding: 16,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                justifyContent: 'space-between',
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: count > 0 ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                }}
              >
                <Icon
                  source={category.icon}
                  size={25}
                  color={count > 0 ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
                />
              </View>
              <View style={{ marginTop: 18 }}>
                <Text variant="titleMedium" style={{ fontWeight: '900' }} numberOfLines={1}>
                  {category.label}
                </Text>
                <Text
                  variant="bodySmall"
                  numberOfLines={2}
                  style={{ marginTop: 4, color: theme.colors.onSurfaceVariant, lineHeight: 18 }}
                >
                  {category.description}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                    {count} 个内容
                  </Text>
                  <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                </View>
              </View>
            </MotionTouchable>
          </View>
        );
      }}
    />
  );
}

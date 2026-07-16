import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Icon, Text, useTheme } from 'react-native-paper';
import type { Entry, EntryType } from '../types/entry';
import { entryTypeIcon, entryTypeLabel } from '../types/entry';
import { listEntries } from '../services/database/EntryRepository';
import { MotionTouchable } from '../components/MotionTouchable';

const types: EntryType[] = ['idea', 'todo', 'reminder', 'note', 'journal', 'question', 'project', 'unknown'];

export function CategoryScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [entries, setEntries] = useState<Entry[]>([]);

  useFocusEffect(
    useCallback(() => {
      listEntries().then(setEntries);
    }, []),
  );

  const counts = useMemo(() => {
    const result = new Map<EntryType, number>();
    types.forEach(type => result.set(type, 0));
    entries.forEach(entry => result.set(entry.type, (result.get(entry.type) ?? 0) + 1));
    return result;
  }, [entries]);

  return (
    <FlatList
      data={types}
      keyExtractor={type => type}
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
            按内容类型查看当前 {entries.length} 个条目的分布。
          </Text>
        </View>
      }
      renderItem={({ item: type }) => {
        const count = counts.get(type) ?? 0;
        return (
          <View style={{ width: '50%', paddingHorizontal: 7, paddingVertical: 7 }}>
            <MotionTouchable
              onPress={() => navigation.navigate('CategoryEntries', { type })}
              borderRadius={22}
              accessibilityLabel={`打开${entryTypeLabel[type]}分类，共${count}个条目`}
              contentStyle={{
                minHeight: 138,
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
                  source={entryTypeIcon[type]}
                  size={25}
                  color={count > 0 ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
                />
              </View>
              <View style={{ marginTop: 18 }}>
                <Text variant="titleMedium" style={{ fontWeight: '900' }}>
                  {entryTypeLabel[type]}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                    {count} 个条目
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

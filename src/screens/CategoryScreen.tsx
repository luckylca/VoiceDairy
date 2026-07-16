import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Icon, Surface, Text, useTheme } from 'react-native-paper';
import type { Entry, EntryType } from '../types/entry';
import { entryTypeIcon, entryTypeLabel } from '../types/entry';
import { listEntries } from '../services/database/EntryRepository';
import { SwipeableTabScreen } from '../components/SwipeableTabScreen';

const types: EntryType[] = ['idea', 'todo', 'reminder', 'note', 'journal', 'question', 'project', 'unknown'];

export function CategoryScreen() {
  const theme = useTheme();
  const [entries, setEntries] = useState<Entry[]>([]);

  useFocusEffect(
    useCallback(() => {
      listEntries().then(setEntries);
    }, []),
  );

  return (
    <SwipeableTabScreen routeName="Category">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 }}
        style={{ backgroundColor: theme.colors.background }}
      >
        <Text variant="headlineMedium" style={{ fontWeight: '900' }}>
          分类
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
          按内容类型查看当前 {entries.length} 个条目的分布。
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 }}>
          {types.map(type => {
            const count = entries.filter(item => item.type === type).length;
            return (
              <Surface
                key={type}
                elevation={1}
                style={{
                  width: '48%',
                  minHeight: 132,
                  marginBottom: 14,
                  padding: 16,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surface,
                  justifyContent: 'space-between',
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.primaryContainer,
                  }}
                >
                  <Icon source={entryTypeIcon[type]} size={24} color={theme.colors.onPrimaryContainer} />
                </View>
                <View style={{ marginTop: 18 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                    {entryTypeLabel[type]}
                  </Text>
                  <Text variant="bodyMedium" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                    {count} 个条目
                  </Text>
                </View>
              </Surface>
            );
          })}
        </View>
      </ScrollView>
    </SwipeableTabScreen>
  );
}

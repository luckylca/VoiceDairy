import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Icon, Surface, Text, useTheme } from 'react-native-paper';
import type { Entry, EntryType } from '../types/entry';
import { entryTypeIcon, entryTypeLabel } from '../types/entry';
import { listEntries } from '../services/database/EntryRepository';
import { MotionReveal } from '../components/MotionReveal';
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

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 }}
      style={{ backgroundColor: theme.colors.background }}
      showsVerticalScrollIndicator={false}
    >
      <Text variant="headlineMedium" style={{ fontWeight: '900' }}>
        分类
      </Text>
      <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
        按内容类型查看当前 {entries.length} 个条目的分布。
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 }}>
        {types.map((type, index) => {
          const count = entries.filter(item => item.type === type).length;
          return (
            <MotionReveal key={type} delay={index * 34} style={{ width: '48%', marginBottom: 14 }}>
              <MotionTouchable
                onPress={() => navigation.navigate('CategoryEntries', { type })}
                borderRadius={22}
                accessibilityLabel={`打开${entryTypeLabel[type]}分类，共${count}个条目`}
              >
                <Surface
                  elevation={1}
                  style={{
                    minHeight: 138,
                    padding: 16,
                    borderRadius: 22,
                    backgroundColor: theme.colors.surface,
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
                </Surface>
              </MotionTouchable>
            </MotionReveal>
          );
        })}
      </View>
    </ScrollView>
  );
}

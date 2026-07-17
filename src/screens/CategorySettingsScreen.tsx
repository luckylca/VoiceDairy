import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Icon, Text, TextInput, useTheme } from 'react-native-paper';
import type { CategorySetting } from '../types/category';
import {
  loadCategorySettings,
  resetCategorySettings,
  saveCategorySettings,
} from '../services/settings/CategorySettingsService';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

export function CategorySettingsScreen() {
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
  const [categories, setCategories] = useState<CategorySetting[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategorySettings().then(setCategories);
  }, []);

  function patchCategory(type: CategorySetting['type'], patch: Partial<CategorySetting>) {
    setCategories(previous =>
      previous.map(category => (category.type === type ? { ...category, ...patch } : category)),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await saveCategorySettings(categories);
      setCategories(saved);
      showNotification({
        title: '分类设置已保存',
        message: '分类页和时间线会立即使用新的名称。',
        kind: 'success',
        icon: 'content-save-outline',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const defaults = await resetCategorySettings();
    setCategories(defaults);
    showNotification({
      title: '已恢复默认分类',
      message: '想法、待办、项目进度和提醒已恢复默认名称与说明。',
      kind: 'success',
      icon: 'restore',
    });
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <Text variant="titleLarge" style={{ fontWeight: '900' }}>
        分类设置
      </Text>
      <Text variant="bodyMedium" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
        修改四个核心分类的显示名称和说明。待办不保存计划时间，提醒用于包含明确时间的事项。
      </Text>

      {categories.map(category => (
        <View
          key={category.type}
          style={{
            marginTop: 14,
            padding: 16,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.primaryContainer,
              }}
            >
              <Icon source={category.icon} size={24} color={theme.colors.onPrimaryContainer} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                {category.label}
              </Text>
              <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                {category.requiresTime ? '有时间分类' : '无时间分类'} · 类型 {category.type}
              </Text>
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="分类名称"
            value={category.label}
            onChangeText={label => patchCategory(category.type, { label })}
            style={{ marginTop: 14 }}
          />
          <TextInput
            mode="outlined"
            label="分类说明"
            value={category.description}
            onChangeText={description => patchCategory(category.type, { description })}
            multiline
            numberOfLines={3}
            style={{ marginTop: 12 }}
          />
        </View>
      ))}

      <Button
        mode="contained"
        icon="content-save-outline"
        loading={saving}
        disabled={saving || categories.length === 0}
        onPress={handleSave}
        style={{ marginTop: 18, borderRadius: 14 }}
        contentStyle={{ minHeight: 50 }}
      >
        保存分类设置
      </Button>
      <Button
        mode="outlined"
        icon="restore"
        onPress={handleReset}
        style={{ marginTop: 12, borderRadius: 14 }}
        contentStyle={{ minHeight: 50 }}
      >
        恢复默认分类
      </Button>
    </ScrollView>
  );
}

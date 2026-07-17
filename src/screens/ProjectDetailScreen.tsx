import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Checkbox, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import type { RootStackParamList } from '../navigation/types';
import type { ProjectItem, ProjectRequirement } from '../types/project';
import {
  addProjectRequirement,
  deleteProjectRequirement,
  getProjectById,
  toggleProjectRequirement,
} from '../services/database/ProjectRepository';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectDetail'>;

export function ProjectDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [requirementText, setRequirementText] = useState('');
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    setProject(await getProjectById(route.params.projectId));
  }, [route.params.projectId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: project?.name ?? '项目详情' });
  }, [navigation, project?.name]);

  const requirements = useMemo(() => {
    if (!project) return [];
    return [...project.requirements].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [project]);

  async function handleAddRequirement() {
    if (!project || !requirementText.trim()) return;
    setAdding(true);
    try {
      const updated = await addProjectRequirement(project.id, requirementText);
      setProject(updated);
      setRequirementText('');
      showNotification({
        title: '需求已添加',
        message: updated.name,
        kind: 'success',
        icon: 'playlist-plus',
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(requirement: ProjectRequirement) {
    if (!project) return;
    const updated = await toggleProjectRequirement(project.id, requirement.id);
    setProject(updated);
    showNotification({
      title: requirement.done ? '需求已恢复' : '需求已完成',
      message: requirement.title,
      kind: 'success',
      icon: requirement.done ? 'restore' : 'check-circle-outline',
    });
  }

  async function handleDelete(requirement: ProjectRequirement) {
    if (!project) return;
    const updated = await deleteProjectRequirement(project.id, requirement.id);
    setProject(updated);
    showNotification({
      title: '需求已删除',
      message: requirement.title,
      kind: 'success',
      icon: 'delete-outline',
    });
  }

  if (!project) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.colors.background }}>
        <Text variant="titleLarge" style={{ fontWeight: '900' }}>
          项目不存在
        </Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 18 }}>
          返回
        </Button>
      </View>
    );
  }

  const completed = project.requirements.filter(item => item.done).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={requirements}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View
              style={{
                padding: 18,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text variant="headlineSmall" style={{ fontWeight: '900' }}>
                {project.name}
              </Text>
              <Text variant="bodyMedium" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
                {project.description || '暂无项目说明'}
              </Text>
              <Text variant="labelLarge" style={{ marginTop: 12, color: theme.colors.primary }}>
                需求完成进度：{completed}/{project.requirements.length}
              </Text>
            </View>

            <View
              style={{
                marginTop: 14,
                padding: 16,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text variant="titleMedium" style={{ fontWeight: '900' }}>
                新建需求
              </Text>
              <TextInput
                mode="outlined"
                label="输入项目需求或待办"
                value={requirementText}
                onChangeText={setRequirementText}
                onSubmitEditing={handleAddRequirement}
                returnKeyType="done"
                style={{ marginTop: 12 }}
              />
              <Button
                mode="contained"
                icon="plus"
                loading={adding}
                disabled={adding || !requirementText.trim()}
                onPress={handleAddRequirement}
                style={{ marginTop: 12, borderRadius: 14 }}
                contentStyle={{ minHeight: 48 }}
              >
                添加需求
              </Button>
            </View>

            <Text variant="titleMedium" style={{ marginTop: 20, marginBottom: 4, fontWeight: '900' }}>
              项目需求
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View
            style={{
              marginTop: 8,
              padding: 22,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text variant="titleMedium" style={{ fontWeight: '800' }}>
              还没有需求
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
              在上方输入需求，之后可以点击前面的勾选框标记完成。
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              marginTop: 10,
              minHeight: 62,
              paddingLeft: 8,
              paddingRight: 4,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: item.done ? 0.55 : 1,
            }}
          >
            <Checkbox.Android
              status={item.done ? 'checked' : 'unchecked'}
              onPress={() => handleToggle(item)}
              color={theme.colors.primary}
              uncheckedColor={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodyLarge"
              style={{
                flex: 1,
                paddingVertical: 14,
                lineHeight: 23,
                color: item.done ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
                textDecorationLine: item.done ? 'line-through' : 'none',
              }}
              onPress={() => handleToggle(item)}
            >
              {item.title}
            </Text>
            <IconButton
              icon="delete-outline"
              iconColor={theme.colors.onSurfaceVariant}
              onPress={() => handleDelete(item)}
              accessibilityLabel={`删除需求${item.title}`}
            />
          </View>
        )}
      />
    </View>
  );
}

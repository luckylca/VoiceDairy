import React, { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Dialog, FAB, Icon, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import type { ProjectItem } from '../types/project';
import { createProject, deleteProject, listProjects } from '../services/database/ProjectRepository';
import { MotionTouchable } from '../components/MotionTouchable';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

export function ProjectSettingsScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [createVisible, setCreateVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setProjects(await listProjects());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const project = await createProject(name, description);
      setName('');
      setDescription('');
      setCreateVisible(false);
      await refresh();
      showNotification({
        title: '项目已创建',
        message: project.name,
        kind: 'success',
        icon: 'folder-plus-outline',
      });
      navigation.navigate('ProjectDetail', { projectId: project.id });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const title = deleteTarget.name;
    await deleteProject(deleteTarget.id);
    setDeleteTarget(null);
    await refresh();
    showNotification({
      title: '项目已删除',
      message: title,
      kind: 'success',
      icon: 'delete-outline',
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 108, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingBottom: 8 }}>
            <Text variant="titleLarge" style={{ fontWeight: '900' }}>
              项目设置
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
              创建项目，并在项目中维护可勾选的需求待办。
            </Text>
          </View>
        }
        ListEmptyComponent={
          <MotionTouchable
            onPress={() => setCreateVisible(true)}
            borderRadius={22}
            style={{ marginTop: 12 }}
            contentStyle={{
              borderRadius: 22,
              padding: 24,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text variant="titleMedium" style={{ fontWeight: '900' }}>
              还没有项目
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
              点击这里创建第一个项目。
            </Text>
          </MotionTouchable>
        }
        renderItem={({ item }) => {
          const total = item.requirements.length;
          const completed = item.requirements.filter(requirement => requirement.done).length;
          return (
            <MotionTouchable
              onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}
              onLongPress={() => setDeleteTarget(item)}
              borderRadius={22}
              style={{ marginTop: 12 }}
              contentStyle={{
                borderRadius: 22,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surface,
              }}
              accessibilityLabel={`打开项目${item.name}，长按删除`}
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
                    {item.name}
                  </Text>
                  <Text variant="bodySmall" numberOfLines={2} style={{ marginTop: 3, color: theme.colors.onSurfaceVariant }}>
                    {item.description || '暂无项目说明'}
                  </Text>
                  <Text variant="labelMedium" style={{ marginTop: 7, color: theme.colors.primary }}>
                    已完成 {completed}/{total}
                  </Text>
                </View>
                <Icon source="chevron-right" size={23} color={theme.colors.onSurfaceVariant} />
              </View>
            </MotionTouchable>
          );
        }}
      />

      <FAB
        icon="plus"
        label="新建项目"
        onPress={() => setCreateVisible(true)}
        style={{ position: 'absolute', right: 20, bottom: 20 }}
      />

      <Portal>
        <Dialog visible={createVisible} onDismiss={() => !saving && setCreateVisible(false)}>
          <Dialog.Title>新建项目</Dialog.Title>
          <Dialog.Content>
            <TextInput mode="outlined" label="项目名称" value={name} onChangeText={setName} autoFocus />
            <TextInput
              mode="outlined"
              label="项目说明（可选）"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={{ marginTop: 12 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={saving} onPress={() => setCreateVisible(false)}>
              取消
            </Button>
            <Button loading={saving} disabled={!name.trim()} onPress={handleCreate}>
              创建
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={Boolean(deleteTarget)} onDismiss={() => setDeleteTarget(null)}>
          <Dialog.Icon icon="delete-outline" />
          <Dialog.Title>删除项目？</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {deleteTarget ? `“${deleteTarget.name}”及其中的全部需求将被删除。` : ''}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteTarget(null)}>取消</Button>
            <Button textColor={theme.colors.error} onPress={handleDelete}>
              删除
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

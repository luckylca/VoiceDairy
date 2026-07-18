import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Button,
  Dialog,
  Icon,
  Portal,
  RadioButton,
  Searchbar,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type { AppSettings, OrganizerProvider, ThemeMode } from '../types/settings';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings/SettingsService';
import { fetchAvailableModels } from '../services/llm/LlmService';
import { getLocalModelStatus, type LocalModelStatus } from '../services/llm/LocalModelService';
import { THEME_PRESETS, useAppTheme } from '../theme/AppThemeProvider';
import { MotionTouchable } from '../components/MotionTouchable';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const megabytes = bytes / 1024 / 1024;
  return megabytes < 1024
    ? `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`
    : `${(megabytes / 1024).toFixed(2)} GB`;
}

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { setThemeMode, setColorSeed } = useAppTheme();
  const { showNotification } = useFluidNotification();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [localModelStatus, setLocalModelStatus] = useState<LocalModelStatus | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelQuery, setModelQuery] = useState('');
  const [modelDialogVisible, setModelDialogVisible] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([loadSettings(), getLocalModelStatus()]).then(([current, modelStatus]) => {
        if (!active) return;
        setSettings(current);
        setLocalModelStatus(modelStatus);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const filteredModels = useMemo(() => {
    const keyword = modelQuery.trim().toLowerCase();
    if (!keyword) return availableModels;
    return availableModels.filter(model => model.toLowerCase().includes(keyword));
  }, [availableModels, modelQuery]);

  function patchSettings(patch: Partial<AppSettings>) {
    setSettings(previous => ({ ...previous, ...patch }));
  }

  async function handleThemeModeChange(value: string) {
    const themeMode = value as ThemeMode;
    patchSettings({ themeMode });
    await setThemeMode(themeMode);
    const labels: Record<ThemeMode, string> = {
      system: '跟随系统',
      light: '浅色模式',
      dark: '深色模式',
    };
    showNotification({
      title: `已切换为${labels[themeMode]}`,
      message: '界面颜色已经立即更新。',
      kind: 'success',
      icon: themeMode === 'dark' ? 'weather-night' : themeMode === 'light' ? 'white-balance-sunny' : 'theme-light-dark',
    });
  }

  async function handleColorChange(colorSeed: string) {
    patchSettings({ colorSeed });
    await setColorSeed(colorSeed);
    const preset = THEME_PRESETS.find(item => item.seed.toLowerCase() === colorSeed.toLowerCase());
    showNotification({
      title: `已应用${preset?.label ?? '新'}主题`,
      message: '主题色已保存。',
      kind: 'success',
      icon: 'palette-outline',
    });
  }

  async function handleOrganizerProviderChange(value: string) {
    const organizerProvider = value as OrganizerProvider;
    const next = { ...settings, organizerProvider };
    setSettings(next);
    await saveSettings(next);
    showNotification({
      title: organizerProvider === 'local' ? '已启用本地 Qwen 整理' : '已切换到云端 API',
      message:
        organizerProvider === 'local'
          ? localModelStatus?.exists
            ? '识别后的文本会在手机上整理。'
            : '请在下方进入本地模型管理并下载模型。'
          : '识别后的文本会发送到配置的兼容 API。',
      kind: organizerProvider === 'local' && !localModelStatus?.exists ? 'warning' : 'success',
      icon: organizerProvider === 'local' ? 'cellphone' : 'cloud-outline',
    });
  }

  async function handleSaveCloud() {
    setSavingCloud(true);
    try {
      await saveSettings(settings);
      showNotification({
        title: '云端 API 配置已保存',
        message: `${settings.modelName || '未选择模型'} · ${settings.apiBaseUrl || '未填写地址'}`,
        kind: 'success',
        icon: 'cloud-check-outline',
      });
    } finally {
      setSavingCloud(false);
    }
  }

  async function handleFetchModels() {
    setLoadingModels(true);
    try {
      const models = await fetchAvailableModels(settings);
      setAvailableModels(models);
      setModelQuery('');
      setModelDialogVisible(true);
      showNotification({
        title: '模型列表获取成功',
        message: `接口返回了 ${models.length} 个模型。`,
        kind: 'success',
        icon: 'database-check-outline',
      });
    } catch (error) {
      showNotification({
        title: '获取模型列表失败',
        message: error instanceof Error ? error.message : '请检查 API 地址和密钥。',
        kind: 'error',
      });
    } finally {
      setLoadingModels(false);
    }
  }

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="headlineMedium" style={{ fontWeight: '900' }}>
          设置
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
          管理外观、项目、智能整理与应用信息。
        </Text>

        <View style={cardStyle}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            外观主题
          </Text>
          <SegmentedButtons
            value={settings.themeMode}
            onValueChange={handleThemeModeChange}
            buttons={[
              { value: 'system', label: '跟随系统', icon: 'theme-light-dark' },
              { value: 'light', label: '浅色', icon: 'white-balance-sunny' },
              { value: 'dark', label: '深色', icon: 'weather-night' },
            ]}
            style={{ marginTop: 14 }}
          />
          <Text variant="labelLarge" style={{ marginTop: 20, marginBottom: 10 }}>
            主题颜色
          </Text>
          <View style={styles.paletteRow}>
            {THEME_PRESETS.map(preset => {
              const selected = settings.colorSeed.toLowerCase() === preset.seed.toLowerCase();
              return (
                <MotionTouchable
                  key={preset.seed}
                  onPress={() => handleColorChange(preset.seed)}
                  borderRadius={16}
                  style={styles.paletteItem}
                  contentStyle={{
                    borderRadius: 16,
                    paddingVertical: 8,
                    backgroundColor: selected ? theme.colors.secondaryContainer : theme.colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                  }}
                  accessibilityLabel={`切换到${preset.label}主题`}
                >
                  <View style={{ alignItems: 'center' }}>
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: preset.seed },
                        selected && { borderColor: theme.colors.onSurface, borderWidth: 3 },
                      ]}
                    >
                      {selected ? <Icon source="check" size={18} color="#FFFFFF" /> : null}
                    </View>
                    <Text variant="labelSmall" style={{ marginTop: 6 }}>
                      {preset.label}
                    </Text>
                  </View>
                </MotionTouchable>
              );
            })}
          </View>
        </View>

        <View style={cardStyle}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            内容管理
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 5, color: theme.colors.onSurfaceVariant }}>
            管理分类、项目和可以被本地助手自动勾选的项目需求。
          </Text>
          <SettingsLink
            icon="shape-outline"
            title="分类设置"
            description="修改想法、待办、项目进度和提醒的名称与说明"
            onPress={() => navigation.navigate('CategorySettings')}
          />
          <SettingsLink
            icon="folder-outline"
            title="项目设置"
            description="创建项目，维护需求清单和完成状态"
            onPress={() => navigation.navigate('ProjectSettings')}
          />
        </View>

        <View style={cardStyle}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            智能整理
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 5, color: theme.colors.onSurfaceVariant }}>
            SenseVoice 始终在本地转写；这里只决定由云端 API 还是本地 Qwen 整理文本。
          </Text>
          <SegmentedButtons
            value={settings.organizerProvider}
            onValueChange={handleOrganizerProviderChange}
            buttons={[
              { value: 'cloud', label: '云端 API', icon: 'cloud-outline' },
              { value: 'local', label: '本地 Qwen', icon: 'cellphone' },
            ]}
            style={{ marginTop: 14 }}
          />

          {settings.organizerProvider === 'cloud' ? (
            <View style={{ marginTop: 4 }}>
              <TextInput
                mode="outlined"
                label="API Base URL"
                value={settings.apiBaseUrl}
                onChangeText={apiBaseUrl => patchSettings({ apiBaseUrl })}
                autoCapitalize="none"
                style={{ marginTop: 12 }}
              />
              <TextInput
                mode="outlined"
                label="API Key"
                value={settings.apiKey}
                onChangeText={apiKey => patchSettings({ apiKey })}
                secureTextEntry
                autoCapitalize="none"
                style={{ marginTop: 12 }}
              />
              <TextInput
                mode="outlined"
                label="模型名"
                value={settings.modelName}
                onChangeText={modelName => patchSettings({ modelName })}
                autoCapitalize="none"
                style={{ marginTop: 12 }}
              />
              <View style={styles.inlineButtons}>
                <Button
                  mode="outlined"
                  icon="database-search-outline"
                  loading={loadingModels}
                  disabled={loadingModels || !settings.apiBaseUrl.trim()}
                  onPress={handleFetchModels}
                  style={styles.inlineButton}
                  contentStyle={styles.actionButtonContent}
                >
                  获取模型
                </Button>
                <Button
                  mode="contained"
                  icon="content-save-outline"
                  loading={savingCloud}
                  onPress={handleSaveCloud}
                  style={styles.inlineButton}
                  contentStyle={styles.actionButtonContent}
                >
                  保存配置
                </Button>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 14 }}>
              <MotionTouchable
                onPress={() => navigation.navigate('LocalModelSettings')}
                borderRadius={18}
                contentStyle={[
                  styles.localModelCard,
                  {
                    backgroundColor: theme.colors.primaryContainer,
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <View style={styles.settingRow}>
                  <View style={[styles.rowIcon, { backgroundColor: theme.colors.tertiaryContainer }]}> 
                    <Icon source="brain" size={24} color={theme.colors.onTertiaryContainer} />
                  </View>
                  <View style={styles.rowText}>
                    <Text variant="titleMedium" style={{ fontWeight: '900' }}>
                      本地模型管理
                    </Text>
                    <Text variant="bodySmall" style={{ marginTop: 3, color: theme.colors.onSurfaceVariant }}>
                      {localModelStatus?.exists
                        ? `${localModelStatus.loaded ? '已加载' : '已下载'} · ${formatBytes(localModelStatus.bytes)}`
                        : 'Qwen3.5-0.8B Q4_0 · 约563MB · 尚未下载'}
                    </Text>
                    <Text variant="labelSmall" style={{ marginTop: 4, color: theme.colors.primary }}>
                      下载、加载、运行设置与本地对话
                    </Text>
                  </View>
                  <Icon source="chevron-right" size={23} color={theme.colors.onSurfaceVariant} />
                </View>
              </MotionTouchable>
              <Text variant="bodySmall" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
                本地对话每次发送都会读取手机中当前保存的全部项目、项目说明、需求和完成状态。
              </Text>
            </View>
          )}

          <SettingsLink
            icon="application-edit-outline"
            title="整理提示词"
            description="云端和本地整理共用规则，并自动附加当前全部项目内容"
            onPress={() => navigation.navigate('PromptSettings')}
          />
        </View>

        <View style={cardStyle}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            系统
          </Text>
          <SettingsLink
            icon="tools"
            title="开发者选项"
            description="显示刷新率、WebDAV、JSON 快照和数据清理"
            onPress={() => navigation.navigate('DeveloperOptions')}
          />
          <SettingsLink
            icon="information-outline"
            title="关于 VoiceDairy"
            description="版本、隐私说明、技术栈和当前开发状态"
            onPress={() => navigation.navigate('About')}
          />
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={modelDialogVisible} onDismiss={() => setModelDialogVisible(false)}>
          <Dialog.Title>选择模型</Dialog.Title>
          <Dialog.Content>
            <Searchbar
              placeholder="搜索模型名"
              value={modelQuery}
              onChangeText={setModelQuery}
              elevation={0}
            />
          </Dialog.Content>
          <Dialog.ScrollArea style={{ maxHeight: 390 }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredModels.length > 0 ? (
                filteredModels.map(model => (
                  <RadioButton.Item
                    key={model}
                    label={model}
                    value={model}
                    status={settings.modelName === model ? 'checked' : 'unchecked'}
                    onPress={() => {
                      patchSettings({ modelName: model });
                      setModelDialogVisible(false);
                    }}
                  />
                ))
              ) : (
                <Text variant="bodyMedium" style={{ padding: 20, color: theme.colors.onSurfaceVariant }}>
                  没有匹配的模型。
                </Text>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setModelDialogVisible(false)}>关闭</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

type SettingsLinkProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
};

function SettingsLink({ icon, title, description, onPress }: SettingsLinkProps) {
  const theme = useTheme();
  return (
    <MotionTouchable
      onPress={onPress}
      borderRadius={16}
      style={{ marginTop: 12 }}
      contentStyle={[styles.managementItem, { backgroundColor: theme.colors.surfaceVariant }]}
    >
      <View style={styles.settingRow}>
        <View style={[styles.rowIcon, { backgroundColor: theme.colors.secondaryContainer }]}> 
          <Icon source={icon} size={23} color={theme.colors.onSecondaryContainer} />
        </View>
        <View style={styles.rowText}>
          <Text variant="titleMedium" style={{ fontWeight: '800' }}>
            {title}
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
            {description}
          </Text>
        </View>
        <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
      </View>
    </MotionTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  sectionTitle: {
    fontWeight: '800',
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paletteItem: {
    width: '19%',
    minWidth: 58,
  },
  colorSwatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementItem: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  localModelCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 13,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 8,
  },
  inlineButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  inlineButton: {
    flex: 1,
    borderRadius: 14,
  },
  actionButtonContent: {
    minHeight: 48,
  },
});

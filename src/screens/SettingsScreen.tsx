import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Button,
  Dialog,
  Divider,
  Icon,
  Portal,
  RadioButton,
  Searchbar,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type { AppSettings, ThemeMode } from '../types/settings';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings/SettingsService';
import { clearLocalDatabase } from '../services/database/Database';
import { buildJsonSnapshot } from '../services/sync/SyncService';
import { fetchAvailableModels } from '../services/llm/LlmService';
import {
  getDisplayRefreshRateInfo,
  requestHighDisplayRefreshRate,
  type DisplayRefreshRateInfo,
} from '../services/display/DisplayRefreshRate';
import { THEME_PRESETS, useAppTheme } from '../theme/AppThemeProvider';
import { MotionTouchable } from '../components/MotionTouchable';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

function formatHz(rate: number): string {
  return Math.abs(rate - Math.round(rate)) < 0.05 ? `${Math.round(rate)}Hz` : `${rate.toFixed(1)}Hz`;
}

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { setThemeMode, setColorSeed } = useAppTheme();
  const { showNotification } = useFluidNotification();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelQuery, setModelQuery] = useState('');
  const [modelDialogVisible, setModelDialogVisible] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [refreshInfo, setRefreshInfo] = useState<DisplayRefreshRateInfo | null>(null);
  const [requestingRefresh, setRequestingRefresh] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadSettings().then(current => {
        if (active) setSettings(current);
      });
      getDisplayRefreshRateInfo()
        .then(info => {
          if (active) setRefreshInfo(info);
        })
        .catch(() => undefined);

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
      message: '主题色已保存，重启应用后仍会保留。',
      kind: 'success',
      icon: 'palette-outline',
    });
  }

  async function handleRequestHighRefresh() {
    setRequestingRefresh(true);
    try {
      const info = await requestHighDisplayRefreshRate();
      setRefreshInfo(info);
      showNotification({
        title: info.systemAcceptedHighRefresh ? '高刷新率已启用' : '系统仍未切换到最高刷新率',
        message: `当前 ${formatHz(info.currentRate)}，设备最高 ${formatHz(info.maxSupportedRate)}。`,
        kind: info.systemAcceptedHighRefresh ? 'success' : 'warning',
        icon: info.systemAcceptedHighRefresh ? 'check-circle-outline' : 'alert-outline',
      });
    } catch (error) {
      showNotification({
        title: '高刷新率请求失败',
        message: error instanceof Error ? error.message : '无法读取当前显示模式。',
        kind: 'error',
      });
    } finally {
      setRequestingRefresh(false);
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

  async function handleSave() {
    await saveSettings(settings);
    showNotification({
      title: '设置已保存',
      message: 'API、WebDAV 与界面配置已写入本地。',
      kind: 'success',
      icon: 'content-save-outline',
    });
  }

  async function handleExport() {
    const snapshot = await buildJsonSnapshot();
    showNotification({
      title: 'JSON 快照已生成',
      message: `共 ${snapshot.length} 个字符。`,
      kind: 'success',
      icon: 'code-json',
    });
  }

  async function handleClear() {
    await clearLocalDatabase();
    showNotification({
      title: '本地数据已清空',
      message: '时间线、项目和分类统计将在返回后刷新。',
      kind: 'warning',
      icon: 'delete-outline',
    });
  }

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.outlineVariant,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 44 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <Text variant="headlineMedium" style={{ fontWeight: '900' }}>
          设置
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
          管理外观、分类、项目、智能整理和数据同步。
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

          <Divider style={{ marginTop: 20, marginBottom: 16 }} />
          <View style={styles.settingRow}>
            <View style={[styles.rowIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Icon source="speedometer" size={23} color={theme.colors.onSecondaryContainer} />
            </View>
            <View style={styles.rowText}>
              <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                显示刷新率
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  marginTop: 2,
                  color:
                    refreshInfo && !refreshInfo.systemAcceptedHighRefresh
                      ? theme.colors.error
                      : theme.colors.onSurfaceVariant,
                }}
              >
                {refreshInfo
                  ? `当前 ${formatHz(refreshInfo.currentRate)} · 最高 ${formatHz(refreshInfo.maxSupportedRate)}`
                  : '正在读取设备显示模式…'}
              </Text>
              {refreshInfo ? (
                <Text variant="labelSmall" style={{ marginTop: 3, color: theme.colors.onSurfaceVariant }}>
                  支持：{refreshInfo.supportedRates.map(formatHz).join(' / ')}
                </Text>
              ) : null}
            </View>
          </View>
          <Button
            mode="outlined"
            icon="refresh"
            loading={requestingRefresh}
            disabled={requestingRefresh}
            onPress={handleRequestHighRefresh}
            style={{ marginTop: 14, borderRadius: 14 }}
            contentStyle={styles.actionButtonContent}
          >
            重新请求最高刷新率
          </Button>
        </View>

        <View style={cardStyle}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            内容管理
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 5, color: theme.colors.onSurfaceVariant }}>
            管理分类显示方式，以及独立的项目和需求清单。
          </Text>

          <MotionTouchable
            onPress={() => navigation.navigate('CategorySettings')}
            borderRadius={16}
            style={{ marginTop: 14 }}
            contentStyle={[styles.managementItem, { backgroundColor: theme.colors.surfaceVariant }]}
          >
            <View style={styles.settingRow}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="shape-outline" size={23} color={theme.colors.onPrimaryContainer} />
              </View>
              <View style={styles.rowText}>
                <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                  分类设置
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                  修改想法、待办、项目进度和提醒的名称与说明
                </Text>
              </View>
              <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
            </View>
          </MotionTouchable>

          <MotionTouchable
            onPress={() => navigation.navigate('ProjectSettings')}
            borderRadius={16}
            style={{ marginTop: 10 }}
            contentStyle={[styles.managementItem, { backgroundColor: theme.colors.surfaceVariant }]}
          >
            <View style={styles.settingRow}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.tertiaryContainer }]}>
                <Icon source="folder-outline" size={23} color={theme.colors.onTertiaryContainer} />
              </View>
              <View style={styles.rowText}>
                <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                  项目设置
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                  新建项目，并维护可以勾选完成的项目需求
                </Text>
              </View>
              <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
            </View>
          </MotionTouchable>
        </View>

        <View style={cardStyle}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            智能整理
          </Text>
          <TextInput
            mode="outlined"
            label="API Base URL"
            value={settings.apiBaseUrl}
            onChangeText={apiBaseUrl => patchSettings({ apiBaseUrl })}
            autoCapitalize="none"
            style={{ marginTop: 14 }}
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
          <Button
            mode="outlined"
            icon="database-search-outline"
            loading={loadingModels}
            disabled={loadingModels || !settings.apiBaseUrl.trim()}
            onPress={handleFetchModels}
            style={{ marginTop: 12, borderRadius: 14 }}
            contentStyle={styles.actionButtonContent}
          >
            获取模型列表
          </Button>

          <Divider style={{ marginTop: 18, marginBottom: 8 }} />
          <MotionTouchable
            onPress={() => navigation.navigate('PromptSettings')}
            borderRadius={16}
            contentStyle={[styles.managementItem, { backgroundColor: theme.colors.surfaceVariant }]}
          >
            <View style={styles.settingRow}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Icon source="application-edit-outline" size={23} color={theme.colors.onPrimaryContainer} />
              </View>
              <View style={styles.rowText}>
                <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                  整理提示词
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                  在独立页面中编辑结构化整理规则
                </Text>
              </View>
              <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
            </View>
          </MotionTouchable>
        </View>

        <View style={cardStyle}>
          <MotionTouchable
            onPress={() =>
              showNotification({
                title: '本地语音识别已就绪',
                message: 'SenseVoice INT8 在手机端离线处理，不会上传录音。',
                kind: 'success',
                icon: 'check-circle-outline',
              })
            }
            borderRadius={16}
            contentStyle={[styles.managementItem, { backgroundColor: theme.colors.surfaceVariant }]}
          >
            <View style={styles.settingRow}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.tertiaryContainer }]}>
                <Icon source="microphone-outline" size={23} color={theme.colors.onTertiaryContainer} />
              </View>
              <View style={styles.rowText}>
                <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                  本地语音识别
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                  SenseVoice INT8 · 手机端离线处理
                </Text>
              </View>
              <Icon source="information-outline" size={21} color={theme.colors.onSurfaceVariant} />
            </View>
          </MotionTouchable>
        </View>

        <View style={cardStyle}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            WebDAV
          </Text>
          <TextInput
            mode="outlined"
            label="WebDAV URL"
            value={settings.webdavUrl ?? ''}
            onChangeText={webdavUrl => patchSettings({ webdavUrl })}
            autoCapitalize="none"
            style={{ marginTop: 14 }}
          />
          <TextInput
            mode="outlined"
            label="用户名"
            value={settings.webdavUsername ?? ''}
            onChangeText={webdavUsername => patchSettings({ webdavUsername })}
            autoCapitalize="none"
            style={{ marginTop: 12 }}
          />
          <TextInput
            mode="outlined"
            label="密码"
            value={settings.webdavPassword ?? ''}
            onChangeText={webdavPassword => patchSettings({ webdavPassword })}
            secureTextEntry
            style={{ marginTop: 12 }}
          />
        </View>

        <View style={cardStyle}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            数据
          </Text>
          <Button
            mode="contained"
            icon="content-save-outline"
            onPress={handleSave}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            保存设置
          </Button>
          <Button
            mode="outlined"
            icon="code-json"
            onPress={handleExport}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            生成 JSON 快照
          </Button>
          <Button
            mode="outlined"
            icon="delete-outline"
            textColor={theme.colors.error}
            onPress={handleClear}
            style={styles.actionButton}
            contentStyle={styles.actionButtonContent}
          >
            清空本地数据
          </Button>
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
  actionButton: {
    marginTop: 12,
    borderRadius: 14,
  },
  actionButtonContent: {
    minHeight: 48,
  },
});

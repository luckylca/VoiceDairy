import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Button,
  Dialog,
  Icon,
  Portal,
  RadioButton,
  Searchbar,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type {
  AppSettings,
  MotionLevel,
  OrganizerProvider,
  StartupPage,
  ThemeMode,
  VisualStyle,
} from '../types/settings';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings/SettingsService';
import { fetchAvailableModels } from '../services/llm/LlmService';
import { getLocalModelStatus, type LocalModelStatus } from '../services/llm/LocalModelService';
import { THEME_PRESETS, useAppTheme } from '../theme/AppThemeProvider';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { MotionTouchable } from '../components/MotionTouchable';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';
import { TechScreen } from '../components/tech/TechScreen';
import { TechPanel } from '../components/tech/TechPanel';
import { TechButton } from '../components/tech/TechButton';
import { techTokens } from '../theme/tech/tokens';

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
  const { isTech, setVisualStyle, setMotionLevel } = useVisualStyle();
  const { showNotification } = useFluidNotification();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [settingsReady, setSettingsReady] = useState(false);
  const [localModelStatus, setLocalModelStatus] = useState<LocalModelStatus | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelQuery, setModelQuery] = useState('');
  const [modelDialogVisible, setModelDialogVisible] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setSettingsReady(false);

      void (async () => {
        try {
          const current = await loadSettings();
          if (!active) return;
          setSettings(current);
          setSettingsReady(true);
          if (current.organizerProvider === 'local') {
            const status = await getLocalModelStatus();
            if (active) setLocalModelStatus(status);
          } else {
            setLocalModelStatus(null);
          }
        } catch {
          if (active) setSettingsReady(true);
        }
      })();

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

  const isLocalOrganizer = settingsReady && settings.organizerProvider === 'local';

  function patchSettings(patch: Partial<AppSettings>) {
    setSettings(previous => ({ ...previous, ...patch }));
  }

  async function persistPatch(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
  }

  async function handleVisualStyleChange(value: VisualStyle) {
    patchSettings({ visualStyle: value });
    await setVisualStyle(value);
    showNotification({
      title: value === 'tech' ? '已切换为科技界面' : '已切换为经典界面',
      message: '界面已立即更新，记录、对话和设置保持不变。',
      kind: 'success',
      icon: value === 'tech' ? 'vector-polyline' : 'view-dashboard-outline',
    });
  }

  async function handleMotionLevelChange(value: MotionLevel) {
    patchSettings({ motionLevel: value });
    await setMotionLevel(value);
  }

  async function handleThemeModeChange(value: string) {
    const themeMode = value as ThemeMode;
    patchSettings({ themeMode });
    await setThemeMode(themeMode);
  }

  async function handleColorChange(colorSeed: string) {
    patchSettings({ colorSeed });
    await setColorSeed(colorSeed);
  }

  async function handleOrganizerProviderChange(value: string) {
    const organizerProvider = value as OrganizerProvider;
    const next = { ...settings, organizerProvider };
    setSettings(next);
    setModelDialogVisible(false);
    await saveSettings(next);

    if (organizerProvider === 'local') {
      try {
        setLocalModelStatus(await getLocalModelStatus());
      } catch {
        setLocalModelStatus(null);
      }
    } else {
      setLocalModelStatus(null);
    }
  }

  async function handleSaveCloud() {
    setSavingCloud(true);
    try {
      await saveSettings({ ...settings, organizerProvider: 'cloud' });
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

  const content = (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <Text
        variant="headlineMedium"
        style={{ fontWeight: '900', color: isTech ? techTokens.colors.text : theme.colors.onSurface }}
      >
        设置
      </Text>
      <Text
        variant="bodyMedium"
        style={{ marginTop: 4, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}
      >
        管理界面、动态效果、启动方式、模型和内容。
      </Text>

      <SettingsSection title="界面风格" isTech={isTech}>
        <View style={styles.choiceRow}>
          <ChoiceTile
            label="经典界面"
            description="保留 Material Design 3"
            icon="view-dashboard-outline"
            selected={settings.visualStyle === 'classic'}
            isTech={isTech}
            onPress={() => void handleVisualStyleChange('classic')}
          />
          <ChoiceTile
            label="科技界面"
            description="深色沉浸式数据流视觉"
            icon="vector-polyline"
            selected={settings.visualStyle === 'tech'}
            isTech={isTech}
            onPress={() => void handleVisualStyleChange('tech')}
          />
        </View>

        <Text variant="labelLarge" style={[styles.subheading, { color: isTech ? techTokens.colors.text : theme.colors.onSurface }]}>动态效果</Text>
        <View style={styles.compactChoices}>
          {([
            ['full', '完整'],
            ['standard', '标准'],
            ['reduced', '减少'],
            ['off', '关闭'],
          ] as [MotionLevel, string][]).map(([value, label]) => (
            <CompactChoice
              key={value}
              label={label}
              selected={settings.motionLevel === value}
              isTech={isTech}
              onPress={() => void handleMotionLevelChange(value)}
            />
          ))}
        </View>

        <Text variant="labelLarge" style={[styles.subheading, { color: isTech ? techTokens.colors.text : theme.colors.onSurface }]}>启动时打开</Text>
        <View style={styles.compactChoices}>
          {([
            ['quick_record', '快速记录'],
            ['last_page', '上次页面'],
            ['agent', 'Agent'],
          ] as [StartupPage, string][]).map(([value, label]) => (
            <CompactChoice
              key={value}
              label={label}
              selected={settings.startupPage === value}
              isTech={isTech}
              onPress={() => void persistPatch({ startupPage: value })}
            />
          ))}
        </View>

        <SettingSwitchRow
          title="识别完成后自动整理"
          description="自动生成预览，但仍需确认后保存"
          value={settings.autoOrganizeAfterRecognition}
          isTech={isTech}
          onValueChange={value => void persistPatch({ autoOrganizeAfterRecognition: value })}
        />
        <SettingSwitchRow
          title="Agent 语音识别后自动发送"
          description="默认关闭，便于发送前检查文字"
          value={settings.agentAutoSendVoice}
          isTech={isTech}
          onValueChange={value => void persistPatch({ agentAutoSendVoice: value })}
        />
      </SettingsSection>

      {!isTech ? (
        <SettingsSection title="经典主题" isTech={false}>
          <SegmentedButtons
            value={settings.themeMode}
            onValueChange={handleThemeModeChange}
            buttons={[
              { value: 'system', label: '跟随系统', icon: 'theme-light-dark' },
              { value: 'light', label: '浅色', icon: 'white-balance-sunny' },
              { value: 'dark', label: '深色', icon: 'weather-night' },
            ]}
            style={{ marginTop: 12 }}
          />
          <Text variant="labelLarge" style={styles.subheading}>主题颜色</Text>
          <View style={styles.paletteRow}>
            {THEME_PRESETS.map(preset => {
              const selected = settings.colorSeed.toLowerCase() === preset.seed.toLowerCase();
              return (
                <Pressable
                  key={preset.seed}
                  onPress={() => void handleColorChange(preset.seed)}
                  style={[
                    styles.paletteItem,
                    {
                      borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                      backgroundColor: selected ? theme.colors.secondaryContainer : theme.colors.surfaceVariant,
                    },
                  ]}
                >
                  <View style={[styles.colorSwatch, { backgroundColor: preset.seed }]}>
                    {selected ? <Icon source="check" size={17} color="#FFFFFF" /> : null}
                  </View>
                  <Text variant="labelSmall" style={{ marginTop: 5 }}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </SettingsSection>
      ) : null}

      <SettingsSection title="内容管理" isTech={isTech}>
        <SettingsLink
          icon="shape-outline"
          title="分类设置"
          description="修改想法、待办、项目进展和提醒的名称"
          isTech={isTech}
          onPress={() => navigation.navigate('CategorySettings')}
        />
        <SettingsLink
          icon="folder-outline"
          title="项目设置"
          description="创建项目，维护需求清单和完成状态"
          isTech={isTech}
          onPress={() => navigation.navigate('ProjectSettings')}
        />
      </SettingsSection>

      <SettingsSection title="智能整理" isTech={isTech}>
        <Text variant="bodySmall" style={{ color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>
          SenseVoice 始终在本地转写；这里只决定后续使用云端 API 还是本地 Qwen。
        </Text>
        <SegmentedButtons
          value={settings.organizerProvider}
          onValueChange={handleOrganizerProviderChange}
          buttons={[
            { value: 'cloud', label: '云端 API', icon: 'cloud-outline', disabled: !settingsReady },
            { value: 'local', label: '本地 Qwen', icon: 'cellphone', disabled: !settingsReady },
          ]}
          style={{ marginTop: 14 }}
        />

        {!settingsReady ? (
          <Text variant="bodySmall" style={{ marginTop: 14, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>
            正在读取整理后端设置…
          </Text>
        ) : isLocalOrganizer ? (
          <SettingsLink
            icon="brain"
            title="本地模型管理"
            description={localModelStatus?.exists
              ? `${localModelStatus.loaded ? '已加载' : '已下载'} · ${formatBytes(localModelStatus.bytes)}`
              : 'Qwen3.5-0.8B Q4_0 · 尚未下载'}
            isTech={isTech}
            onPress={() => navigation.navigate('LocalModelSettings')}
          />
        ) : (
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
            {isTech ? (
              <View style={styles.inlineButtons}>
                <TechButton
                  label="获取模型"
                  variant="ghost"
                  icon="database-search-outline"
                  disabled={loadingModels || !settings.apiBaseUrl.trim()}
                  onPress={() => void handleFetchModels()}
                  style={{ flex: 1 }}
                />
                <TechButton
                  label="保存配置"
                  icon="content-save-outline"
                  disabled={savingCloud}
                  onPress={() => void handleSaveCloud()}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <View style={styles.inlineButtons}>
                <Button mode="outlined" icon="database-search-outline" loading={loadingModels} onPress={handleFetchModels} style={{ flex: 1 }}>获取模型</Button>
                <Button mode="contained" icon="content-save-outline" loading={savingCloud} onPress={handleSaveCloud} style={{ flex: 1 }}>保存配置</Button>
              </View>
            )}
          </View>
        )}

        <SettingsLink
          icon="application-edit-outline"
          title="整理提示词"
          description="云端和本地整理共用规则"
          isTech={isTech}
          onPress={() => navigation.navigate('PromptSettings')}
        />
      </SettingsSection>

      <SettingsSection title="系统" isTech={isTech}>
        <SettingsLink
          icon="tools"
          title="开发者选项"
          description="刷新率、WebDAV、数据快照和清理"
          isTech={isTech}
          onPress={() => navigation.navigate('DeveloperOptions')}
        />
        <SettingsLink
          icon="information-outline"
          title="关于 VoiceDiary"
          description="版本、隐私、技术栈和当前开发状态"
          isTech={isTech}
          onPress={() => navigation.navigate('About')}
        />
      </SettingsSection>
    </ScrollView>
  );

  return (
    <>
      {isTech ? (
        <TechScreen>{content}</TechScreen>
      ) : (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>{content}</View>
      )}

      <Portal>
        <Dialog visible={modelDialogVisible} onDismiss={() => setModelDialogVisible(false)}>
          <Dialog.Title>选择模型</Dialog.Title>
          <Dialog.Content>
            <Searchbar placeholder="搜索模型名" value={modelQuery} onChangeText={setModelQuery} elevation={0} />
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
    </>
  );
}

type SettingsSectionProps = {
  title: string;
  isTech: boolean;
  children: React.ReactNode;
};

function SettingsSection({ title, isTech, children }: SettingsSectionProps) {
  const theme = useTheme();
  if (isTech) {
    return (
      <TechPanel accent style={{ marginTop: 14 }}>
        <Text style={styles.techSectionTitle}>{title}</Text>
        <View style={{ marginTop: 12 }}>{children}</View>
      </TechPanel>
    );
  }

  return (
    <View style={[styles.classicCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <Text variant="titleMedium" style={{ fontWeight: '900' }}>{title}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

type ChoiceTileProps = {
  label: string;
  description: string;
  icon: string;
  selected: boolean;
  isTech: boolean;
  onPress: () => void;
};

function ChoiceTile({ label, description, icon, selected, isTech, onPress }: ChoiceTileProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choiceTile,
        {
          borderColor: selected
            ? isTech
              ? techTokens.colors.primary
              : theme.colors.primary
            : isTech
              ? techTokens.colors.line
              : theme.colors.outlineVariant,
          backgroundColor: selected
            ? isTech
              ? 'rgba(85, 217, 255, 0.10)'
              : theme.colors.secondaryContainer
            : isTech
              ? 'rgba(255,255,255,0.02)'
              : theme.colors.surfaceVariant,
        },
      ]}
    >
      <Icon source={icon} size={25} color={selected ? (isTech ? techTokens.colors.primary : theme.colors.primary) : (isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant)} />
      <Text variant="titleSmall" style={{ marginTop: 8, fontWeight: '900', color: isTech ? techTokens.colors.text : theme.colors.onSurface }}>{label}</Text>
      <Text variant="bodySmall" style={{ marginTop: 4, lineHeight: 18, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>{description}</Text>
    </Pressable>
  );
}

function CompactChoice({
  label,
  selected,
  isTech,
  onPress,
}: {
  label: string;
  selected: boolean;
  isTech: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.compactChoice,
        {
          borderColor: selected ? (isTech ? techTokens.colors.primary : theme.colors.primary) : (isTech ? techTokens.colors.line : theme.colors.outlineVariant),
          backgroundColor: selected ? (isTech ? 'rgba(85,217,255,0.10)' : theme.colors.primaryContainer) : 'transparent',
        },
      ]}
    >
      <Text variant="labelMedium" style={{ fontWeight: '800', color: selected ? (isTech ? techTokens.colors.primary : theme.colors.onPrimaryContainer) : (isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant) }}>{label}</Text>
    </Pressable>
  );
}

function SettingSwitchRow({
  title,
  description,
  value,
  isTech,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  isTech: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.switchRow, { borderTopColor: isTech ? techTokens.colors.line : theme.colors.outlineVariant }]}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text variant="titleSmall" style={{ fontWeight: '800', color: isTech ? techTokens.colors.text : theme.colors.onSurface }}>{title}</Text>
        <Text variant="bodySmall" style={{ marginTop: 3, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} color={isTech ? techTokens.colors.primary : theme.colors.primary} />
    </View>
  );
}

function SettingsLink({
  icon,
  title,
  description,
  isTech,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  isTech: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <MotionTouchable
      onPress={onPress}
      borderRadius={16}
      style={{ marginTop: 10 }}
      contentStyle={[
        styles.managementItem,
        {
          backgroundColor: isTech ? 'rgba(255,255,255,0.025)' : theme.colors.surfaceVariant,
          borderColor: isTech ? techTokens.colors.line : 'transparent',
        },
      ]}
    >
      <View style={styles.settingRow}>
        <View style={[styles.rowIcon, { backgroundColor: isTech ? 'rgba(85,217,255,0.09)' : theme.colors.secondaryContainer }]}>
          <Icon source={icon} size={23} color={isTech ? techTokens.colors.primary : theme.colors.onSecondaryContainer} />
        </View>
        <View style={styles.rowText}>
          <Text variant="titleSmall" style={{ fontWeight: '900', color: isTech ? techTokens.colors.text : theme.colors.onSurface }}>{title}</Text>
          <Text variant="bodySmall" style={{ marginTop: 3, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>{description}</Text>
        </View>
        <Icon source="chevron-right" size={22} color={isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant} />
      </View>
    </MotionTouchable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 48,
  },
  classicCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  techSectionTitle: {
    color: techTokens.colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceTile: {
    flex: 1,
    minHeight: 132,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
  },
  subheading: {
    marginTop: 18,
    marginBottom: 9,
    fontWeight: '900',
  },
  compactChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactChoice: {
    minWidth: 78,
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paletteItem: {
    width: '18%',
    minWidth: 59,
    borderRadius: 15,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  colorSwatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementItem: {
    borderRadius: 16,
    borderWidth: 1,
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
    borderRadius: 14,
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
    gap: 10,
    marginTop: 12,
  },
});

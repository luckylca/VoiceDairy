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
  CloudModelProvider,
  MotionLevel,
  OrganizerProvider,
  StartupPage,
  ThemeMode,
  VisualStyle,
} from '../types/settings';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings/SettingsService';
import { fetchAvailableModels } from '../services/llm/LlmService';
import {
  CLOUD_MODEL_PROVIDERS,
  getCloudProviderPreset,
} from '../services/llm/CloudModelProviders';
import { getLocalModelStatus, type LocalModelStatus } from '../services/llm/LocalModelService';
import { syncDailyNotifications } from '../services/notifications/DailyNotificationService';
import { THEME_PRESETS, useAppTheme } from '../theme/AppThemeProvider';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';
import { TechScreen } from '../components/tech/TechScreen';
import { TechPanel } from '../components/tech/TechPanel';
import { TechButton } from '../components/tech/TechButton';
import { TechCornerBrackets } from '../components/tech/TechMotion';
import { techTokens } from '../theme/tech/tokens';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const megabytes = bytes / 1024 / 1024;
  return megabytes < 1024
    ? `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`
    : `${(megabytes / 1024).toFixed(2)} GB`;
}

function shiftTime(value: string, hourDelta: number, minuteDelta: number): string {
  const [rawHour, rawMinute] = value.split(':').map(Number);
  const currentMinutes = (Number.isFinite(rawHour) ? rawHour : 0) * 60 + (Number.isFinite(rawMinute) ? rawMinute : 0);
  const next = ((currentMinutes + hourDelta * 60 + minuteDelta) % 1440 + 1440) % 1440;
  return `${Math.floor(next / 60).toString().padStart(2, '0')}:${(next % 60).toString().padStart(2, '0')}`;
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
  const [syncingNotifications, setSyncingNotifications] = useState(false);

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

  const selectedCloudPreset = getCloudProviderPreset(settings.cloudModelProvider);
  const filteredModels = useMemo(() => {
    const keyword = modelQuery.trim().toLowerCase();
    if (!keyword) return availableModels;
    return availableModels.filter(model => model.toLowerCase().includes(keyword));
  }, [availableModels, modelQuery]);
  const isLocalOrganizer = settingsReady && settings.organizerProvider === 'local';

  function patchSettings(patch: Partial<AppSettings>) {
    setSettings(previous => ({ ...previous, ...patch }));
  }

  async function persistPatch(patch: Partial<AppSettings>, successMessage?: string) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
    if (successMessage) {
      showNotification({ title: '设置已生效', message: successMessage, kind: 'success', icon: 'check-circle-outline' });
    }
    return next;
  }

  async function persistNotificationPatch(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
    setSyncingNotifications(true);
    try {
      const configured = await syncDailyNotifications(next, true);
      showNotification({
        title: configured ? '通知计划已更新' : '通知权限未开启',
        message: configured
          ? `规划 ${next.dailyPlanTime} · 复盘 ${next.dailyReviewTime}`
          : '请允许通知权限后再启用每日提醒或常驻录音入口。',
        kind: configured ? 'success' : 'warning',
        icon: configured ? 'bell-check-outline' : 'bell-alert-outline',
      });
    } catch (caughtError) {
      showNotification({
        title: '通知计划更新失败',
        message: caughtError instanceof Error ? caughtError.message : '请重新尝试。',
        kind: 'error',
      });
    } finally {
      setSyncingNotifications(false);
    }
  }

  async function handleVisualStyleChange(value: VisualStyle) {
    patchSettings({ visualStyle: value });
    await setVisualStyle(value);
    showNotification({
      title: value === 'tech' ? '已切换为科技界面' : '已切换为经典界面',
      message: '界面已经立即更新。',
      kind: 'success',
      icon: value === 'tech' ? 'vector-polyline' : 'view-dashboard-outline',
    });
  }

  async function handleMotionLevelChange(value: MotionLevel) {
    patchSettings({ motionLevel: value });
    await setMotionLevel(value);
    showNotification({
      title: '动态效果已更新',
      message: value === 'off' ? '持续动画和点击粒子已关闭。' : `当前动态档位：${value}`,
      kind: 'success',
    });
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
      showNotification({
        title: '已切换到本地模型',
        message: '每日规划、每日复盘和冲突检测将自动停用，不会调用本地模型。',
        kind: 'info',
      });
    } else {
      setLocalModelStatus(null);
      showNotification({ title: '已切换到云端 API', message: '云端 Agent 功能现在可以使用。', kind: 'success' });
    }
  }

  async function handleCloudProviderChange(provider: CloudModelProvider) {
    const preset = getCloudProviderPreset(provider);
    const next: AppSettings = {
      ...settings,
      cloudModelProvider: provider,
      apiBaseUrl: provider === 'custom' ? settings.apiBaseUrl : preset.baseUrl,
      modelName: preset.suggestedModel || settings.modelName,
    };
    setSettings(next);
    setAvailableModels([]);
    setModelQuery('');
    await saveSettings(next);
  }

  async function handleSaveCloud() {
    setSavingCloud(true);
    try {
      const next = { ...settings, organizerProvider: 'cloud' as const };
      setSettings(next);
      await saveSettings(next);
      showNotification({
        title: '云端模型配置已保存',
        message: `${selectedCloudPreset.shortLabel} · ${settings.modelName || '未选择模型'}`,
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
    } catch (caughtError) {
      showNotification({
        title: '获取模型列表失败',
        message: caughtError instanceof Error ? caughtError.message : '请检查供应商、API Key 和网络。',
        kind: 'error',
      });
    } finally {
      setLoadingModels(false);
    }
  }

  const cloudConfigValid =
    Boolean(settings.apiKey.trim()) &&
    Boolean(settings.modelName.trim()) &&
    (settings.cloudModelProvider !== 'custom' || Boolean(settings.apiBaseUrl.trim()));

  const alignedInputProps = {
    dense: true,
    style: styles.paperInput,
    contentStyle: styles.paperInputContent,
  } as const;

  const content = (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <Text variant="headlineMedium" style={{ fontWeight: '900', color: isTech ? techTokens.colors.text : theme.colors.onSurface }}>
        设置
      </Text>
      <Text variant="bodyMedium" style={{ marginTop: 4, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>
        所有开关会立即保存；标注“下次启动”的选项会在重启应用后生效。
      </Text>

      <SettingsSection title="界面风格" isTech={isTech}>
        <View style={styles.choiceRow}>
          <ChoiceTile label="经典界面" description="Material Design 3" icon="view-dashboard-outline" selected={settings.visualStyle === 'classic'} isTech={isTech} onPress={() => void handleVisualStyleChange('classic')} />
          <ChoiceTile label="科技界面" description="动态数据流视觉" icon="vector-polyline" selected={settings.visualStyle === 'tech'} isTech={isTech} onPress={() => void handleVisualStyleChange('tech')} />
        </View>

        <Text variant="labelLarge" style={[styles.subheading, { color: isTech ? techTokens.colors.text : theme.colors.onSurface }]}>动态效果</Text>
        <View style={styles.compactChoices}>
          {([['full', '完整'], ['standard', '标准'], ['reduced', '减少'], ['off', '关闭']] as [MotionLevel, string][]).map(([value, label]) => (
            <CompactChoice key={value} label={label} selected={settings.motionLevel === value} isTech={isTech} onPress={() => void handleMotionLevelChange(value)} />
          ))}
        </View>

        <Text variant="labelLarge" style={[styles.subheading, { color: isTech ? techTokens.colors.text : theme.colors.onSurface }]}>下次启动时打开</Text>
        <View style={styles.compactChoices}>
          {([['quick_record', '快速记录'], ['last_page', '上次页面'], ['agent', 'Agent']] as [StartupPage, string][]).map(([value, label]) => (
            <CompactChoice key={value} label={label} selected={settings.startupPage === value} isTech={isTech} onPress={() => void persistPatch({ startupPage: value }, `下次启动将打开：${label}`)} />
          ))}
        </View>

        <SettingSwitchRow title="识别完成后自动整理" description="识别完成后立即调用当前整理后端" value={settings.autoOrganizeAfterRecognition} isTech={isTech} onValueChange={value => void persistPatch({ autoOrganizeAfterRecognition: value })} />
        <SettingSwitchRow title="Agent 语音识别后自动发送" description="关闭时会先把识别文字放入输入框" value={settings.agentAutoSendVoice} isTech={isTech} onValueChange={value => void persistPatch({ agentAutoSendVoice: value })} />
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
                <Pressable key={preset.seed} onPress={() => void handleColorChange(preset.seed)} style={[styles.paletteItem, { borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant, backgroundColor: selected ? theme.colors.secondaryContainer : theme.colors.surfaceVariant }]}>
                  <View style={[styles.colorSwatch, { backgroundColor: preset.seed }]}>{selected ? <Icon source="check" size={17} color="#FFFFFF" /> : null}</View>
                  <Text variant="labelSmall" style={{ marginTop: 5 }}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </SettingsSection>
      ) : null}

      <SettingsSection title="每日规划与复盘" isTech={isTech}>
        <SettingsLink icon="calendar-account-outline" title="打开每日行动中心" description="手动生成每日规划或每日复盘" isTech={isTech} onPress={() => navigation.navigate('DailyAgent', { mode: 'plan' })} />
        <SettingSwitchRow title="每日规划提醒" description="到点通知并打开每日规划 Agent" value={settings.dailyPlanEnabled} isTech={isTech} onValueChange={value => void persistNotificationPatch({ dailyPlanEnabled: value })} />
        <TimeControl label="规划时间" value={settings.dailyPlanTime} isTech={isTech} disabled={!settings.dailyPlanEnabled || syncingNotifications} onChange={value => void persistNotificationPatch({ dailyPlanTime: value })} />
        <SettingSwitchRow title="每日复盘提醒" description="汇总今天记录、未完成事项和项目变化" value={settings.dailyReviewEnabled} isTech={isTech} onValueChange={value => void persistNotificationPatch({ dailyReviewEnabled: value })} />
        <TimeControl label="复盘时间" value={settings.dailyReviewTime} isTech={isTech} disabled={!settings.dailyReviewEnabled || syncingNotifications} onChange={value => void persistNotificationPatch({ dailyReviewTime: value })} />
        <SettingSwitchRow title="常驻快速录音通知" description="点击系统通知后直接进入并开始语音记录" value={settings.persistentQuickRecordNotification} isTech={isTech} onValueChange={value => void persistNotificationPatch({ persistentQuickRecordNotification: value })} />
        <Text style={{ marginTop: 8, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant, fontSize: 11, lineHeight: 17 }}>
          每日 Agent 只使用云端 API。选择本地 Qwen 时，提醒仍可打开页面，但不会调用本地模型生成内容。
        </Text>
      </SettingsSection>

      <SettingsSection title="内容管理" isTech={isTech}>
        <SettingsLink icon="shape-outline" title="分类设置" description="修改想法、待办、项目进展和提醒的名称" isTech={isTech} onPress={() => navigation.navigate('CategorySettings')} />
        <SettingsLink icon="folder-outline" title="项目设置" description="创建项目，维护需求清单和完成状态" isTech={isTech} onPress={() => navigation.navigate('ProjectSettings')} />
      </SettingsSection>

      <SettingsSection title="智能整理" isTech={isTech}>
        <Text variant="bodySmall" style={{ color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>
          SenseVoice 始终在本地转写；这里只决定后续使用云端模型还是本地 Qwen。
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
          <Text variant="bodySmall" style={{ marginTop: 14, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>正在读取整理后端设置…</Text>
        ) : isLocalOrganizer ? (
          <SettingsLink
            icon="brain"
            title="本地模型管理"
            description={localModelStatus?.exists ? `${localModelStatus.loaded ? '已加载' : '已下载'} · ${formatBytes(localModelStatus.bytes)}` : 'Qwen3.5-0.8B Q4_0 · 尚未下载'}
            isTech={isTech}
            onPress={() => navigation.navigate('LocalModelSettings')}
          />
        ) : (
          <View style={{ marginTop: 14 }}>
            <Text variant="labelLarge" style={{ color: isTech ? techTokens.colors.text : theme.colors.onSurface, fontWeight: '900' }}>模型供应商</Text>
            <View style={styles.providerGrid}>
              {CLOUD_MODEL_PROVIDERS.map(provider => (
                <ProviderTile key={provider.id} label={provider.shortLabel} description={provider.description} selected={settings.cloudModelProvider === provider.id} isTech={isTech} onPress={() => void handleCloudProviderChange(provider.id)} />
              ))}
            </View>

            {settings.cloudModelProvider === 'custom' ? (
              <TextInput {...alignedInputProps} mode="outlined" label="API Base URL" value={settings.apiBaseUrl} onChangeText={apiBaseUrl => patchSettings({ apiBaseUrl })} autoCapitalize="none" autoCorrect={false} />
            ) : (
              <View style={[styles.fixedEndpoint, isTech && styles.fixedEndpointTech]}>
                {isTech ? <TechCornerBrackets color="rgba(85,217,255,0.42)" /> : null}
                <Text style={[styles.endpointCode, { color: isTech ? techTokens.colors.primary : theme.colors.primary }]}>FIXED ENDPOINT</Text>
                <Text selectable style={{ marginTop: 4, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant, fontSize: 12 }}>{selectedCloudPreset.baseUrl}</Text>
              </View>
            )}

            <TextInput {...alignedInputProps} mode="outlined" label="API Key" value={settings.apiKey} onChangeText={apiKey => patchSettings({ apiKey })} secureTextEntry autoCapitalize="none" autoCorrect={false} />
            <TextInput {...alignedInputProps} mode="outlined" label="模型名" value={settings.modelName} onChangeText={modelName => patchSettings({ modelName })} autoCapitalize="none" autoCorrect={false} />
            {selectedCloudPreset.suggestedModel ? <Text style={{ marginTop: 6, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant, fontSize: 11 }}>建议模型：{selectedCloudPreset.suggestedModel}</Text> : null}

            <SettingSwitchRow
              title="云端冲突检测 Agent"
              description="整理后检查时间重叠、重复事项、项目矛盾和未完成依赖"
              value={settings.conflictDetectionEnabled}
              isTech={isTech}
              onValueChange={value => void persistPatch({ conflictDetectionEnabled: value })}
            />

            <View style={styles.inlineButtons}>
              {isTech ? (
                <>
                  <TechButton label={loadingModels ? '读取中' : '获取模型'} variant="ghost" icon="database-search-outline" disabled={loadingModels || !settings.apiKey.trim()} onPress={() => void handleFetchModels()} style={{ flex: 1 }} />
                  <TechButton label={savingCloud ? '保存中' : '保存配置'} icon="content-save-outline" disabled={savingCloud || !cloudConfigValid} onPress={() => void handleSaveCloud()} style={{ flex: 1 }} />
                </>
              ) : (
                <>
                  <Button mode="outlined" icon="database-search-outline" loading={loadingModels} disabled={!settings.apiKey.trim()} onPress={handleFetchModels} style={{ flex: 1 }}>获取模型</Button>
                  <Button mode="contained" icon="content-save-outline" loading={savingCloud} disabled={!cloudConfigValid} onPress={handleSaveCloud} style={{ flex: 1 }}>保存配置</Button>
                </>
              )}
            </View>
          </View>
        )}

        <SettingsLink icon="application-edit-outline" title="整理提示词" description="主整理提示词；每日与冲突 Agent 使用独立安全提示词" isTech={isTech} onPress={() => navigation.navigate('PromptSettings')} />
      </SettingsSection>

      <SettingsSection title="系统" isTech={isTech}>
        <SettingsLink icon="tools" title="开发者选项" description="刷新率、WebDAV、数据快照和清理" isTech={isTech} onPress={() => navigation.navigate('DeveloperOptions')} />
        <SettingsLink icon="information-outline" title="关于 VoiceDiary" description="版本、隐私、技术栈和当前开发状态" isTech={isTech} onPress={() => navigation.navigate('About')} />
      </SettingsSection>
    </ScrollView>
  );

  return (
    <>
      {isTech ? <TechScreen>{content}</TechScreen> : <View style={{ flex: 1, backgroundColor: theme.colors.background }}>{content}</View>}
      <Portal>
        <Dialog visible={modelDialogVisible} onDismiss={() => setModelDialogVisible(false)}>
          <Dialog.Title>选择模型</Dialog.Title>
          <Dialog.Content>
            <Searchbar placeholder="搜索模型名" value={modelQuery} onChangeText={setModelQuery} elevation={0} style={styles.searchbar} inputStyle={styles.searchbarInput} />
          </Dialog.Content>
          <Dialog.ScrollArea style={{ maxHeight: 390 }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredModels.length > 0 ? filteredModels.map(model => (
                <RadioButton.Item key={model} label={model} value={model} status={settings.modelName === model ? 'checked' : 'unchecked'} onPress={() => { patchSettings({ modelName: model }); setModelDialogVisible(false); }} />
              )) : <Text variant="bodyMedium" style={{ padding: 20, color: theme.colors.onSurfaceVariant }}>没有匹配的模型。</Text>}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions><Button onPress={() => setModelDialogVisible(false)}>关闭</Button></Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

function SettingsSection({ title, isTech, children }: { title: string; isTech: boolean; children: React.ReactNode }) {
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

function ChoiceTile({ label, description, icon, selected, isTech, onPress }: { label: string; description: string; icon: string; selected: boolean; isTech: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.choiceTile, { opacity: pressed ? 0.78 : 1, borderColor: selected ? isTech ? techTokens.colors.primary : theme.colors.primary : isTech ? techTokens.colors.line : theme.colors.outlineVariant, backgroundColor: selected ? isTech ? 'rgba(85,217,255,0.10)' : theme.colors.secondaryContainer : isTech ? 'rgba(255,255,255,0.025)' : theme.colors.surfaceVariant }]}>
      {isTech ? <TechCornerBrackets color={selected ? techTokens.colors.primary : 'rgba(119,193,221,0.32)'} /> : null}
      <Icon source={icon} size={24} color={selected ? isTech ? techTokens.colors.primary : theme.colors.primary : isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant} />
      <Text style={{ marginTop: 8, fontWeight: '900', color: isTech ? techTokens.colors.text : theme.colors.onSurface }}>{label}</Text>
      <Text style={{ marginTop: 3, fontSize: 11, textAlign: 'center', color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>{description}</Text>
    </Pressable>
  );
}

function CompactChoice({ label, selected, isTech, onPress }: { label: string; selected: boolean; isTech: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.compactChoice, { opacity: pressed ? 0.72 : 1, borderColor: selected ? isTech ? techTokens.colors.primary : theme.colors.primary : isTech ? techTokens.colors.line : theme.colors.outlineVariant, backgroundColor: selected ? isTech ? 'rgba(85,217,255,0.12)' : theme.colors.secondaryContainer : 'transparent' }]}>
      <Text style={{ color: selected ? isTech ? techTokens.colors.primary : theme.colors.primary : isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant, fontWeight: '800', fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

function ProviderTile({ label, description, selected, isTech, onPress }: { label: string; description: string; selected: boolean; isTech: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.providerTile, { opacity: pressed ? 0.74 : 1, borderColor: selected ? isTech ? techTokens.colors.primary : theme.colors.primary : isTech ? techTokens.colors.line : theme.colors.outlineVariant, backgroundColor: selected ? isTech ? 'rgba(85,217,255,0.10)' : theme.colors.secondaryContainer : isTech ? 'rgba(255,255,255,0.02)' : theme.colors.surfaceVariant }]}>
      {isTech ? <View style={[styles.providerSignal, { backgroundColor: selected ? techTokens.colors.success : techTokens.colors.textMuted }]} /> : null}
      <Text style={{ color: isTech ? techTokens.colors.text : theme.colors.onSurface, fontWeight: '900', fontSize: 13 }}>{label}</Text>
      <Text numberOfLines={2} style={{ marginTop: 3, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant, fontSize: 9, lineHeight: 13 }}>{description}</Text>
    </Pressable>
  );
}

function SettingSwitchRow({ title, description, value, isTech, onValueChange }: { title: string; description: string; value: boolean; isTech: boolean; onValueChange: (value: boolean) => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => onValueChange(!value)} style={styles.switchRow}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: isTech ? techTokens.colors.text : theme.colors.onSurface, fontWeight: '800' }}>{title}</Text>
        <Text style={{ marginTop: 3, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant, fontSize: 12, lineHeight: 17 }}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </Pressable>
  );
}

function TimeControl({ label, value, isTech, disabled, onChange }: { label: string; value: string; isTech: boolean; disabled: boolean; onChange: (value: string) => void }) {
  const theme = useTheme();
  const buttonColor = isTech ? techTokens.colors.primary : theme.colors.primary;
  return (
    <View style={[styles.timeControl, { opacity: disabled ? 0.42 : 1, borderColor: isTech ? techTokens.colors.line : theme.colors.outlineVariant }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant, fontSize: 10, fontWeight: '900' }}>{label.toUpperCase()}</Text>
        <Text style={{ marginTop: 3, color: isTech ? techTokens.colors.text : theme.colors.onSurface, fontSize: 25, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{value}</Text>
      </View>
      <View style={styles.timeButtons}>
        <TimeStep label="−1h" color={buttonColor} disabled={disabled} onPress={() => onChange(shiftTime(value, -1, 0))} />
        <TimeStep label="+1h" color={buttonColor} disabled={disabled} onPress={() => onChange(shiftTime(value, 1, 0))} />
        <TimeStep label="−5m" color={buttonColor} disabled={disabled} onPress={() => onChange(shiftTime(value, 0, -5))} />
        <TimeStep label="+5m" color={buttonColor} disabled={disabled} onPress={() => onChange(shiftTime(value, 0, 5))} />
      </View>
    </View>
  );
}

function TimeStep({ label, color, disabled, onPress }: { label: string; color: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.timeStep, { borderColor: color, opacity: pressed ? 0.55 : 1 }]}>
      <Text style={{ color, fontSize: 10, fontWeight: '900' }}>{label}</Text>
    </Pressable>
  );
}

function SettingsLink({ icon, title, description, isTech, onPress }: { icon: string; title: string; description: string; isTech: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.7 : 1, borderBottomColor: isTech ? techTokens.colors.line : theme.colors.outlineVariant }]}>
      <View style={[styles.linkIcon, { backgroundColor: isTech ? 'rgba(85,217,255,0.08)' : theme.colors.secondaryContainer }]}><Icon source={icon} size={21} color={isTech ? techTokens.colors.primary : theme.colors.primary} /></View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: isTech ? techTokens.colors.text : theme.colors.onSurface, fontWeight: '800' }}>{title}</Text>
        <Text style={{ marginTop: 3, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant, fontSize: 12, lineHeight: 17 }}>{description}</Text>
      </View>
      <Icon source="chevron-right" size={22} color={isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120 },
  classicCard: { marginTop: 14, borderRadius: 22, borderWidth: 1, padding: 16 },
  techSectionTitle: { color: techTokens.colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  choiceRow: { flexDirection: 'row', gap: 10 },
  choiceTile: { flex: 1, minHeight: 116, borderWidth: 1, borderRadius: 16, padding: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  subheading: { marginTop: 18, marginBottom: 9, fontWeight: '900' },
  compactChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  compactChoice: { minHeight: 36, paddingHorizontal: 13, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paletteRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paletteItem: { width: 72, minHeight: 70, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  colorSwatch: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  providerGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  providerTile: { width: '48.5%', minHeight: 74, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 10, overflow: 'hidden' },
  providerSignal: { position: 'absolute', right: 8, top: 8, width: 5, height: 5, borderRadius: 3 },
  fixedEndpoint: { marginTop: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  fixedEndpointTech: { borderColor: techTokens.colors.line, backgroundColor: 'rgba(4,18,27,0.76)', overflow: 'hidden' },
  endpointCode: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  inlineButtons: { marginTop: 14, flexDirection: 'row', gap: 10 },
  switchRow: { minHeight: 66, marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  linkRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  linkIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  paperInput: { marginTop: 12, minHeight: 52 },
  paperInputContent: { minHeight: 48, paddingVertical: 0, textAlignVertical: 'center' },
  searchbar: { minHeight: 48 },
  searchbarInput: { minHeight: 44, paddingVertical: 0, textAlignVertical: 'center' },
  timeControl: { minHeight: 82, marginTop: 8, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  timeButtons: { width: 124, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 5 },
  timeStep: { minWidth: 56, height: 27, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
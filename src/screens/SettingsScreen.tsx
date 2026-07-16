import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Divider, Icon, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import type { AppSettings, ThemeMode } from '../types/settings';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings/SettingsService';
import { clearLocalDatabase } from '../services/database/Database';
import { buildJsonSnapshot } from '../services/sync/SyncService';
import { THEME_PRESETS, useAppTheme } from '../theme/AppThemeProvider';
import { MotionTouchable } from '../components/MotionTouchable';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { setThemeMode, setColorSeed } = useAppTheme();
  const { showNotification } = useFluidNotification();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then(setSettings);
    }, []),
  );

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
      message: '时间线和分类统计将在返回后刷新。',
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
          管理外观、智能整理、本地识别和数据同步。
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

          <Divider style={{ marginTop: 18, marginBottom: 8 }} />
          <MotionTouchable
            onPress={() => navigation.navigate('PromptSettings')}
            borderRadius={16}
            contentStyle={{
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 12,
              backgroundColor: theme.colors.surfaceVariant,
            }}
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
                icon: 'microphone-check',
              })
            }
            borderRadius={16}
            contentStyle={{
              borderRadius: 16,
              paddingVertical: 12,
              paddingHorizontal: 12,
              backgroundColor: theme.colors.surfaceVariant,
            }}
          >
            <View style={styles.settingRow}>
              <View style={[styles.rowIcon, { backgroundColor: theme.colors.tertiaryContainer }]}>
                <Icon source="microphone-check" size={23} color={theme.colors.onTertiaryContainer} />
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

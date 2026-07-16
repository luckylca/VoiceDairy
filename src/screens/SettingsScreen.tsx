import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Button,
  Divider,
  Icon,
  List,
  SegmentedButtons,
  Snackbar,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import type { AppSettings, ThemeMode } from '../types/settings';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings/SettingsService';
import { clearLocalDatabase } from '../services/database/Database';
import { buildJsonSnapshot } from '../services/sync/SyncService';
import { SwipeableTabScreen } from '../components/SwipeableTabScreen';
import { THEME_PRESETS, useAppTheme } from '../theme/AppThemeProvider';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { setThemeMode, setColorSeed } = useAppTheme();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [message, setMessage] = useState('');

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
  }

  async function handleColorChange(colorSeed: string) {
    patchSettings({ colorSeed });
    await setColorSeed(colorSeed);
  }

  async function handleSave() {
    await saveSettings(settings);
    setMessage('设置已保存。');
  }

  async function handleExport() {
    const snapshot = await buildJsonSnapshot();
    setMessage(`已生成 JSON 快照，长度 ${snapshot.length} 字符。`);
  }

  async function handleClear() {
    await clearLocalDatabase();
    setMessage('本地数据已清空。');
  }

  const cardStyle = {
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  } as const;

  return (
    <SwipeableTabScreen routeName="Settings">
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text variant="headlineMedium" style={{ fontWeight: '900' }}>
            设置
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
            管理外观、智能整理、本地识别和数据同步。
          </Text>

          <Surface elevation={1} style={cardStyle}>
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
                  <TouchableRipple
                    key={preset.seed}
                    onPress={() => handleColorChange(preset.seed)}
                    borderless
                    style={styles.paletteItem}
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
                  </TouchableRipple>
                );
              })}
            </View>
          </Surface>

          <Surface elevation={1} style={cardStyle}>
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

            <Divider style={{ marginTop: 18 }} />
            <List.Item
              title="整理提示词"
              description="在独立页面中编辑结构化整理规则"
              left={props => <List.Icon {...props} icon="text-box-edit-outline" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('PromptSettings')}
              style={{ paddingHorizontal: 0 }}
            />
          </Surface>

          <Surface elevation={1} style={cardStyle}>
            <List.Item
              title="本地语音识别"
              description="SenseVoice INT8 · 手机端离线处理 · 无需填写模型路径"
              left={props => <List.Icon {...props} icon="microphone-check" />}
              style={{ paddingHorizontal: 0 }}
            />
          </Surface>

          <Surface elevation={1} style={cardStyle}>
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
          </Surface>

          <Surface elevation={1} style={cardStyle}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              数据
            </Text>
            <Button mode="contained" onPress={handleSave} style={{ marginTop: 14 }}>
              保存设置
            </Button>
            <Button mode="outlined" icon="code-json" onPress={handleExport} style={{ marginTop: 12 }}>
              生成 JSON 快照
            </Button>
            <Button mode="outlined" icon="delete-outline" textColor={theme.colors.error} onPress={handleClear} style={{ marginTop: 12 }}>
              清空本地数据
            </Button>
          </Surface>
        </ScrollView>

        <Snackbar visible={Boolean(message)} onDismiss={() => setMessage('')} duration={2500}>
          {message}
        </Snackbar>
      </View>
    </SwipeableTabScreen>
  );
}

const styles = StyleSheet.create({
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
    paddingVertical: 6,
    borderRadius: 14,
  },
  colorSwatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

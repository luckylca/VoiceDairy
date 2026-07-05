import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Snackbar, Text, TextInput } from 'react-native-paper';
import type { AppSettings } from '../types/settings';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings/SettingsService';
import { clearLocalDatabase } from '../services/database/Database';
import { buildJsonSnapshot } from '../services/sync/SyncService';

export function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  function patchSettings(patch: Partial<AppSettings>) {
    setSettings(prev => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    await saveSettings(settings);
    setMessage('设置已保存。');
  }

  async function handleExport() {
    const snapshot = await buildJsonSnapshot();
    setMessage(`已生成 JSON 快照，长度 ${snapshot.length} 字符。第四阶段会上传到 WebDAV。`);
  }

  async function handleClear() {
    await clearLocalDatabase();
    setMessage('本地演示数据已清空。');
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
          设置
        </Text>

        <Text variant="titleMedium" style={{ marginTop: 20, marginBottom: 8, fontWeight: '700' }}>
          大模型 API
        </Text>
        <TextInput
          mode="outlined"
          label="API Base URL"
          value={settings.apiBaseUrl}
          onChangeText={apiBaseUrl => patchSettings({ apiBaseUrl })}
          autoCapitalize="none"
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
        <TextInput
          mode="outlined"
          label="系统提示词"
          value={settings.systemPrompt}
          onChangeText={systemPrompt => patchSettings({ systemPrompt })}
          multiline
          numberOfLines={6}
          style={{ marginTop: 12 }}
        />

        <Text variant="titleMedium" style={{ marginTop: 20, marginBottom: 8, fontWeight: '700' }}>
          本地语音识别 ASR
        </Text>
        <Text variant="bodySmall" style={{ opacity: 0.72, marginBottom: 8 }}>
          填写 SenseVoice 模型目录。目录下应包含 model.int8.onnx 和 tokens.txt。
        </Text>
        <TextInput
          mode="outlined"
          label="ASR 模型目录"
          value={settings.asrModelPath ?? ''}
          onChangeText={asrModelPath => patchSettings({ asrModelPath })}
          autoCapitalize="none"
          placeholder="/data/user/0/com.voicedairy/files/models/sensevoice"
        />

        <Text variant="titleMedium" style={{ marginTop: 20, marginBottom: 8, fontWeight: '700' }}>
          WebDAV
        </Text>
        <TextInput
          mode="outlined"
          label="WebDAV URL"
          value={settings.webdavUrl ?? ''}
          onChangeText={webdavUrl => patchSettings({ webdavUrl })}
          autoCapitalize="none"
        />
        <TextInput
          mode="outlined"
          label="WebDAV 用户名"
          value={settings.webdavUsername ?? ''}
          onChangeText={webdavUsername => patchSettings({ webdavUsername })}
          autoCapitalize="none"
          style={{ marginTop: 12 }}
        />
        <TextInput
          mode="outlined"
          label="WebDAV 密码"
          value={settings.webdavPassword ?? ''}
          onChangeText={webdavPassword => patchSettings({ webdavPassword })}
          secureTextEntry
          style={{ marginTop: 12 }}
        />

        <Text variant="titleMedium" style={{ marginTop: 20, marginBottom: 8, fontWeight: '700' }}>
          数据
        </Text>
        <Button mode="contained" onPress={handleSave} style={{ marginTop: 8 }}>
          保存设置
        </Button>
        <Button mode="outlined" onPress={handleExport} style={{ marginTop: 12 }}>
          生成 JSON 快照
        </Button>
        <Button mode="outlined" onPress={handleClear} style={{ marginTop: 12 }}>
          清空本地演示数据
        </Button>
      </ScrollView>

      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage('')} duration={2500}>
        {message}
      </Snackbar>
    </>
  );
}

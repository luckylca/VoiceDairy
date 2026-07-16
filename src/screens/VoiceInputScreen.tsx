import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, HelperText, Snackbar, Surface, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import type { AppSettings } from '../types/settings';
import { loadSettings } from '../services/settings/SettingsService';
import { organizeText } from '../services/llm/LlmService';
import { saveOrganizedResult } from '../services/records/CreateRecordService';
import { initAsr, startVoiceRecord, stopVoiceRecord } from '../services/asr/AsrService';

export function VoiceInputScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [recording, setRecording] = useState(false);
  const [asrReady, setAsrReady] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  async function ensureAsrReady() {
    if (asrReady) {
      return;
    }

    await initAsr({
      numThreads: 2,
      language: 'auto',
    });

    setAsrReady(true);
  }

  async function handleToggleRecord() {
    try {
      if (!recording) {
        setMessage('正在加载本地 SenseVoice 模型…');
        await ensureAsrReady();
        await startVoiceRecord();
        setRecording(true);
        setMessage('正在录音，音频只在手机本地处理。');
        return;
      }

      const result = await stopVoiceRecord();
      setRecording(false);
      setText(result.text);
      setMessage('本地识别完成，可以继续编辑。');
    } catch (error) {
      setRecording(false);
      setMessage(error instanceof Error ? error.message : '录音失败');
    }
  }

  async function handleOrganize() {
    if (!settings) {
      return;
    }
    if (!text.trim()) {
      setMessage('请先输入内容。');
      return;
    }

    setLoading(true);
    try {
      const result = await organizeText({
        text,
        settings,
        demoMode,
      });
      await saveOrganizedResult({
        rawText: text,
        source: 'text',
        result,
        modelName: demoMode ? 'demo' : settings.modelName,
      });
      navigation.goBack();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '整理失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Surface
          elevation={1}
          style={{ padding: 18, borderRadius: 20, backgroundColor: theme.colors.surface }}
        >
          <Text variant="titleLarge" style={{ fontWeight: '900' }}>
            说出你的想法
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
            使用内置 SenseVoice 模型离线转写，录音不会上传到云端。
          </Text>
          <Button
            mode={recording ? 'outlined' : 'contained'}
            icon={recording ? 'stop' : 'microphone-outline'}
            contentStyle={{ height: 52 }}
            style={{ marginTop: 18 }}
            onPress={handleToggleRecord}
          >
            {recording ? '停止并识别' : '开始录音'}
          </Button>
        </Surface>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18 }}>
          <Switch value={demoMode} onValueChange={setDemoMode} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text variant="titleSmall">演示整理模式</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              开启后不请求大模型 API，适合验证记录流程。
            </Text>
          </View>
        </View>

        <TextInput
          mode="outlined"
          label="识别文本或手动输入"
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={9}
          textAlignVertical="top"
          style={{ marginTop: 18, minHeight: 220 }}
          placeholder="例如：这个周末整理 RoboMaster 弹道检测参数，并把 WebDAV 同步方案写进项目文档。"
        />
        <HelperText type="info">关闭演示模式前，请先在设置中填写 API 地址、密钥和模型名。</HelperText>

        <Button
          mode="contained"
          icon="auto-fix"
          loading={loading}
          disabled={loading || !settings}
          onPress={handleOrganize}
          contentStyle={{ height: 52 }}
          style={{ marginTop: 12 }}
        >
          智能整理并保存
        </Button>
      </ScrollView>

      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage('')} duration={3500}>
        {message}
      </Snackbar>
    </View>
  );
}

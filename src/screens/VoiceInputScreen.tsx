import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, HelperText, Snackbar, Switch, Text, TextInput } from 'react-native-paper';
import type { AppSettings } from '../types/settings';
import { loadSettings } from '../services/settings/SettingsService';
import { organizeText } from '../services/llm/LlmService';
import { saveOrganizedResult } from '../services/records/CreateRecordService';
import { initAsr, startVoiceRecord, stopVoiceRecord } from '../services/asr/AsrService';

export function VoiceInputScreen() {
  const navigation = useNavigation<any>();
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
        setMessage('开始录音：16kHz mono PCM16，音频只在手机本地处理。');
        return;
      }

      const result = await stopVoiceRecord();
      setRecording(false);
      setText(result.text);
      setMessage('本地识别完成，可以继续编辑并整理。');
    } catch (error) {
      setRecording(false);
      setMessage(error instanceof Error ? error.message : '录音失败');
    }
  }

  async function handleOrganize() {
    if (!settings) return;
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
      setText('');
      setMessage(`已保存 ${result.items.length} 个条目。`);
      navigation.navigate('Home');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '整理失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
          快速记录
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 6, opacity: 0.72 }}>
          语音会通过 Android AudioRecord 采集，并使用应用内置的 SenseVoice 模型在手机端离线转写。
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
          <Switch value={demoMode} onValueChange={setDemoMode} />
          <Text style={{ marginLeft: 10 }}>演示整理模式（不请求 API）</Text>
        </View>

        <Button
          mode={recording ? 'outlined' : 'contained-tonal'}
          icon={recording ? 'stop' : 'microphone-outline'}
          style={{ marginTop: 16 }}
          onPress={handleToggleRecord}
        >
          {recording ? '停止录音' : '录音识别'}
        </Button>

        <TextInput
          mode="outlined"
          label="输入你的想法"
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={8}
          style={{ marginTop: 16, minHeight: 180 }}
          placeholder="例如：这个周末整理 RoboMaster 弹道检测参数，顺便把 WebDAV 同步方案写进项目文档。"
        />
        <HelperText type="info">没有配置 API Key 时建议保持演示模式，便于先验证主流程。</HelperText>

        <Button mode="contained" loading={loading} disabled={loading} onPress={handleOrganize} style={{ marginTop: 12 }}>
          智能整理并保存
        </Button>
      </ScrollView>

      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage('')} duration={3500}>
        {message}
      </Snackbar>
    </View>
  );
}

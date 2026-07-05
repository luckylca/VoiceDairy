import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, HelperText, Snackbar, Switch, Text, TextInput } from 'react-native-paper';
import type { AppSettings } from '../types/settings';
import { loadSettings } from '../services/settings/SettingsService';
import { organizeText } from '../services/llm/LlmService';
import { saveOrganizedResult } from '../services/records/CreateRecordService';
import { startVoiceRecord, stopVoiceRecord } from '../services/asr/AsrService';

export function VoiceInputScreen() {
  const navigation = useNavigation<any>();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  async function handleToggleRecord() {
    try {
      if (!recording) {
        await startVoiceRecord();
        setRecording(true);
        setMessage('开始录音。当前第一阶段使用 ASR 占位实现。');
        return;
      }

      const result = await stopVoiceRecord();
      setRecording(false);
      setText(result.text);
      setMessage('已获取识别文本，可以继续编辑后整理。');
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
          第一阶段先跑通文本输入和大模型整理；语音按钮已经预留 Native ASR 接口。
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

      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage('')} duration={2500}>
        {message}
      </Snackbar>
    </View>
  );
}

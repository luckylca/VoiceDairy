import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, HelperText, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import type { AppSettings } from '../types/settings';
import type { RecordSource } from '../types/record';
import { loadSettings } from '../services/settings/SettingsService';
import { organizeText } from '../services/llm/LlmService';
import { saveOrganizedResult } from '../services/records/CreateRecordService';
import { initAsr, startVoiceRecord, stopVoiceRecord } from '../services/asr/AsrService';
import { MotionTouchable } from '../components/MotionTouchable';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

export function VoiceInputScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [text, setText] = useState('');
  const [inputSource, setInputSource] = useState<RecordSource>('text');
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [recording, setRecording] = useState(false);
  const [asrReady, setAsrReady] = useState(false);

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
        showNotification({
          title: '正在准备离线识别',
          message: 'SenseVoice 模型只在手机本地运行。',
          icon: 'waveform',
          duration: 1800,
        });
        await ensureAsrReady();
        await startVoiceRecord();
        setRecording(true);
        showNotification({
          title: '正在录音',
          message: '再次点击按钮即可停止并识别。',
          kind: 'info',
          icon: 'microphone',
          duration: 2200,
        });
        return;
      }

      const result = await stopVoiceRecord();
      setRecording(false);
      setText(result.text);
      setInputSource('voice');
      showNotification({
        title: '本地识别完成',
        message: result.text ? '识别文本已经写入编辑框。' : '没有识别到清晰语音，请重试。',
        kind: result.text ? 'success' : 'warning',
        icon: result.text ? 'check-circle-outline' : 'microphone-outline',
      });
    } catch (error) {
      setRecording(false);
      showNotification({
        title: '录音或识别失败',
        message: error instanceof Error ? error.message : '请检查麦克风权限和模型文件。',
        kind: 'error',
      });
    }
  }

  async function handleOrganize() {
    if (!settings) {
      return;
    }
    if (!text.trim()) {
      showNotification({
        title: '还没有可整理的内容',
        message: '请先录音或输入一段文字。',
        kind: 'warning',
        icon: 'magnify',
      });
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
        source: inputSource,
        result,
        modelName: demoMode ? 'demo' : settings.modelName,
      });
      showNotification({
        title: '语音笔记已保存',
        message: `已整理为 ${result.items.length} 个可点击条目。`,
        kind: 'success',
        icon: 'check-circle-outline',
      });
      navigation.goBack();
    } catch (error) {
      showNotification({
        title: '整理失败',
        message: error instanceof Error ? error.message : '请检查 API 设置后重试。',
        kind: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            padding: 18,
            borderRadius: 22,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
          }}
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
            style={{ marginTop: 18, borderRadius: 14 }}
            rippleColor={theme.colors.primaryContainer}
            onPress={handleToggleRecord}
          >
            {recording ? '停止并识别' : '开始录音'}
          </Button>
        </View>

        <MotionTouchable
          onPress={() => setDemoMode(value => !value)}
          borderRadius={18}
          style={{ marginTop: 16 }}
          contentStyle={{
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 12,
            backgroundColor: theme.colors.surfaceVariant,
          }}
          accessibilityLabel={demoMode ? '关闭演示整理模式' : '开启演示整理模式'}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View pointerEvents="none">
              <Switch value={demoMode} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text variant="titleSmall">演示整理模式</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                开启后不请求大模型 API，适合验证记录流程。
              </Text>
            </View>
          </View>
        </MotionTouchable>

        <TextInput
          mode="outlined"
          label="识别文本或手动输入"
          value={text}
          onChangeText={value => {
            setText(value);
            if (!value.trim()) setInputSource('text');
          }}
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
          rippleColor={theme.colors.primaryContainer}
          contentStyle={{ height: 52 }}
          style={{ marginTop: 12, borderRadius: 14 }}
        >
          智能整理并保存
        </Button>
      </ScrollView>
    </View>
  );
}

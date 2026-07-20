import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Button, Icon, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import type { AppSettings } from '../types/settings';
import type { LlmOrganizeResult } from '../types/llm';
import type { RecordSource } from '../types/record';
import type { Entry } from '../types/entry';
import { defaultSettings, loadSettings } from '../services/settings/SettingsService';
import {
  initAsr,
  requestMicrophonePermission,
  startVoiceRecord,
  stopVoiceRecord,
  subscribeAsrAmplitude,
} from '../services/asr/AsrService';
import { organizeText } from '../services/llm/LlmService';
import { getLocalModelStatus } from '../services/llm/LocalModelService';
import { saveOrganizedResult } from '../services/records/CreateRecordService';
import { listEntries } from '../services/database/EntryRepository';
import { getTimelineGroup } from '../utils/date';
import { saveAgentDraft } from '../services/agent/AgentDraftService';
import { openMainTab } from '../navigation/MainTabController';
import { useMainTabActive } from '../navigation/MainTabActivityContext';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { TechScreen } from '../components/tech/TechScreen';
import { TechPanel } from '../components/tech/TechPanel';
import { TechButton } from '../components/tech/TechButton';
import { TechVoiceOrb, type VoiceOrbState } from '../components/tech/TechVoiceOrb';
import { TechWaveform } from '../components/tech/TechWaveform';
import { TechEntrance } from '../components/tech/TechMotion';
import { techTokens } from '../theme/tech/tokens';

type Phase = VoiceOrbState | 'editing';

const MAX_WAVEFORM_POINTS = 24;

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function buildRawResult(text: string): LlmOrganizeResult {
  const normalized = text.trim();
  const firstSentence = normalized.split(/[。！？\n]/)[0]?.trim();
  return {
    summary: firstSentence || '语音记录',
    items: [
      {
        type: 'note',
        title: (firstSentence || '语音记录').slice(0, 42),
        content: normalized,
        datetime: null,
        due_date: null,
        priority: 'normal',
        tags: [],
        project: null,
        confidence: 1,
      },
    ],
  };
}

function greetingText(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，记下此刻的想法';
  if (hour < 12) return '早上好，今天想记录什么？';
  if (hour < 18) return '下午好，把灵感留在这里';
  return '晚上好，回顾一下今天吧';
}

function RecordingAudioStage({
  state,
  durationText,
  disabled,
  onPress,
}: {
  state: VoiceOrbState;
  durationText?: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const tabActive = useMainTabActive();
  const [signal, setSignal] = useState<{ amplitude: number; waveform: number[] }>({
    amplitude: 0,
    waveform: [],
  });

  useEffect(() => {
    if (state !== 'recording' || !tabActive) {
      setSignal(previous =>
        previous.amplitude === 0 && previous.waveform.length === 0
          ? previous
          : { amplitude: 0, waveform: [] },
      );
      return;
    }

    return subscribeAsrAmplitude(event => {
      const level = Math.max(0, Math.min(1, event.amplitude));
      setSignal(current => ({
        amplitude: level,
        waveform: [...current.waveform.slice(-(MAX_WAVEFORM_POINTS - 1)), level],
      }));
    });
  }, [state, tabActive]);

  return (
    <>
      <TechVoiceOrb
        state={state}
        amplitude={signal.amplitude}
        durationText={durationText}
        disabled={disabled}
        onPress={onPress}
      />
      <TechEntrance index={1}>
        <TechWaveform
          levels={signal.waveform}
          amplitude={signal.amplitude}
          active={state === 'recording'}
          label={state === 'recognizing' ? 'BUFFER LOCKED · TRANSCRIBING' : 'LIVE PCM SIGNAL'}
        />
      </TechEntrance>
    </>
  );
}

export function QuickRecordScreen() {
  const theme = useTheme();
  const { isTech } = useVisualStyle();
  const { showNotification } = useFluidNotification();
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startInFlight = useRef(false);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [text, setText] = useState('');
  const [source, setSource] = useState<RecordSource>('voice');
  const [organizedResult, setOrganizedResult] = useState<LlmOrganizeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [todayEntries, setTodayEntries] = useState<Entry[]>([]);
  const [recentEntry, setRecentEntry] = useState<Entry | null>(null);

  const refreshSummary = useCallback(async () => {
    const entries = await listEntries();
    setTodayEntries(entries.filter(entry => getTimelineGroup(entry.createdAt) === '今天'));
    setRecentEntry(entries[0] ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then(setSettings);
      void refreshSummary();
    }, [refreshSummary]),
  );

  useEffect(() => {
    if (phase !== 'recording') return;
    const timer = setInterval(() => setSeconds(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'recording') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      showNotification({
        title: '录音仍在进行',
        message: '请先停止或取消录音，避免内容意外丢失。',
        kind: 'warning',
        icon: 'microphone-alert',
      });
      return true;
    });
    return () => subscription.remove();
  }, [phase, showNotification]);

  useEffect(
    () => () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    },
    [],
  );

  const orbState: VoiceOrbState = phase === 'editing' ? 'idle' : phase;
  const busy = phase === 'initializing' || phase === 'recognizing' || phase === 'organizing';

  async function startRecording() {
    if (startInFlight.current || busy || phase === 'recording') return;
    startInFlight.current = true;
    setErrorMessage('');
    setOrganizedResult(null);
    setText('');
    setSeconds(0);

    try {
      const granted = await requestMicrophonePermission();
      if (!granted) throw new Error('未获得麦克风权限，无法录音');

      setPhase('initializing');
      await initAsr({ numThreads: 2, language: 'auto' });
      await startVoiceRecord();
      setSource('voice');
      setPhase('recording');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '请检查麦克风权限和识别模型。');
      setPhase('error');
    } finally {
      startInFlight.current = false;
    }
  }

  async function organizeRecognizedText(rawText: string) {
    if (!rawText.trim()) return;
    setPhase('organizing');
    try {
      if (settings.organizerProvider === 'local') {
        const status = await getLocalModelStatus();
        if (!status.exists) {
          throw new Error('尚未下载本地 Qwen 模型，请先在设置中完成下载。');
        }
      }
      const result = await organizeText({ text: rawText, settings });
      setOrganizedResult(result);
      setPhase('editing');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '智能整理失败，请重试或直接保存原文。');
      setPhase('editing');
    }
  }

  async function stopAndRecognize() {
    if (phase !== 'recording') return;
    setPhase('recognizing');
    try {
      const result = await stopVoiceRecord();
      const recognized = result.text.trim();
      if (!recognized) {
        setErrorMessage('没有识别到清晰语音，请重新录制。');
        setPhase('error');
        return;
      }
      setText(recognized);
      setSource('voice');
      if (settings.autoOrganizeAfterRecognition) {
        await organizeRecognizedText(recognized);
      } else {
        setPhase('editing');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '本地识别失败，请重新录制。');
      setPhase('error');
    }
  }

  async function cancelRecording() {
    try {
      if (phase === 'recording') await stopVoiceRecord();
    } catch {
      // Discarding a failed stop is safe because no text has been saved yet.
    }
    resetToIdle();
  }

  function resetToIdle() {
    setPhase('idle');
    setSeconds(0);
    setText('');
    setOrganizedResult(null);
    setErrorMessage('');
  }

  async function saveResult(result: LlmOrganizeResult) {
    setPhase('organizing');
    try {
      const modelName = settings.organizerProvider === 'local' ? settings.localModelName : settings.modelName;
      await saveOrganizedResult({
        rawText: text,
        source,
        result,
        modelName: organizedResult ? modelName : undefined,
      });
      await refreshSummary();
      setPhase('success');
      successTimer.current = setTimeout(resetToIdle, 1700);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败，识别文字仍保留在编辑框中。');
      setPhase('editing');
    }
  }

  async function continueInAgent() {
    if (!text.trim()) return;
    await saveAgentDraft({
      rawText: text,
      organizedResult,
      createdAt: new Date().toISOString(),
    });
    openMainTab('agent');
  }

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }).format(new Date()),
    [],
  );

  const preview = organizedResult ? (
    <View style={{ marginTop: 14 }}>
      <Text variant="labelLarge" style={{ fontWeight: '900', color: isTech ? techTokens.colors.primary : theme.colors.primary }}>
        整理预览 · {organizedResult.items.length} 项
      </Text>
      {organizedResult.items.map((item, index) => (
        <TechEntrance key={`${item.type}-${index}`} index={index} from="right">
          <View
            style={[
              styles.previewItem,
              {
                backgroundColor: isTech ? 'rgba(85,217,255,0.06)' : theme.colors.surfaceVariant,
                borderColor: isTech ? techTokens.colors.line : theme.colors.outlineVariant,
              },
            ]}
          >
            <Text variant="labelSmall" style={{ color: isTech ? techTokens.colors.primary : theme.colors.primary }}>
              {item.type.toUpperCase()}
            </Text>
            <Text variant="titleSmall" style={{ marginTop: 4, fontWeight: '800', color: isTech ? techTokens.colors.text : theme.colors.onSurface }}>
              {item.title}
            </Text>
            {item.project ? (
              <Text variant="bodySmall" style={{ marginTop: 3, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>
                项目：{item.project}
              </Text>
            ) : null}
            {item.datetime || item.due_date ? (
              <Text variant="bodySmall" style={{ marginTop: 3, color: techTokens.colors.warning }}>
                时间：{item.datetime ?? item.due_date}
              </Text>
            ) : null}
          </View>
        </TechEntrance>
      ))}
      <Text variant="bodySmall" style={{ marginTop: 8, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>
        带时间的提醒会在你点击确认保存后才写入。
      </Text>
    </View>
  ) : null;

  const editor = isTech ? (
    <TechPanel accent index={1} style={{ marginTop: 18 }}>
      <Text style={styles.techSectionTitle}>检查识别文字</Text>
      <NativeTextInput
        multiline
        value={text}
        onChangeText={value => {
          setText(value);
          setOrganizedResult(null);
          setSource(value.trim() ? source : 'text');
        }}
        placeholder="识别文字会显示在这里"
        placeholderTextColor={techTokens.colors.textMuted}
        textAlignVertical="top"
        style={styles.techInput}
      />
      {errorMessage ? <Text style={styles.techError}>{errorMessage}</Text> : null}
      {preview}
      <View style={styles.techActionStack}>
        <TechButton
          label={organizedResult ? '确认保存整理结果' : '智能整理'}
          icon={organizedResult ? 'check-circle-outline' : 'creation'}
          disabled={!text.trim() || busy}
          onPress={() => (organizedResult ? saveResult(organizedResult) : organizeRecognizedText(text))}
        />
        <View style={styles.actionRow}>
          <TechButton
            label="直接保存原文"
            variant="ghost"
            icon="content-save-outline"
            disabled={!text.trim() || busy}
            onPress={() => saveResult(buildRawResult(text))}
            style={{ flex: 1 }}
          />
          <TechButton
            label="转到 Agent"
            variant="secondary"
            icon="message-processing-outline"
            disabled={!text.trim() || busy}
            onPress={continueInAgent}
            style={{ flex: 1 }}
          />
        </View>
        <TechButton label="重新录制" variant="danger" icon="restart" onPress={resetToIdle} />
      </View>
    </TechPanel>
  ) : (
    <Surface style={[styles.classicEditor, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <Text variant="titleLarge" style={{ fontWeight: '900' }}>检查识别文字</Text>
      <TextInput
        mode="outlined"
        multiline
        numberOfLines={8}
        value={text}
        onChangeText={value => {
          setText(value);
          setOrganizedResult(null);
        }}
        textAlignVertical="top"
        style={{ marginTop: 14, minHeight: 190 }}
      />
      {errorMessage ? <Text style={{ marginTop: 8, color: theme.colors.error }}>{errorMessage}</Text> : null}
      {preview}
      <Button
        mode="contained"
        icon={organizedResult ? 'check-circle-outline' : 'auto-fix'}
        disabled={!text.trim() || busy}
        onPress={() => (organizedResult ? saveResult(organizedResult) : organizeRecognizedText(text))}
        style={{ marginTop: 16 }}
      >
        {organizedResult ? '确认保存整理结果' : '智能整理'}
      </Button>
      <Button mode="outlined" icon="content-save-outline" onPress={() => saveResult(buildRawResult(text))} style={{ marginTop: 10 }}>
        直接保存原文
      </Button>
      <Button mode="text" icon="message-processing-outline" onPress={continueInAgent} style={{ marginTop: 4 }}>
        转到 Agent 继续讨论
      </Button>
      <Button mode="text" textColor={theme.colors.error} icon="restart" onPress={resetToIdle}>
        重新录制
      </Button>
    </Surface>
  );

  const summaryPanel = isTech ? (
    <TechEntrance index={3}>
      <View style={styles.summaryRow}>
        <Pressable onPress={() => openMainTab('timeline')} style={{ flex: 1 }}>
          <View style={[styles.summaryItem, styles.techSummaryItem, { borderColor: techTokens.colors.line }]}>
            <View style={styles.summaryStatusLine} />
            <Text variant="labelSmall" style={{ color: techTokens.colors.textMuted }}>今日记录</Text>
            <Text variant="headlineSmall" style={{ marginTop: 4, fontWeight: '900', color: techTokens.colors.text }}>
              {todayEntries.length}
            </Text>
            <Text style={styles.summaryCode}>TODAY.LOG</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => openMainTab('timeline')} style={{ flex: 2, marginLeft: 10 }}>
          <View style={[styles.summaryItem, styles.techSummaryItem, { borderColor: techTokens.colors.line }]}>
            <View style={[styles.summaryStatusLine, { backgroundColor: techTokens.colors.secondary }]} />
            <Text variant="labelSmall" style={{ color: techTokens.colors.textMuted }}>最近一条</Text>
            <Text numberOfLines={1} variant="titleSmall" style={{ marginTop: 6, fontWeight: '800', color: techTokens.colors.text }}>
              {recentEntry?.title ?? '还没有记录'}
            </Text>
            <Text style={styles.summaryCode}>LAST.ENTRY</Text>
          </View>
        </Pressable>
      </View>
    </TechEntrance>
  ) : (
    <View style={styles.summaryRow}>
      <Pressable onPress={() => openMainTab('timeline')} style={{ flex: 1 }}>
        <View style={[styles.summaryItem, { borderColor: theme.colors.outlineVariant }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>今日记录</Text>
          <Text variant="headlineSmall" style={{ marginTop: 4, fontWeight: '900', color: theme.colors.onSurface }}>
            {todayEntries.length}
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={() => openMainTab('timeline')} style={{ flex: 2, marginLeft: 10 }}>
        <View style={[styles.summaryItem, { borderColor: theme.colors.outlineVariant }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>最近一条</Text>
          <Text numberOfLines={1} variant="titleSmall" style={{ marginTop: 6, fontWeight: '800', color: theme.colors.onSurface }}>
            {recentEntry?.title ?? '还没有记录'}
          </Text>
        </View>
      </Pressable>
    </View>
  );

  if (isTech) {
    return (
      <TechScreen>
        <ScrollView contentContainerStyle={styles.techContent} showsVerticalScrollIndicator={false}>
          <TechEntrance from="top">
            <View style={styles.techHeaderRow}>
              <View>
                <Text style={styles.techDate}>{dateLabel}</Text>
                <Text style={styles.techTitle}>{greetingText()}</Text>
                <Text style={styles.techSubtitle}>SPEAK · REMEMBER · ACT</Text>
              </View>
              <View style={styles.systemBadge}>
                <View style={styles.systemDot} />
                <Text style={styles.systemBadgeText}>ONLINE</Text>
              </View>
            </View>
          </TechEntrance>

          {phase === 'editing' ? editor : (
            <>
              <RecordingAudioStage
                state={orbState}
                durationText={phase === 'recording' ? formatDuration(seconds) : undefined}
                disabled={busy || phase === 'success'}
                onPress={() => {
                  if (phase === 'recording') void stopAndRecognize();
                  else if (phase === 'idle' || phase === 'error') void startRecording();
                }}
              />
              {phase === 'recording' ? (
                <TechButton label="取消本次录音" variant="danger" icon="close" onPress={cancelRecording} style={{ marginTop: 12 }} />
              ) : null}
              {errorMessage && phase === 'error' ? <Text style={styles.techErrorCentered}>{errorMessage}</Text> : null}
            </>
          )}

          {summaryPanel}
          <TechButton
            label="进入 Agent 处理复杂任务"
            variant="secondary"
            icon="message-processing-outline"
            onPress={() => openMainTab('agent')}
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      </TechScreen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.classicContent} showsVerticalScrollIndicator={false}>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>{dateLabel}</Text>
        <Text variant="headlineMedium" style={{ marginTop: 5, fontWeight: '900' }}>{greetingText()}</Text>
        <Text variant="bodyMedium" style={{ marginTop: 5, color: theme.colors.onSurfaceVariant }}>
          会听、会整理、会行动的个人语音日记
        </Text>

        {phase === 'editing' ? editor : (
          <Surface style={[styles.classicOrbPanel, { backgroundColor: theme.colors.surface }]} elevation={1}>
            {busy ? <ActivityIndicator size={40} /> : (
              <Pressable
                onPress={() => {
                  if (phase === 'recording') void stopAndRecognize();
                  else if (phase === 'idle' || phase === 'error') void startRecording();
                }}
                style={[
                  styles.classicOrb,
                  { backgroundColor: phase === 'recording' ? theme.colors.errorContainer : theme.colors.primaryContainer },
                ]}
              >
                <Icon
                  source={phase === 'recording' ? 'stop' : phase === 'success' ? 'check-bold' : 'microphone-outline'}
                  size={58}
                  color={phase === 'recording' ? theme.colors.onErrorContainer : theme.colors.onPrimaryContainer}
                />
              </Pressable>
            )}
            <Text variant="titleMedium" style={{ marginTop: 18, fontWeight: '900' }}>
              {phase === 'recording'
                ? `${formatDuration(seconds)} · 再次点击停止`
                : phase === 'initializing'
                  ? '正在准备本地识别'
                  : phase === 'recognizing'
                    ? '正在本地识别'
                    : phase === 'organizing'
                      ? '正在智能整理'
                      : phase === 'success'
                        ? '记录已保存'
                        : phase === 'error'
                          ? '点击重新录制'
                          : '点击开始记录'}
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>SenseVoice 在手机本地运行</Text>
            {phase === 'recording' ? <Button textColor={theme.colors.error} onPress={cancelRecording}>取消录音</Button> : null}
            {errorMessage && phase === 'error' ? <Text style={{ marginTop: 10, color: theme.colors.error, textAlign: 'center' }}>{errorMessage}</Text> : null}
          </Surface>
        )}

        {summaryPanel}
        <Button mode="outlined" icon="message-processing-outline" onPress={() => openMainTab('agent')} style={{ marginTop: 12 }}>
          进入 Agent 处理复杂任务
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  techContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 38,
  },
  techHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  techDate: {
    color: techTokens.colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.1,
  },
  techTitle: {
    marginTop: 7,
    color: techTokens.colors.text,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '900',
  },
  techSubtitle: {
    marginTop: 7,
    color: techTokens.colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.65,
  },
  systemBadge: {
    marginTop: 2,
    minHeight: 28,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    borderRadius: 9,
    backgroundColor: 'rgba(82,230,184,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: techTokens.colors.success,
    marginRight: 6,
  },
  systemBadgeText: {
    color: techTokens.colors.success,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  techSectionTitle: {
    color: techTokens.colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  techInput: {
    minHeight: 180,
    marginTop: 14,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    borderRadius: techTokens.radius.md,
    backgroundColor: 'rgba(2,11,17,0.56)',
    color: techTokens.colors.text,
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  techError: {
    marginTop: 9,
    color: techTokens.colors.error,
    lineHeight: 20,
  },
  techErrorCentered: {
    color: techTokens.colors.error,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 5,
  },
  techActionStack: {
    marginTop: 18,
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  classicContent: {
    padding: 18,
    paddingTop: 24,
    paddingBottom: 40,
  },
  classicOrbPanel: {
    marginTop: 24,
    padding: 24,
    minHeight: 350,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classicOrb: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classicEditor: {
    marginTop: 20,
    padding: 18,
    borderRadius: 24,
  },
  previewItem: {
    marginTop: 9,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
  summaryItem: {
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  techSummaryItem: {
    backgroundColor: 'rgba(7,23,32,0.78)',
  },
  summaryStatusLine: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 2,
    backgroundColor: techTokens.colors.primary,
  },
  summaryCode: {
    position: 'absolute',
    right: 9,
    bottom: 7,
    color: 'rgba(143,168,181,0.36)',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});

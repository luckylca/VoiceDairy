import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Icon, Text, TextInput, useTheme } from 'react-native-paper';
import type { AgentAction, AgentMessage, ActionExecutionResult } from '../types/agent';
import type { AppSettings } from '../types/settings';
import { defaultSettings, loadSettings } from '../services/settings/SettingsService';
import { organizeText } from '../services/llm/LlmService';
import { initAsr, startVoiceRecord, stopVoiceRecord } from '../services/asr/AsrService';
import { parseOrganizedResultForAgent } from '../services/agent/AgentResponseParser';
import { executeAgentAction } from '../services/agent/ActionExecutor';
import {
  clearCurrentAgentSession,
  loadCurrentAgentSession,
  saveCurrentAgentSession,
} from '../services/agent/AgentSessionRepository';
import {
  consumeAgentDraft,
  subscribeAgentDraft,
} from '../services/agent/AgentDraftService';
import { createId } from '../utils/id';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { TechScreen } from '../components/tech/TechScreen';
import { TechPanel } from '../components/tech/TechPanel';
import { TechButton } from '../components/tech/TechButton';
import { techTokens } from '../theme/tech/tokens';

function actionTypeLabel(action: AgentAction): string {
  const labels: Record<AgentAction['type'], string> = {
    create_idea: '创建想法',
    create_todo: '创建待办',
    create_reminder: '创建提醒',
    create_project_update: '创建项目进展',
    create_project_requirement: '添加项目需求',
    complete_project_requirement: '完成项目需求',
  };
  return labels[action.type];
}

export function AgentScreen() {
  const theme = useTheme();
  const { isTech } = useVisualStyle();
  const { showNotification } = useFluidNotification();
  const listRef = useRef<FlatList<AgentMessage>>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [asrReady, setAsrReady] = useState(false);
  const [pendingClarification, setPendingClarification] = useState<string | null>(null);

  const replaceMessages = useCallback((updater: (current: AgentMessage[]) => AgentMessage[]) => {
    setMessages(current => {
      const next = updater(current);
      void saveCurrentAgentSession(next);
      return next;
    });
  }, []);

  const importDraft = useCallback(async () => {
    const draft = await consumeAgentDraft();
    if (!draft) return;

    const userMessage: AgentMessage = {
      id: createId('agent_message'),
      role: 'user',
      content: draft.rawText,
      createdAt: draft.createdAt,
      source: 'voice',
    };

    if (!draft.organizedResult) {
      replaceMessages(current => [...current, userMessage]);
      setInput(draft.rawText);
      return;
    }

    const parsed = parseOrganizedResultForAgent(draft.organizedResult);
    const assistantMessage: AgentMessage = {
      id: createId('agent_message'),
      role: 'assistant',
      content: parsed.clarificationQuestion
        ? `${parsed.reply}\n${parsed.clarificationQuestion}`
        : parsed.reply,
      createdAt: new Date().toISOString(),
      responseState: parsed.clarificationQuestion ? 'needs_clarification' : 'awaiting_confirmation',
      actions: parsed.actions,
      rawRequest: draft.rawText,
    };
    if (parsed.clarificationQuestion) setPendingClarification(draft.rawText);
    replaceMessages(current => [...current, userMessage, assistantMessage]);
  }, [replaceMessages]);

  useEffect(() => {
    void (async () => {
      const [savedMessages, currentSettings] = await Promise.all([
        loadCurrentAgentSession(),
        loadSettings(),
      ]);
      setMessages(savedMessages);
      setSettings(currentSettings);
      await importDraft();
    })();

    return subscribeAgentDraft(() => {
      void importDraft();
    });
  }, [importDraft]);

  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages, sending]);

  async function ensureAsrReady() {
    if (asrReady) return;
    await initAsr({ numThreads: 2, language: 'auto' });
    setAsrReady(true);
  }

  async function handleVoiceInput() {
    try {
      if (!recording) {
        await ensureAsrReady();
        await startVoiceRecord();
        setRecording(true);
        return;
      }

      const result = await stopVoiceRecord();
      setRecording(false);
      if (!result.text.trim()) {
        showNotification({
          title: '没有识别到清晰语音',
          message: '请靠近麦克风后重新录制。',
          kind: 'warning',
          icon: 'microphone-outline',
        });
        return;
      }
      setInput(result.text);
      showNotification({
        title: '语音已转为文字',
        message: '默认不会自动发送，你可以修改后再提交。',
        kind: 'success',
        icon: 'text-box-check-outline',
      });
      if (settings.agentAutoSendVoice) {
        await handleSend(result.text, 'voice');
      }
    } catch (error) {
      setRecording(false);
      showNotification({
        title: 'Agent 语音输入失败',
        message: error instanceof Error ? error.message : '请检查麦克风权限和本地识别模型。',
        kind: 'error',
      });
    }
  }

  async function handleSend(forcedText?: string, source: 'text' | 'voice' = 'text') {
    const text = (forcedText ?? input).trim();
    if (!text || sending) return;

    const userMessage: AgentMessage = {
      id: createId('agent_message'),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      source,
    };
    replaceMessages(current => [...current, userMessage]);
    setInput('');
    setSending(true);

    try {
      const requestText = pendingClarification
        ? `${pendingClarification}\n用户补充：${text}`
        : text;
      const result = await organizeText({ text: requestText, settings });
      const parsed = parseOrganizedResultForAgent(result);
      const responseState = parsed.clarificationQuestion
        ? 'needs_clarification'
        : parsed.actions.length > 0
          ? 'awaiting_confirmation'
          : 'reply_only';
      const assistantMessage: AgentMessage = {
        id: createId('agent_message'),
        role: 'assistant',
        content: parsed.clarificationQuestion
          ? `${parsed.reply}\n${parsed.clarificationQuestion}`
          : parsed.reply,
        createdAt: new Date().toISOString(),
        responseState,
        actions: parsed.actions,
        rawRequest: requestText,
      };
      setPendingClarification(parsed.clarificationQuestion ? requestText : null);
      replaceMessages(current => [...current, assistantMessage]);
    } catch (error) {
      replaceMessages(current => [
        ...current,
        {
          id: createId('agent_message'),
          role: 'assistant',
          content: `处理失败：${error instanceof Error ? error.message : '请检查模型设置后重试。'}`,
          createdAt: new Date().toISOString(),
          responseState: 'reply_only',
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function updateAction(messageId: string, actionId: string, patch: Partial<AgentAction>) {
    replaceMessages(current =>
      current.map(message =>
        message.id !== messageId
          ? message
          : {
              ...message,
              actions: message.actions?.map(action =>
                action.id === actionId ? { ...action, ...patch } : action,
              ),
            },
      ),
    );
  }

  function appendExecutionResult(messageId: string, result: ActionExecutionResult) {
    replaceMessages(current =>
      current.map(message =>
        message.id !== messageId
          ? message
          : {
              ...message,
              executionResults: [...(message.executionResults ?? []), result],
              responseState: result.success ? 'completed' : message.responseState,
            },
      ),
    );
  }

  async function confirmAction(messageId: string, action: AgentAction) {
    updateAction(messageId, action.id, { status: 'executing' });
    const modelName = settings.organizerProvider === 'local' ? settings.localModelName : settings.modelName;
    const result = await executeAgentAction(action, { modelName });
    updateAction(messageId, action.id, { status: result.success ? 'success' : 'failed' });
    appendExecutionResult(messageId, result);
    showNotification({
      title: result.success ? 'Agent 操作已完成' : 'Agent 操作未执行',
      message: result.message,
      kind: result.success ? 'success' : 'error',
      icon: result.success ? 'check-circle-outline' : 'alert-circle-outline',
    });
  }

  async function clearSession() {
    await clearCurrentAgentSession();
    setMessages([]);
    setPendingClarification(null);
  }

  const renderActionCard = (messageId: string, action: AgentAction) => {
    const result = messages
      .find(message => message.id === messageId)
      ?.executionResults?.find(item => item.actionId === action.id);
    const executing = action.status === 'executing';
    const completed = action.status === 'success';
    const cancelled = action.status === 'cancelled';

    if (isTech) {
      return (
        <TechPanel key={action.id} accent style={{ marginTop: 10 }}>
          <View style={styles.actionHeader}>
            <Text style={styles.techActionType}>{actionTypeLabel(action)}</Text>
            <Text style={[styles.techActionStatus, completed && { color: techTokens.colors.success }]}>
              {action.status === 'pending'
                ? '待确认'
                : action.status === 'executing'
                  ? '执行中'
                  : action.status === 'success'
                    ? '执行成功'
                    : action.status === 'failed'
                      ? '执行失败'
                      : '已取消'}
            </Text>
          </View>
          <Text style={styles.techActionTitle}>{action.title}</Text>
          <Text style={styles.techActionDescription}>{action.description}</Text>
          {action.projectName ? <Text style={styles.techActionMeta}>项目：{action.projectName}</Text> : null}
          {action.datetime || action.dueDate ? (
            <Text style={[styles.techActionMeta, { color: techTokens.colors.warning }]}>时间：{action.datetime ?? action.dueDate}</Text>
          ) : null}
          {result ? <Text style={[styles.techResult, { color: result.success ? techTokens.colors.success : techTokens.colors.error }]}>{result.message}</Text> : null}
          {!completed && !cancelled ? (
            <View style={styles.actionButtons}>
              <TechButton
                label="确认"
                icon="check"
                disabled={executing}
                onPress={() => void confirmAction(messageId, action)}
                style={{ flex: 1 }}
              />
              <TechButton
                label="取消"
                icon="close"
                variant="ghost"
                disabled={executing}
                onPress={() => updateAction(messageId, action.id, { status: 'cancelled' })}
                style={{ flex: 1 }}
              />
            </View>
          ) : null}
        </TechPanel>
      );
    }

    return (
      <View key={action.id} style={[styles.classicActionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <View style={styles.actionHeader}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '900' }}>{actionTypeLabel(action)}</Text>
          <Text variant="labelSmall" style={{ color: completed ? theme.colors.primary : theme.colors.onSurfaceVariant }}>
            {action.status === 'pending' ? '待确认' : action.status === 'executing' ? '执行中' : action.status === 'success' ? '执行成功' : action.status === 'failed' ? '执行失败' : '已取消'}
          </Text>
        </View>
        <Text variant="titleMedium" style={{ marginTop: 8, fontWeight: '900' }}>{action.title}</Text>
        <Text variant="bodyMedium" style={{ marginTop: 5, color: theme.colors.onSurfaceVariant }}>{action.description}</Text>
        {action.projectName ? <Text variant="bodySmall" style={{ marginTop: 7 }}>项目：{action.projectName}</Text> : null}
        {action.datetime || action.dueDate ? <Text variant="bodySmall" style={{ marginTop: 5, color: theme.colors.tertiary }}>时间：{action.datetime ?? action.dueDate}</Text> : null}
        {result ? <Text variant="bodySmall" style={{ marginTop: 8, color: result.success ? theme.colors.primary : theme.colors.error }}>{result.message}</Text> : null}
        {!completed && !cancelled ? (
          <View style={styles.actionButtons}>
            <Button mode="contained" loading={executing} disabled={executing} onPress={() => void confirmAction(messageId, action)} style={{ flex: 1 }}>确认</Button>
            <Button mode="outlined" disabled={executing} onPress={() => updateAction(messageId, action.id, { status: 'cancelled' })} style={{ flex: 1 }}>取消</Button>
          </View>
        ) : null}
      </View>
    );
  };

  const messageList = (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: isTech ? 'rgba(85,217,255,0.12)' : theme.colors.primaryContainer }]}>
            <Icon source="message-processing-outline" size={34} color={isTech ? techTokens.colors.primary : theme.colors.onPrimaryContainer} />
          </View>
          <Text variant="titleLarge" style={{ marginTop: 16, fontWeight: '900', color: isTech ? techTokens.colors.text : theme.colors.onSurface }}>
            和 VoiceDiary Agent 对话
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 8, textAlign: 'center', lineHeight: 22, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>
            描述想法、待办、提醒或项目进展。Agent 会先生成操作卡片，只有你确认后才会修改数据。
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const isUser = item.role === 'user';
        return (
          <View style={{ marginTop: 12 }}>
            <View style={[styles.messageRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: isTech
                      ? isUser
                        ? 'rgba(85, 217, 255, 0.16)'
                        : 'rgba(17, 36, 49, 0.86)'
                      : isUser
                        ? theme.colors.primaryContainer
                        : theme.colors.surface,
                    borderColor: isTech ? techTokens.colors.line : theme.colors.outlineVariant,
                  },
                ]}
              >
                <Text style={{ color: isTech ? techTokens.colors.text : theme.colors.onSurface, lineHeight: 22 }}>{item.content}</Text>
                <Text variant="labelSmall" style={{ marginTop: 6, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>
                  {new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  {item.source === 'voice' ? ' · 语音' : ''}
                </Text>
              </View>
            </View>
            {item.actions?.map(action => renderActionCard(item.id, action))}
          </View>
        );
      }}
      ListFooterComponent={
        sending ? (
          <View style={styles.thinkingRow}>
            <ActivityIndicator size={18} color={isTech ? techTokens.colors.primary : theme.colors.primary} />
            <Text style={{ marginLeft: 9, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>
              正在理解内容并生成待确认操作…
            </Text>
          </View>
        ) : null
      }
    />
  );

  const inputBar = isTech ? (
    <View style={styles.techInputBar}>
      <Pressable onPress={() => void handleVoiceInput()} style={[styles.voiceButton, recording && { borderColor: techTokens.colors.error }]}>
        <Icon source={recording ? 'stop' : 'microphone-outline'} size={23} color={recording ? techTokens.colors.error : techTokens.colors.primary} />
      </Pressable>
      <NativeTextInput
        multiline
        value={input}
        onChangeText={setInput}
        placeholder={recording ? '正在录音，再次点击麦克风停止' : '输入消息或补充信息'}
        placeholderTextColor={techTokens.colors.textMuted}
        style={styles.techMessageInput}
        editable={!sending && !recording}
      />
      <Pressable disabled={sending || recording || !input.trim()} onPress={() => void handleSend()} style={[styles.sendButton, (!input.trim() || sending || recording) && { opacity: 0.35 }]}>
        <Icon source="send" size={22} color={techTokens.colors.backgroundDeep} />
      </Pressable>
    </View>
  ) : (
    <View style={[styles.classicInputBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <Button compact icon={recording ? 'stop' : 'microphone-outline'} textColor={recording ? theme.colors.error : theme.colors.primary} onPress={() => void handleVoiceInput()}>
        {recording ? '停止' : ''}
      </Button>
      <TextInput
        mode="outlined"
        multiline
        value={input}
        onChangeText={setInput}
        placeholder={recording ? '正在录音…' : '输入消息'}
        style={{ flex: 1, maxHeight: 120 }}
        disabled={sending || recording}
      />
      <Button mode="contained" icon="send" disabled={sending || recording || !input.trim()} onPress={() => void handleSend()} style={{ marginLeft: 8 }}>
        发送
      </Button>
    </View>
  );

  const content = (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { borderBottomColor: isTech ? techTokens.colors.line : theme.colors.outlineVariant }]}>
        <View style={{ flex: 1 }}>
          <Text variant="titleLarge" style={{ fontWeight: '900', color: isTech ? techTokens.colors.text : theme.colors.onSurface }}>Agent</Text>
          <Text variant="bodySmall" style={{ marginTop: 3, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>
            先预览，确认后执行
          </Text>
        </View>
        <Button compact onPress={() => void clearSession()} disabled={sending || messages.length === 0} textColor={isTech ? techTokens.colors.textMuted : undefined}>
          清空
        </Button>
      </View>
      {messageList}
      {inputBar}
    </KeyboardAvoidingView>
  );

  return isTech ? <TechScreen ambient>{content}</TechScreen> : <View style={{ flex: 1, backgroundColor: theme.colors.background }}>{content}</View>;
}

const styles = StyleSheet.create({
  header: {
    minHeight: 74,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
  },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 19,
    borderWidth: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classicActionCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
  },
  actionButtons: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  techActionType: {
    color: techTokens.colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  techActionStatus: {
    color: techTokens.colors.warning,
    fontSize: 11,
    fontWeight: '800',
  },
  techActionTitle: {
    marginTop: 9,
    color: techTokens.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  techActionDescription: {
    marginTop: 6,
    color: techTokens.colors.textMuted,
    lineHeight: 21,
  },
  techActionMeta: {
    marginTop: 7,
    color: techTokens.colors.textMuted,
    fontSize: 12,
  },
  techResult: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 19,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  techInputBar: {
    borderTopWidth: 1,
    borderTopColor: techTokens.colors.line,
    backgroundColor: 'rgba(4, 13, 20, 0.96)',
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 11,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  voiceButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techMessageInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    marginHorizontal: 9,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: techTokens.colors.line,
    backgroundColor: 'rgba(15, 35, 47, 0.82)',
    color: techTokens.colors.text,
    fontSize: 15,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: techTokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classicInputBar: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 11,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});

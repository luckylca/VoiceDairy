import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Button, Icon, Text, TextInput, useTheme } from 'react-native-paper';
import type { RootStackParamList } from '../navigation/types';
import type { AppSettings } from '../types/settings';
import { defaultSettings, loadSettings } from '../services/settings/SettingsService';
import { listProjects } from '../services/database/ProjectRepository';
import {
  chatWithLocalModel,
  getLocalModelStatus,
  type LocalChatMessage,
  type LocalModelStatus,
} from '../services/llm/LocalModelService';
import { createId } from '../utils/id';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

 type Props = NativeStackScreenProps<RootStackParamList, 'LocalModelChat'>;

type UiMessage = LocalChatMessage & {
  id: string;
  completedLabels?: string[];
};

const WELCOME_MESSAGE: UiMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '你可以问我当前有哪些项目、某个项目还剩哪些需求，也可以直接说“VoiceDairy 的本地模型对话页面已经完成了”。只有在你明确表示完成时，我才会勾选对应需求。',
};

export function LocalModelChatScreen({ navigation }: Props) {
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
  const listRef = useRef<FlatList<UiMessage>>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [status, setStatus] = useState<LocalModelStatus | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [requirementCount, setRequirementCount] = useState(0);
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const refreshContext = useCallback(async () => {
    const [nextSettings, nextStatus, projects] = await Promise.all([
      loadSettings(),
      getLocalModelStatus(),
      listProjects(),
    ]);
    setSettings(nextSettings);
    setStatus(nextStatus);
    setProjectCount(projects.length);
    setRequirementCount(projects.reduce((total, project) => total + project.requirements.length, 0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshContext();
    }, [refreshContext]),
  );

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    if (!status?.exists) {
      showNotification({
        title: '尚未下载本地模型',
        message: '请先返回本地模型管理页面完成下载。',
        kind: 'warning',
        icon: 'download-outline',
      });
      return;
    }

    const history: LocalChatMessage[] = messages
      .filter(message => message.id !== 'welcome')
      .map(message => ({ role: message.role, content: message.content }));
    const userMessage: UiMessage = { id: createId('chat'), role: 'user', content: text };
    setMessages(previous => [...previous, userMessage]);
    setInput('');
    setSending(true);

    try {
      const result = await chatWithLocalModel(text, history, settings);
      const completedLabels = result.completedRequirements.map(
        requirement => `${requirement.projectName} · ${requirement.title}`,
      );
      setMessages(previous => [
        ...previous,
        {
          id: createId('chat'),
          role: 'assistant',
          content: result.reply,
          completedLabels,
        },
      ]);
      if (completedLabels.length > 0) {
        showNotification({
          title: `已完成 ${completedLabels.length} 条项目需求`,
          message: completedLabels.join('；'),
          kind: 'success',
          icon: 'checkbox-marked-circle-outline',
          duration: 6000,
        });
        await refreshContext();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '本地模型对话失败';
      setMessages(previous => [
        ...previous,
        {
          id: createId('chat'),
          role: 'assistant',
          content: `对话失败：${message}`,
        },
      ]);
      showNotification({
        title: '本地模型对话失败',
        message,
        kind: 'error',
        duration: 8000,
      });
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  function clearConversation() {
    setMessages([WELCOME_MESSAGE]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.contextCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={[styles.contextIcon, { backgroundColor: theme.colors.primaryContainer }]}> 
          <Icon source="brain" size={25} color={theme.colors.onPrimaryContainer} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text variant="titleMedium" style={{ fontWeight: '900' }}>
            本地项目助手
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 3, color: theme.colors.onSurfaceVariant }}>
            {projectCount} 个项目 · {requirementCount} 条需求 · {status?.loaded ? '模型已加载' : '发送时自动加载'}
          </Text>
        </View>
        <Button compact onPress={clearConversation} disabled={sending}>
          清空
        </Button>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View style={[styles.messageRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}> 
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: isUser ? theme.colors.primary : theme.colors.surface,
                    borderColor: isUser ? theme.colors.primary : theme.colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  variant="bodyLarge"
                  style={{ color: isUser ? theme.colors.onPrimary : theme.colors.onSurface, lineHeight: 23 }}
                >
                  {item.content}
                </Text>
                {item.completedLabels?.length ? (
                  <View style={[styles.actionBox, { backgroundColor: theme.colors.secondaryContainer }]}> 
                    <Text variant="labelMedium" style={{ color: theme.colors.onSecondaryContainer, fontWeight: '800' }}>
                      已自动勾选
                    </Text>
                    {item.completedLabels.map(label => (
                      <Text key={label} variant="bodySmall" style={{ marginTop: 3, color: theme.colors.onSecondaryContainer }}>
                        ✓ {label}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          sending ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
              <ActivityIndicator size={18} />
              <Text variant="bodySmall" style={{ marginLeft: 8, color: theme.colors.onSurfaceVariant }}>
                本地 Qwen 正在读取项目上下文并生成回复…
              </Text>
            </View>
          ) : null
        }
      />

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <TextInput
          mode="outlined"
          placeholder="询问项目，或说明某条需求已完成"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1200}
          style={{ flex: 1, maxHeight: 120 }}
          disabled={sending}
        />
        <Button
          mode="contained"
          icon="send"
          onPress={handleSend}
          disabled={sending || !input.trim()}
          style={{ marginLeft: 10, borderRadius: 14 }}
          contentStyle={{ minHeight: 50 }}
        >
          发送
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contextCard: {
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
    marginTop: 10,
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  actionBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 13,
  },
  inputBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});

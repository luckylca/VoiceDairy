import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import type { AppSettings } from '../types/settings';
import { DEFAULT_SYSTEM_PROMPT } from '../services/llm/PromptBuilder';
import { loadSettings, saveSettings } from '../services/settings/SettingsService';

export function PromptSettingsScreen() {
  const navigation = useNavigation<any>();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings().then(current => {
      setSettings(current);
      setPrompt(current.systemPrompt);
    });
  }, []);

  async function handleSave() {
    if (!settings) {
      return;
    }

    setSaving(true);
    try {
      await saveSettings({
        ...settings,
        systemPrompt: prompt.trim() || DEFAULT_SYSTEM_PROMPT,
      });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text variant="titleLarge" style={{ fontWeight: '800' }}>
        整理提示词
      </Text>
      <Text variant="bodyMedium" style={{ marginTop: 8, opacity: 0.72 }}>
        这里的提示词决定大模型如何把语音文本拆分成想法、待办、提醒、笔记和项目记录。
      </Text>

      <TextInput
        mode="outlined"
        label="系统提示词"
        value={prompt}
        onChangeText={setPrompt}
        multiline
        numberOfLines={18}
        textAlignVertical="top"
        style={{ marginTop: 20, minHeight: 360 }}
      />
      <HelperText type="info">
        建议保留 JSON 输出格式和字段约束，否则整理结果可能无法通过类型校验。
      </HelperText>

      <Button mode="contained" loading={saving} disabled={saving || !settings} onPress={handleSave} style={{ marginTop: 12 }}>
        保存并返回
      </Button>
      <Button mode="outlined" onPress={() => setPrompt(DEFAULT_SYSTEM_PROMPT)} style={{ marginTop: 12 }}>
        恢复默认提示词
      </Button>
    </ScrollView>
  );
}

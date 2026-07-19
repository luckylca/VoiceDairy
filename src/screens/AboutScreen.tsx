import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Icon, Text, useTheme } from 'react-native-paper';

export function AboutScreen() {
  const theme = useTheme();
  const cardStyle = [
    styles.card,
    { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: theme.colors.primaryContainer }]}> 
        <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}> 
          <Icon source="microphone-outline" size={36} color={theme.colors.onPrimary} />
        </View>
        <Text variant="headlineSmall" style={{ marginTop: 14, fontWeight: '900', color: theme.colors.onPrimaryContainer }}>
          VoiceDiary
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 5, color: theme.colors.onPrimaryContainer }}>
          会听、会整理、会行动的个人语音日记
        </Text>
        <Text variant="labelLarge" style={{ marginTop: 8, color: theme.colors.onPrimaryContainer }}>
          Speak. Remember. Act.
        </Text>
        <Text variant="labelLarge" style={{ marginTop: 12, color: theme.colors.onPrimaryContainer }}>
          版本 0.1.0
        </Text>
      </View>

      <View style={cardStyle}>
        <Text variant="titleLarge" style={{ fontWeight: '900' }}>
          核心能力
        </Text>
        <Feature icon="microphone-outline" title="快速语音记录" description="打开应用即可开始录音，SenseVoice 在手机端完成转写。" />
        <Feature icon="brain" title="双整理后端" description="可在 OpenAI 兼容云端 API 与 Qwen3.5-0.8B 本地模型之间切换。" />
        <Feature icon="message-processing-outline" title="独立 Agent" description="复杂任务通过动作卡片预览，确认后才会修改本地数据。" />
        <Feature icon="timeline-text-outline" title="结构化时间线" description="把口语内容整理成想法、待办、项目进展与提醒。" />
      </View>

      <View style={cardStyle}>
        <Text variant="titleLarge" style={{ fontWeight: '900' }}>
          隐私与数据
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 10, lineHeight: 23, color: theme.colors.onSurfaceVariant }}>
          语音识别始终在设备本地运行。本地 Qwen 模式不会上传识别文本；云端 API 模式只会把待整理文本发送到你配置的兼容接口。
        </Text>
        <Divider style={{ marginVertical: 16 }} />
        <Text variant="bodyMedium" style={{ lineHeight: 23, color: theme.colors.onSurfaceVariant }}>
          记录、条目、项目、项目需求、Agent 当前会话和设置目前存储在本地。Qwen GGUF 模型保存在应用私有目录，卸载应用可能同时删除模型文件。
        </Text>
      </View>

      <View style={cardStyle}>
        <Text variant="titleLarge" style={{ fontWeight: '900' }}>
          技术栈
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 10, lineHeight: 24, color: theme.colors.onSurfaceVariant }}>
          React Native 0.74 · TypeScript · React Navigation · react-native-paper · llama.rn · llama.cpp · sherpa-onnx · SenseVoice · AsyncStorage · Zod
        </Text>
      </View>

      <View style={cardStyle}>
        <Text variant="titleLarge" style={{ fontWeight: '900' }}>
          当前开发状态
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 10, lineHeight: 23, color: theme.colors.onSurfaceVariant }}>
          Android arm64-v8a 为当前主要目标。科技界面、快速记录和安全 Agent 已建立基础闭环；真实 PCM 波形、本地通知、多会话管理和完整动作编辑仍会继续完善。
        </Text>
      </View>
    </ScrollView>
  );
}

type FeatureProps = {
  icon: string;
  title: string;
  description: string;
};

function Feature({ icon, title, description }: FeatureProps) {
  const theme = useTheme();
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: theme.colors.secondaryContainer }]}> 
        <Icon source={icon} size={23} color={theme.colors.onSecondaryContainer} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text variant="titleMedium" style={{ fontWeight: '800' }}>
          {title}
        </Text>
        <Text variant="bodySmall" style={{ marginTop: 3, lineHeight: 19, color: theme.colors.onSurfaceVariant }}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: 24,
    borderRadius: 26,
    alignItems: 'center',
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginTop: 14,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  featureIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

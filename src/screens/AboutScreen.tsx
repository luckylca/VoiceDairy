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
          <Icon source="microphone-message" size={36} color={theme.colors.onPrimary} />
        </View>
        <Text variant="headlineSmall" style={{ marginTop: 14, fontWeight: '900', color: theme.colors.onPrimaryContainer }}>
          VoiceDairy
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 5, color: theme.colors.onPrimaryContainer }}>
          Android 本地优先的语音想法与项目需求整理助手
        </Text>
        <Text variant="labelLarge" style={{ marginTop: 12, color: theme.colors.onPrimaryContainer }}>
          版本 0.1.0
        </Text>
      </View>

      <View style={cardStyle}>
        <Text variant="titleLarge" style={{ fontWeight: '900' }}>
          核心能力
        </Text>
        <Feature icon="microphone-outline" title="离线语音识别" description="SenseVoice Small INT8 与 sherpa-onnx 在手机端完成转写。" />
        <Feature icon="brain" title="双整理后端" description="可在 OpenAI 兼容云端 API 与 Qwen3.5-0.8B 本地模型之间切换。" />
        <Feature icon="clipboard-check-outline" title="项目需求联动" description="本地项目助手读取全部项目和需求，并在用户明确确认完成后自动勾选。" />
        <Feature icon="timeline-text-outline" title="结构化记录" description="把口语内容整理成想法、待办、项目进度与提醒，并写入本地时间线。" />
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
          记录、条目、项目、项目需求和设置目前存储在 AsyncStorage。Qwen GGUF 模型保存在应用私有目录，卸载应用可能同时删除模型文件。
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
          Android arm64-v8a 为当前主要目标。WebDAV 页面目前保存实验配置和导出 JSON 快照，正式上传、下载、合并与冲突处理仍待完成。
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

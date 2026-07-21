import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Icon, Text, useTheme } from 'react-native-paper';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { TechPanel } from '../components/tech/TechPanel';
import { TechEntrance, TechCornerBrackets, TechShimmer } from '../components/tech/TechMotion';
import { TechAgentCore } from '../components/tech/TechAgentCore';
import { techTokens } from '../theme/tech/tokens';

export function AboutScreen() {
  const theme = useTheme();
  const { isTech } = useVisualStyle();

  if (isTech) {
    return (
      <ScrollView
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={styles.techContent}
        showsVerticalScrollIndicator={false}
      >
        <TechEntrance from="scale">
          <View style={styles.techHero}>
            <TechCornerBrackets color={techTokens.colors.primary} />
            <TechShimmer duration={1700} color="rgba(255,255,255,0.13)" />
            <TechAgentCore active label="VOICE INTELLIGENCE CORE" />
            <Text style={styles.techBrand}>VoiceDiary</Text>
            <Text style={styles.techTagline}>会听、会整理、会行动的个人语音日记</Text>
            <Text style={styles.techEnglish}>SPEAK · REMEMBER · ACT</Text>
            <View style={styles.versionBadge}>
              <View style={styles.versionDot} />
              <Text style={styles.versionText}>BUILD 0.1.0 · ANDROID ARM64</Text>
            </View>
          </View>
        </TechEntrance>

        <TechPanel accent index={1} style={{ marginTop: 14 }}>
          <SectionHeader code="CAPABILITIES" title="核心能力" />
          <Feature icon="microphone-outline" title="快速语音记录" description="打开应用即可开始录音，SenseVoice 在手机端完成转写。" index={0} />
          <Feature icon="brain" title="双整理后端" description="可在 OpenAI 兼容云端 API 与 Qwen3.5-0.8B 本地模型之间切换。" index={1} />
          <Feature icon="message-processing-outline" title="独立 Agent" description="复杂任务通过动作卡片预览，确认后才会修改本地数据。" index={2} />
          <Feature icon="timeline-text-outline" title="结构化时间线" description="把口语内容整理成想法、待办、项目进展与提醒。" index={3} />
        </TechPanel>

        <TechPanel index={2} style={{ marginTop: 14 }}>
          <SectionHeader code="LOCAL-FIRST" title="隐私与数据" />
          <Text style={styles.techBody}>
            语音识别始终在设备本地运行。本地 Qwen 模式不会上传识别文本；云端 API 模式只会把待整理文本发送到你配置的兼容接口。
          </Text>
          <View style={styles.dataDivider} />
          <Text style={styles.techBody}>
            记录、条目、项目、项目需求、Agent 当前会话和设置存储在本地。Qwen GGUF 模型保存在应用私有目录。
          </Text>
          <View style={styles.securityRow}>
            {['LOCAL ASR', 'CONFIRM ACTIONS', 'PRIVATE STORAGE'].map(label => (
              <View key={label} style={styles.securityChip}><Text style={styles.securityText}>{label}</Text></View>
            ))}
          </View>
        </TechPanel>

        <TechPanel index={3} style={{ marginTop: 14 }}>
          <SectionHeader code="RUNTIME" title="技术栈" />
          <Text style={styles.techBody}>
            React Native 0.74 · TypeScript · React Navigation · llama.rn · llama.cpp · sherpa-onnx · SenseVoice · AsyncStorage · Zod
          </Text>
          <View style={styles.stackGrid}>
            {['RN 0.74', 'QWEN GGUF', 'PCM16', 'ZOD SAFE'].map((item, index) => (
              <View key={item} style={styles.stackCell}>
                <Text style={styles.stackIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={styles.stackText}>{item}</Text>
              </View>
            ))}
          </View>
        </TechPanel>

        <TechPanel accent index={4} style={{ marginTop: 14 }}>
          <SectionHeader code="STATUS" title="当前开发状态" />
          <Text style={styles.techBody}>
            Android arm64-v8a 为当前主要目标。科技界面、真实 PCM 波形、快速记录、安全 Agent 和动态页面系统已经形成完整基础闭环。
          </Text>
          <View style={styles.statusLine}>
            <View style={styles.statusFill} />
          </View>
          <Text style={styles.statusLabel}>CORE SYSTEMS ONLINE</Text>
        </TechPanel>
      </ScrollView>
    );
  }

  const cardStyle = [styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }];
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
        <Text variant="headlineSmall" style={{ marginTop: 14, fontWeight: '900', color: theme.colors.onPrimaryContainer }}>VoiceDiary</Text>
        <Text variant="bodyMedium" style={{ marginTop: 5, color: theme.colors.onPrimaryContainer }}>会听、会整理、会行动的个人语音日记</Text>
        <Text variant="labelLarge" style={{ marginTop: 8, color: theme.colors.onPrimaryContainer }}>Speak. Remember. Act.</Text>
        <Text variant="labelLarge" style={{ marginTop: 12, color: theme.colors.onPrimaryContainer }}>版本 0.1.0</Text>
      </View>

      <View style={cardStyle}>
        <Text variant="titleLarge" style={{ fontWeight: '900' }}>核心能力</Text>
        <ClassicFeature icon="microphone-outline" title="快速语音记录" description="打开应用即可开始录音，SenseVoice 在手机端完成转写。" />
        <ClassicFeature icon="brain" title="双整理后端" description="可在 OpenAI 兼容云端 API 与 Qwen3.5-0.8B 本地模型之间切换。" />
        <ClassicFeature icon="message-processing-outline" title="独立 Agent" description="复杂任务通过动作卡片预览，确认后才会修改本地数据。" />
        <ClassicFeature icon="timeline-text-outline" title="结构化时间线" description="把口语内容整理成想法、待办、项目进展与提醒。" />
      </View>

      <View style={cardStyle}>
        <Text variant="titleLarge" style={{ fontWeight: '900' }}>隐私与数据</Text>
        <Text variant="bodyMedium" style={{ marginTop: 10, lineHeight: 23, color: theme.colors.onSurfaceVariant }}>
          语音识别始终在设备本地运行。本地 Qwen 模式不会上传识别文本；云端 API 模式只会把待整理文本发送到你配置的兼容接口。
        </Text>
        <Divider style={{ marginVertical: 16 }} />
        <Text variant="bodyMedium" style={{ lineHeight: 23, color: theme.colors.onSurfaceVariant }}>
          记录、条目、项目、项目需求、Agent 当前会话和设置目前存储在本地。Qwen GGUF 模型保存在应用私有目录。
        </Text>
      </View>
    </ScrollView>
  );
}

function SectionHeader({ code, title }: { code: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionCode}>{code}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionIndicator}><View style={styles.sectionIndicatorFill} /></View>
    </View>
  );
}

function Feature({ icon, title, description, index }: { icon: string; title: string; description: string; index: number }) {
  return (
    <TechEntrance index={index} from="right">
      <View style={styles.techFeatureRow}>
        <View style={styles.techFeatureIcon}><Icon source={icon} size={22} color={techTokens.colors.primary} /></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.techFeatureTitle}>{title}</Text>
          <Text style={styles.techFeatureDescription}>{description}</Text>
        </View>
        <Text style={styles.featureIndex}>{String(index + 1).padStart(2, '0')}</Text>
      </View>
    </TechEntrance>
  );
}

function ClassicFeature({ icon, title, description }: { icon: string; title: string; description: string }) {
  const theme = useTheme();
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: theme.colors.secondaryContainer }]}> 
        <Icon source={icon} size={23} color={theme.colors.onSecondaryContainer} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text variant="titleMedium" style={{ fontWeight: '800' }}>{title}</Text>
        <Text variant="bodySmall" style={{ marginTop: 3, lineHeight: 19, color: theme.colors.onSurfaceVariant }}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  techContent: { padding: 16, paddingBottom: 52 },
  techHero: {
    minHeight: 286,
    padding: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(85,217,255,0.34)',
    backgroundColor: 'rgba(7,24,34,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  techBrand: { marginTop: 12, color: techTokens.colors.text, fontSize: 28, fontWeight: '900', letterSpacing: 0.4 },
  techTagline: { marginTop: 7, color: techTokens.colors.textMuted, fontSize: 13 },
  techEnglish: { marginTop: 8, color: techTokens.colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  versionBadge: { marginTop: 15, minHeight: 28, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: techTokens.colors.line, flexDirection: 'row', alignItems: 'center' },
  versionDot: { width: 5, height: 5, borderRadius: 3, marginRight: 7, backgroundColor: techTokens.colors.success },
  versionText: { color: techTokens.colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionCode: { color: techTokens.colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1.15 },
  sectionTitle: { marginTop: 3, color: techTokens.colors.text, fontSize: 20, fontWeight: '900' },
  sectionIndicator: { width: 54, height: 3, borderRadius: 2, backgroundColor: 'rgba(143,168,181,0.12)', overflow: 'hidden' },
  sectionIndicatorFill: { width: '68%', height: '100%', backgroundColor: techTokens.colors.primary },
  techFeatureRow: { minHeight: 67, marginTop: 13, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: techTokens.colors.line, backgroundColor: 'rgba(85,217,255,0.035)', flexDirection: 'row', alignItems: 'center' },
  techFeatureIcon: { width: 43, height: 43, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(85,217,255,0.32)', backgroundColor: 'rgba(85,217,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  techFeatureTitle: { color: techTokens.colors.text, fontSize: 15, fontWeight: '900' },
  techFeatureDescription: { marginTop: 4, color: techTokens.colors.textMuted, fontSize: 12, lineHeight: 18 },
  featureIndex: { color: 'rgba(143,168,181,0.34)', fontSize: 8, fontWeight: '900' },
  techBody: { marginTop: 11, color: techTokens.colors.textMuted, fontSize: 14, lineHeight: 22 },
  dataDivider: { height: StyleSheet.hairlineWidth, marginVertical: 15, backgroundColor: techTokens.colors.line },
  securityRow: { marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  securityChip: { minHeight: 26, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(82,230,184,0.25)', backgroundColor: 'rgba(82,230,184,0.05)', alignItems: 'center', justifyContent: 'center' },
  securityText: { color: techTokens.colors.success, fontSize: 7, fontWeight: '900', letterSpacing: 0.55 },
  stackGrid: { marginTop: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stackCell: { width: '48%', minHeight: 48, padding: 9, borderRadius: 11, borderWidth: 1, borderColor: techTokens.colors.line, backgroundColor: 'rgba(255,255,255,0.018)' },
  stackIndex: { color: techTokens.colors.primary, fontSize: 8, fontWeight: '900' },
  stackText: { marginTop: 5, color: techTokens.colors.text, fontSize: 11, fontWeight: '800' },
  statusLine: { height: 3, marginTop: 17, borderRadius: 2, backgroundColor: 'rgba(143,168,181,0.12)', overflow: 'hidden' },
  statusFill: { width: '86%', height: '100%', backgroundColor: techTokens.colors.success },
  statusLabel: { marginTop: 7, color: techTokens.colors.success, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  hero: { padding: 24, borderRadius: 26, alignItems: 'center' },
  logo: { width: 70, height: 70, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  card: { marginTop: 14, padding: 18, borderRadius: 22, borderWidth: 1 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  featureIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});

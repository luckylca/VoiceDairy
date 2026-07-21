import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { ActivityIndicator, Button, Icon, Text, useTheme } from 'react-native-paper';
import type { RootStackParamList } from '../navigation/types';
import type { AppSettings } from '../types/settings';
import type { DailyAgentMode, DailyAgentResult } from '../types/dailyAgent';
import { defaultSettings, loadSettings, subscribeSettings } from '../services/settings/SettingsService';
import { generateDailyAgentResult, loadDailyAgentResult } from '../services/agent/DailyAgentService';
import { useVisualStyle } from '../theme/VisualStyleProvider';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';
import { TechPanel } from '../components/tech/TechPanel';
import { TechButton } from '../components/tech/TechButton';
import { TechCornerBrackets, TechEntrance } from '../components/tech/TechMotion';
import { TechAgentCore } from '../components/tech/TechAgentCore';
import { techTokens } from '../theme/tech/tokens';

function modeLabel(mode: DailyAgentMode): string {
  return mode === 'plan' ? '每日规划' : '每日复盘';
}

export function DailyAgentScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'DailyAgent'>>();
  const theme = useTheme();
  const { isTech } = useVisualStyle();
  const { showNotification } = useFluidNotification();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [mode, setMode] = useState<DailyAgentMode>(route.params?.mode ?? 'plan');
  const [result, setResult] = useState<DailyAgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const autoStartedRef = React.useRef<string | null>(null);

  const loadCurrent = useCallback(async (nextMode: DailyAgentMode) => {
    const saved = await loadDailyAgentResult(nextMode);
    setResult(saved);
    return saved;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const nextSettings = await loadSettings();
        if (!active) return;
        setSettings(nextSettings);
        const saved = await loadCurrent(mode);
        if (!active || saved || nextSettings.organizerProvider !== 'cloud' || !nextSettings.apiKey.trim()) return;
        const autoKey = `${mode}:${new Date().toDateString()}`;
        if (autoStartedRef.current === autoKey) return;
        autoStartedRef.current = autoKey;
        requestAnimationFrame(() => void generate(nextSettings, mode, true));
      })();
      const unsubscribe = subscribeSettings(next => active && setSettings(next));
      return () => {
        active = false;
        unsubscribe();
      };
    }, [loadCurrent, mode]),
  );

  useEffect(() => {
    const nextMode = route.params?.mode;
    if (nextMode && nextMode !== mode) setMode(nextMode);
  }, [mode, route.params?.mode]);

  async function switchMode(nextMode: DailyAgentMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setErrorMessage('');
    setResult(await loadDailyAgentResult(nextMode));
  }

  async function generate(
    currentSettings = settings,
    currentMode = mode,
    silent = false,
  ) {
    if (loading) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const next = await generateDailyAgentResult(currentMode, currentSettings);
      setResult(next);
      if (!silent) {
        showNotification({
          title: `${modeLabel(currentMode)}已生成`,
          message: next.nextAction,
          kind: 'success',
          icon: currentMode === 'plan' ? 'calendar-check-outline' : 'book-check-outline',
        });
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : '每日 Agent 生成失败，请重试。';
      setErrorMessage(message);
      if (!silent) {
        showNotification({ title: '每日 Agent 生成失败', message, kind: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }

  const cloudReady =
    settings.organizerProvider === 'cloud' &&
    Boolean(settings.apiKey.trim()) &&
    Boolean(settings.modelName.trim());

  const selector = (
    <View style={styles.modeRow}>
      {(['plan', 'review'] as DailyAgentMode[]).map(item => {
        const selected = item === mode;
        return (
          <Pressable
            key={item}
            onPress={() => void switchMode(item)}
            style={({ pressed }) => [
              styles.modeButton,
              {
                opacity: pressed ? 0.72 : 1,
                borderColor: selected
                  ? isTech ? techTokens.colors.primary : theme.colors.primary
                  : isTech ? techTokens.colors.line : theme.colors.outlineVariant,
                backgroundColor: selected
                  ? isTech ? 'rgba(85,217,255,0.12)' : theme.colors.secondaryContainer
                  : isTech ? 'rgba(255,255,255,0.025)' : theme.colors.surface,
              },
            ]}
          >
            {isTech ? <TechCornerBrackets color={selected ? techTokens.colors.primary : 'rgba(119,193,221,0.28)'} /> : null}
            <Icon
              source={item === 'plan' ? 'calendar-check-outline' : 'book-check-outline'}
              size={23}
              color={selected
                ? isTech ? techTokens.colors.primary : theme.colors.primary
                : isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant}
            />
            <Text style={{ marginTop: 7, fontWeight: '900', color: isTech ? techTokens.colors.text : theme.colors.onSurface }}>
              {modeLabel(item)}
            </Text>
            <Text style={{ marginTop: 3, fontSize: 10, textAlign: 'center', color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>
              {item === 'plan' ? '排序今天的待办与项目动作' : '总结记录、完成项与遗留问题'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const emptyState = (
    <View style={styles.emptyState}>
      {isTech ? <TechAgentCore active={loading} label={mode === 'plan' ? 'DAY PLANNER' : 'DAY REVIEWER'} /> : null}
      {!isTech ? <Icon source={mode === 'plan' ? 'calendar-check-outline' : 'book-check-outline'} size={52} color={theme.colors.primary} /> : null}
      <Text style={[styles.emptyTitle, { color: isTech ? techTokens.colors.text : theme.colors.onSurface }]}>
        {cloudReady ? `生成今天的${modeLabel(mode)}` : '需要启用云端 API'}
      </Text>
      <Text style={[styles.emptyBody, { color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }]}>
        {cloudReady
          ? mode === 'plan'
            ? 'Agent 会读取未完成待办、提醒、项目和需求，只依据真实数据安排今天。'
            : 'Agent 会读取今天新建和更新的内容，区分完成、遗留、想法与项目变化。'
          : '每日规划、每日复盘和冲突检测只调用云端模型，本地 Qwen 不会执行这些功能。'}
      </Text>
    </View>
  );

  const resultView = result ? (
    <View style={{ marginTop: 16 }}>
      <Text style={[styles.resultTitle, { color: isTech ? techTokens.colors.text : theme.colors.onSurface }]}>{result.title}</Text>
      <Text style={[styles.overview, { color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }]}>{result.overview}</Text>
      {result.sections.map((section, sectionIndex) => (
        <TechEntrance key={`${section.title}-${sectionIndex}`} index={Math.min(sectionIndex, 6)}>
          <View
            style={[
              styles.section,
              {
                borderColor: isTech ? techTokens.colors.line : theme.colors.outlineVariant,
                backgroundColor: isTech ? 'rgba(8,27,38,0.82)' : theme.colors.surface,
              },
            ]}
          >
            {isTech ? <TechCornerBrackets color="rgba(85,217,255,0.42)" /> : null}
            <Text style={[styles.sectionTitle, { color: isTech ? techTokens.colors.primary : theme.colors.primary }]}>{section.title}</Text>
            {section.items.map((item, index) => (
              <View key={`${item}-${index}`} style={styles.itemRow}>
                <View style={[styles.itemDot, { backgroundColor: isTech ? techTokens.colors.success : theme.colors.primary }]} />
                <Text style={[styles.itemText, { color: isTech ? techTokens.colors.text : theme.colors.onSurface }]}>{item}</Text>
              </View>
            ))}
          </View>
        </TechEntrance>
      ))}
      {result.risks.length > 0 ? (
        <View style={[styles.riskPanel, { borderColor: isTech ? 'rgba(255,190,92,0.35)' : theme.colors.outlineVariant }]}>
          <Text style={{ color: isTech ? techTokens.colors.warning : theme.colors.tertiary, fontWeight: '900' }}>风险与遗漏</Text>
          {result.risks.map((risk, index) => (
            <Text key={`${risk}-${index}`} style={{ marginTop: 6, color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }}>• {risk}</Text>
          ))}
        </View>
      ) : null}
      <View style={[styles.nextAction, { borderColor: isTech ? techTokens.colors.primary : theme.colors.primary }]}>
        <Text style={{ color: isTech ? techTokens.colors.primary : theme.colors.primary, fontSize: 10, fontWeight: '900' }}>NEXT ACTION</Text>
        <Text style={{ marginTop: 5, color: isTech ? techTokens.colors.text : theme.colors.onSurface, fontWeight: '800' }}>{result.nextAction}</Text>
      </View>
      <Text style={[styles.meta, { color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }]}>
        {new Date(result.generatedAt).toLocaleString('zh-CN')} · {result.modelName}
      </Text>
    </View>
  ) : emptyState;

  const body = (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: isTech ? techTokens.colors.text : theme.colors.onSurface }]}>每日行动中心</Text>
          <Text style={[styles.subtitle, { color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant }]}>PLAN · REVIEW · KEEP MOVING</Text>
        </View>
        <View style={[styles.cloudBadge, { borderColor: cloudReady ? techTokens.colors.success : techTokens.colors.warning }]}>
          <View style={[styles.cloudDot, { backgroundColor: cloudReady ? techTokens.colors.success : techTokens.colors.warning }]} />
          <Text style={{ color: isTech ? techTokens.colors.textMuted : theme.colors.onSurfaceVariant, fontSize: 9, fontWeight: '900' }}>
            {cloudReady ? 'CLOUD READY' : 'CLOUD REQUIRED'}
          </Text>
        </View>
      </View>
      {selector}
      {isTech ? (
        <TechPanel accent style={{ marginTop: 16 }}>
          {loading ? <View style={styles.loadingRow}><ActivityIndicator color={techTokens.colors.primary} /><Text style={styles.loadingText}>正在读取今天的数据并调用 Agent…</Text></View> : resultView}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <TechButton
            label={loading ? '生成中' : result ? `重新生成${modeLabel(mode)}` : `生成${modeLabel(mode)}`}
            icon={mode === 'plan' ? 'calendar-refresh-outline' : 'book-refresh-outline'}
            disabled={loading || !cloudReady}
            onPress={() => void generate()}
            style={{ marginTop: 16 }}
          />
        </TechPanel>
      ) : (
        <View style={[styles.classicPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          {loading ? <View style={styles.loadingRow}><ActivityIndicator /><Text style={{ marginLeft: 10 }}>正在生成…</Text></View> : resultView}
          {errorMessage ? <Text style={{ marginTop: 10, color: theme.colors.error }}>{errorMessage}</Text> : null}
          <Button mode="contained" icon="creation" loading={loading} disabled={loading || !cloudReady} onPress={() => void generate()} style={{ marginTop: 16 }}>
            {result ? `重新生成${modeLabel(mode)}` : `生成${modeLabel(mode)}`}
          </Button>
        </View>
      )}
    </ScrollView>
  );

  return <View style={{ flex: 1, backgroundColor: isTech ? 'transparent' : theme.colors.background }}>{body}</View>;
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 44 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  pageTitle: { fontSize: 27, fontWeight: '900' },
  subtitle: { marginTop: 4, fontSize: 9, fontWeight: '900', letterSpacing: 1.05 },
  cloudBadge: { marginLeft: 12, minHeight: 30, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  cloudDot: { width: 5, height: 5, borderRadius: 3, marginRight: 6 },
  modeRow: { marginTop: 18, flexDirection: 'row', gap: 10 },
  modeButton: { flex: 1, minHeight: 112, padding: 13, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  classicPanel: { marginTop: 16, borderWidth: 1, borderRadius: 22, padding: 17 },
  emptyState: { minHeight: 260, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  emptyTitle: { marginTop: 16, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  emptyBody: { marginTop: 8, lineHeight: 21, textAlign: 'center' },
  loadingRow: { minHeight: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginLeft: 10, color: techTokens.colors.textMuted },
  resultTitle: { fontSize: 21, fontWeight: '900' },
  overview: { marginTop: 7, lineHeight: 21 },
  section: { marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 14, overflow: 'hidden' },
  sectionTitle: { fontWeight: '900', letterSpacing: 0.3 },
  itemRow: { marginTop: 9, flexDirection: 'row', alignItems: 'flex-start' },
  itemDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7, marginRight: 9 },
  itemText: { flex: 1, lineHeight: 20 },
  riskPanel: { marginTop: 13, borderWidth: 1, borderRadius: 15, padding: 13, backgroundColor: 'rgba(255,190,92,0.04)' },
  nextAction: { marginTop: 13, borderLeftWidth: 3, paddingVertical: 10, paddingHorizontal: 13, backgroundColor: 'rgba(85,217,255,0.045)' },
  meta: { marginTop: 10, fontSize: 10 },
  errorText: { marginTop: 12, color: techTokens.colors.error, lineHeight: 19 },
});
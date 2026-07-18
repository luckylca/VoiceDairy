import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Button,
  Dialog,
  Icon,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type { AppSettings } from '../types/settings';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings/SettingsService';
import { clearLocalDatabase } from '../services/database/Database';
import { buildJsonSnapshot } from '../services/sync/SyncService';
import { copyText } from '../services/system/ClipboardService';
import {
  getDisplayRefreshRateInfo,
  requestHighDisplayRefreshRate,
  type DisplayRefreshRateInfo,
} from '../services/display/DisplayRefreshRate';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

function formatHz(rate: number): string {
  return Math.abs(rate - Math.round(rate)) < 0.05 ? `${Math.round(rate)}Hz` : `${rate.toFixed(1)}Hz`;
}

export function DeveloperOptionsScreen() {
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [refreshInfo, setRefreshInfo] = useState<DisplayRefreshRateInfo | null>(null);
  const [requestingRefresh, setRequestingRefresh] = useState(false);
  const [savingWebdav, setSavingWebdav] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearVisible, setClearVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([loadSettings(), getDisplayRefreshRateInfo().catch(() => null)]).then(
        ([nextSettings, nextRefresh]) => {
          if (!active) return;
          setSettings(nextSettings);
          setRefreshInfo(nextRefresh);
        },
      );
      return () => {
        active = false;
      };
    }, []),
  );

  function patchSettings(patch: Partial<AppSettings>) {
    setSettings(previous => ({ ...previous, ...patch }));
  }

  async function handleRequestHighRefresh() {
    setRequestingRefresh(true);
    try {
      const info = await requestHighDisplayRefreshRate();
      setRefreshInfo(info);
      showNotification({
        title: info.systemAcceptedHighRefresh ? '高刷新率已启用' : '系统未切换到最高刷新率',
        message: `当前 ${formatHz(info.currentRate)}，设备最高 ${formatHz(info.maxSupportedRate)}。`,
        kind: info.systemAcceptedHighRefresh ? 'success' : 'warning',
        icon: info.systemAcceptedHighRefresh ? 'check-circle-outline' : 'alert-outline',
      });
    } catch (error) {
      showNotification({
        title: '高刷新率请求失败',
        message: error instanceof Error ? error.message : '无法读取当前显示模式。',
        kind: 'error',
      });
    } finally {
      setRequestingRefresh(false);
    }
  }

  async function handleSaveWebdav() {
    setSavingWebdav(true);
    try {
      await saveSettings(settings);
      showNotification({
        title: 'WebDAV 配置已保存',
        message: '当前版本保存连接信息；正式上传、下载和冲突合并仍在开发中。',
        kind: 'success',
        icon: 'cloud-check-outline',
      });
    } finally {
      setSavingWebdav(false);
    }
  }

  async function handleExportJson() {
    setExporting(true);
    try {
      const snapshot = await buildJsonSnapshot();
      await copyText(snapshot);
      showNotification({
        title: 'JSON 快照已复制',
        message: `共 ${snapshot.length} 个字符，已写入系统剪贴板。`,
        kind: 'success',
        icon: 'code-json',
      });
    } catch (error) {
      showNotification({
        title: '生成 JSON 失败',
        message: error instanceof Error ? error.message : '无法生成本地数据快照。',
        kind: 'error',
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleClearData() {
    await clearLocalDatabase();
    setClearVisible(false);
    showNotification({
      title: '本地业务数据已清空',
      message: '记录、条目、项目和需求已删除；设置、ASR 与本地 Qwen 模型文件保留。',
      kind: 'warning',
      icon: 'delete-outline',
      duration: 6000,
    });
  }

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={cardStyle}>
          <View style={styles.titleRow}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryContainer }]}> 
              <Icon source="speedometer" size={25} color={theme.colors.onPrimaryContainer} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="titleLarge" style={{ fontWeight: '900' }}>
                显示刷新率
              </Text>
              <Text variant="bodySmall" style={{ marginTop: 3, color: theme.colors.onSurfaceVariant }}>
                {refreshInfo
                  ? `当前 ${formatHz(refreshInfo.currentRate)} · 最高 ${formatHz(refreshInfo.maxSupportedRate)}`
                  : '正在读取设备显示模式…'}
              </Text>
            </View>
          </View>
          {refreshInfo ? (
            <Text variant="bodySmall" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
              支持模式：{refreshInfo.supportedRates.map(formatHz).join(' / ')}
            </Text>
          ) : null}
          <Button
            mode="outlined"
            icon="refresh"
            loading={requestingRefresh}
            disabled={requestingRefresh}
            onPress={handleRequestHighRefresh}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            请求最高刷新率
          </Button>
        </View>

        <View style={cardStyle}>
          <View style={styles.titleRow}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.secondaryContainer }]}> 
              <Icon source="cloud-sync-outline" size={25} color={theme.colors.onSecondaryContainer} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="titleLarge" style={{ fontWeight: '900' }}>
                WebDAV
              </Text>
              <Text variant="bodySmall" style={{ marginTop: 3, color: theme.colors.onSurfaceVariant }}>
                为后续跨设备快照同步保留的实验配置
              </Text>
            </View>
          </View>
          <TextInput
            mode="outlined"
            label="WebDAV URL"
            value={settings.webdavUrl ?? ''}
            onChangeText={webdavUrl => patchSettings({ webdavUrl })}
            autoCapitalize="none"
            style={{ marginTop: 16 }}
          />
          <TextInput
            mode="outlined"
            label="用户名"
            value={settings.webdavUsername ?? ''}
            onChangeText={webdavUsername => patchSettings({ webdavUsername })}
            autoCapitalize="none"
            style={{ marginTop: 12 }}
          />
          <TextInput
            mode="outlined"
            label="密码"
            value={settings.webdavPassword ?? ''}
            onChangeText={webdavPassword => patchSettings({ webdavPassword })}
            secureTextEntry
            style={{ marginTop: 12 }}
          />
          <Button
            mode="contained"
            icon="content-save-outline"
            loading={savingWebdav}
            onPress={handleSaveWebdav}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            保存 WebDAV 配置
          </Button>
        </View>

        <View style={cardStyle}>
          <View style={styles.titleRow}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.tertiaryContainer }]}> 
              <Icon source="code-json" size={25} color={theme.colors.onTertiaryContainer} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="titleLarge" style={{ fontWeight: '900' }}>
                数据与调试
              </Text>
              <Text variant="bodySmall" style={{ marginTop: 3, color: theme.colors.onSurfaceVariant }}>
                导出可检查的完整快照，或清理本地业务数据
              </Text>
            </View>
          </View>
          <Button
            mode="outlined"
            icon="content-copy"
            loading={exporting}
            onPress={handleExportJson}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            生成并复制 JSON 快照
          </Button>
          <Button
            mode="outlined"
            icon="delete-outline"
            textColor={theme.colors.error}
            onPress={() => setClearVisible(true)}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            清空本地业务数据
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={clearVisible} onDismiss={() => setClearVisible(false)}>
          <Dialog.Icon icon="alert-outline" />
          <Dialog.Title>确认清空本地数据？</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              这会删除全部记录、整理条目、项目和项目需求，无法撤销。本地模型文件和设置不会删除。
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearVisible(false)}>取消</Button>
            <Button textColor={theme.colors.error} onPress={handleClearData}>
              确认清空
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 17,
    borderRadius: 22,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 14,
    borderRadius: 14,
  },
  buttonContent: {
    minHeight: 48,
  },
});

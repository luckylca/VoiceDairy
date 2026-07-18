import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Divider,
  Icon,
  ProgressBar,
  SegmentedButtons,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import type { RootStackParamList } from '../navigation/types';
import type { AppSettings } from '../types/settings';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings/SettingsService';
import {
  LOCAL_QWEN_MODEL,
  cancelLocalModelDownload,
  deleteLocalModel,
  downloadLocalModel,
  getLocalModelStatus,
  loadLocalModel,
  releaseLocalModel,
  type LocalModelStatus,
} from '../services/llm/LocalModelService';
import { copyText } from '../services/system/ClipboardService';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

 type Props = NativeStackScreenProps<RootStackParamList, 'LocalModelSettings'>;

type LastError = {
  title: string;
  message: string;
  details: string;
};

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const megabytes = bytes / 1024 / 1024;
  if (megabytes < 1024) return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
  return `${(megabytes / 1024).toFixed(2)} GB`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function buildErrorDetails(
  title: string,
  message: string,
  error: unknown,
  settings: AppSettings,
  status: LocalModelStatus | null,
): string {
  return [
    'VoiceDairy 本地模型错误报告',
    `标题: ${title}`,
    `时间: ${new Date().toISOString()}`,
    `模型: ${LOCAL_QWEN_MODEL.displayName}`,
    `文件: ${status?.filePath ?? '状态尚未读取'}`,
    `文件大小: ${status ? formatBytes(status.bytes) : '未知'}`,
    `运行后端: ${settings.localModelGpuLayers > 0 ? 'GPU/OpenCL' : 'CPU'}`,
    `上下文长度: ${settings.localModelContextSize}`,
    `错误类型: ${error instanceof Error ? error.name : typeof error}`,
    `错误信息: ${message}`,
    error instanceof Error && error.stack ? `错误堆栈:\n${error.stack}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function LocalModelSettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { showNotification } = useFluidNotification();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [status, setStatus] = useState<LocalModelStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [downloadTotal, setDownloadTotal] = useState(LOCAL_QWEN_MODEL.approximateBytes);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [lastError, setLastError] = useState<LastError | null>(null);

  const refresh = useCallback(async () => {
    const [nextSettings, nextStatus] = await Promise.all([loadSettings(), getLocalModelStatus()]);
    setSettings(nextSettings);
    setStatus(nextStatus);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function copyError(details: string) {
    void copyText(details).catch(error => {
      showNotification({
        title: '复制失败',
        message: getErrorMessage(error, '无法访问系统剪贴板'),
        kind: 'error',
      });
    });
  }

  function reportError(title: string, error: unknown, fallback: string) {
    const message = getErrorMessage(error, fallback);
    const details = buildErrorDetails(title, message, error, settings, status);
    setLastError({ title, message, details });
    showNotification({
      title,
      message,
      kind: 'error',
      duration: 8000,
      actionLabel: '复制',
      onAction: () => copyError(details),
    });
  }

  async function persistPatch(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
  }

  async function handleAccelerationChange(value: string) {
    const localModelGpuLayers = value === 'gpu' ? 99 : 0;
    await releaseLocalModel();
    await persistPatch({ localModelGpuLayers });
    await refresh();
  }

  async function handleContextChange(value: string) {
    const localModelContextSize = Number(value);
    await releaseLocalModel();
    await persistPatch({ localModelContextSize });
    await refresh();
  }

  async function handleDownload() {
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadedBytes(0);
    try {
      const nextStatus = await downloadLocalModel(progress => {
        setDownloadedBytes(progress.bytesWritten);
        setDownloadTotal(progress.contentLength || LOCAL_QWEN_MODEL.approximateBytes);
        setDownloadProgress(progress.progress / 100);
      });
      setStatus(nextStatus);
      setLastError(null);
      showNotification({
        title: '本地模型下载完成',
        message: `${LOCAL_QWEN_MODEL.displayName} 已保存到应用私有目录。`,
        kind: 'success',
        icon: 'download-circle-outline',
      });
    } catch (error) {
      reportError('模型下载失败', error, '请检查网络和剩余存储空间。');
    } finally {
      setDownloading(false);
      await refresh();
    }
  }

  function handleCancelDownload() {
    cancelLocalModelDownload();
    setDownloading(false);
    showNotification({
      title: '已取消模型下载',
      message: '不完整的临时文件会在下次下载前清理。',
      kind: 'warning',
      icon: 'close-circle-outline',
    });
  }

  async function handleLoad() {
    setLoadingModel(true);
    setLoadProgress(0);
    try {
      const nextStatus = await loadLocalModel(settings, progress => setLoadProgress(progress / 100));
      setStatus(nextStatus);
      setLastError(null);
      showNotification({
        title: '本地模型已加载',
        message: nextStatus.gpu ? '当前使用设备加速后端。' : '当前使用 CPU 兼容模式。',
        kind: 'success',
        icon: 'memory',
      });
    } catch (error) {
      reportError('模型加载失败', error, '设备可能不支持当前模型或内存不足。');
    } finally {
      setLoadingModel(false);
      await refresh();
    }
  }

  async function handleRelease() {
    await releaseLocalModel();
    await refresh();
    showNotification({
      title: '本地模型已卸载',
      message: '模型文件仍保留，仅释放运行内存。',
      kind: 'success',
      icon: 'eject-outline',
    });
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteLocalModel();
      await refresh();
      setLastError(null);
      showNotification({
        title: '本地模型已删除',
        message: '已释放运行内存和应用私有目录中的模型文件。',
        kind: 'warning',
        icon: 'delete-outline',
      });
    } catch (error) {
      reportError('模型删除失败', error, '无法删除模型文件。');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          padding: 18,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primaryContainer,
            }}
          >
            <Icon source="brain" size={28} color={theme.colors.onPrimaryContainer} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="titleLarge" style={{ fontWeight: '900' }}>
              {LOCAL_QWEN_MODEL.displayName}
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 3, color: theme.colors.onSurfaceVariant }}>
              GGUF · 约 {formatBytes(LOCAL_QWEN_MODEL.approximateBytes)} · 应用私有目录
            </Text>
          </View>
        </View>

        <Divider style={{ marginVertical: 16 }} />
        <Text variant="bodyMedium">
          文件状态：{status?.exists ? `已下载 ${formatBytes(status.bytes)}` : '尚未下载'}
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 5 }}>
          运行状态：{status?.loaded ? '已加载' : '未加载'}
        </Text>
        <Text variant="bodySmall" style={{ marginTop: 5, color: theme.colors.onSurfaceVariant }}>
          {status?.acceleratorMessage ?? '正在读取状态…'}
        </Text>

        {downloading ? (
          <View style={{ marginTop: 16 }}>
            <ProgressBar progress={downloadProgress} />
            <Text variant="labelMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
              {formatBytes(downloadedBytes)} / {formatBytes(downloadTotal)} · {(downloadProgress * 100).toFixed(1)}%
            </Text>
            <Button mode="outlined" onPress={handleCancelDownload} style={{ marginTop: 10, borderRadius: 14 }}>
              取消下载
            </Button>
          </View>
        ) : status?.exists ? (
          <View style={{ marginTop: 16 }}>
            <Button
              mode="contained"
              icon="memory"
              loading={loadingModel}
              disabled={loadingModel}
              onPress={handleLoad}
              style={{ borderRadius: 14 }}
              contentStyle={{ minHeight: 48 }}
            >
              {status.loaded ? '重新加载模型' : '加载模型'}
            </Button>
            {loadingModel ? (
              <View style={{ marginTop: 10 }}>
                <ProgressBar progress={loadProgress} />
                <Text variant="labelSmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
                  正在初始化模型 {(loadProgress * 100).toFixed(0)}%
                </Text>
              </View>
            ) : null}
            <Button
              mode="outlined"
              icon="message-text-outline"
              disabled={loadingModel}
              onPress={() => navigation.navigate('LocalModelChat')}
              style={{ marginTop: 10, borderRadius: 14 }}
              contentStyle={{ minHeight: 48 }}
            >
              打开本地模型对话
            </Button>
            <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
              对话页会读取全部项目和需求；当你明确说某项已经完成时，可自动勾选对应需求。
            </Text>
            {status.loaded ? (
              <Button
                mode="outlined"
                icon="eject-outline"
                onPress={handleRelease}
                style={{ marginTop: 10, borderRadius: 14 }}
              >
                仅卸载模型
              </Button>
            ) : null}
            <Button
              mode="text"
              icon="delete-outline"
              textColor={theme.colors.error}
              loading={deleting}
              disabled={deleting || loadingModel}
              onPress={handleDelete}
              style={{ marginTop: 6 }}
            >
              删除模型文件
            </Button>
          </View>
        ) : (
          <Button
            mode="contained"
            icon="download-outline"
            onPress={handleDownload}
            style={{ marginTop: 16, borderRadius: 14 }}
            contentStyle={{ minHeight: 50 }}
          >
            下载本地模型
          </Button>
        )}
      </View>

      {lastError ? (
        <TouchableRipple
          onPress={() => copyError(lastError.details)}
          borderless={false}
          style={{
            marginTop: 14,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: theme.colors.error,
            backgroundColor: theme.colors.errorContainer,
            overflow: 'hidden',
          }}
        >
          <View style={{ padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon source="alert-circle-outline" size={25} color={theme.colors.onErrorContainer} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onErrorContainer, fontWeight: '900' }}>
                  {lastError.title}
                </Text>
                <Text variant="labelMedium" style={{ marginTop: 2, color: theme.colors.onErrorContainer }}>
                  点击此卡片复制完整错误信息
                </Text>
              </View>
              <Icon source="content-copy" size={22} color={theme.colors.onErrorContainer} />
            </View>
            <Text
              variant="bodySmall"
              numberOfLines={5}
              style={{ marginTop: 12, color: theme.colors.onErrorContainer }}
            >
              {lastError.message}
              {'\n'}
              {lastError.details}
            </Text>
          </View>
        </TouchableRipple>
      ) : null}

      <View
        style={{
          marginTop: 14,
          padding: 18,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Text variant="titleMedium" style={{ fontWeight: '900' }}>
          推理设置
        </Text>
        <Text variant="labelLarge" style={{ marginTop: 16, marginBottom: 9 }}>
          运行后端
        </Text>
        <SegmentedButtons
          value={settings.localModelGpuLayers > 0 ? 'gpu' : 'cpu'}
          onValueChange={handleAccelerationChange}
          buttons={[
            { value: 'cpu', label: 'CPU 兼容', icon: 'cpu-64-bit' },
            { value: 'gpu', label: '尝试 GPU', icon: 'expansion-card' },
          ]}
        />
        <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
          GPU 主要适用于支持 OpenCL 的部分高通 Adreno 设备；失败时请切回 CPU。
        </Text>

        <Text variant="labelLarge" style={{ marginTop: 18, marginBottom: 9 }}>
          上下文长度
        </Text>
        <SegmentedButtons
          value={String(settings.localModelContextSize)}
          onValueChange={handleContextChange}
          buttons={[
            { value: '1024', label: '1024' },
            { value: '2048', label: '2048' },
            { value: '4096', label: '4096' },
          ]}
        />
        <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
          项目与需求会加入提示词。项目较多时建议使用 2048 或 4096，但更长上下文会增加内存占用。
        </Text>
      </View>
    </ScrollView>
  );
}

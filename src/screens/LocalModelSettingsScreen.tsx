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
  useTheme,
} from 'react-native-paper';
import type { RootStackParamList } from '../navigation/types';
import type { AppSettings, OrganizerProvider } from '../types/settings';
import { defaultSettings, loadSettings, saveSettings } from '../services/settings/SettingsService';
import {
  LOCAL_QWEN_MODEL,
  cancelLocalModelDownload,
  deleteLocalModel,
  downloadLocalModel,
  getLocalModelStatus,
  loadLocalModel,
  organizeTextLocally,
  releaseLocalModel,
  type LocalModelStatus,
} from '../services/llm/LocalModelService';
import { useFluidNotification } from '../notifications/FluidNotificationProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'LocalModelSettings'>;

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const megabytes = bytes / 1024 / 1024;
  if (megabytes < 1024) return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
  return `${(megabytes / 1024).toFixed(2)} GB`;
}

export function LocalModelSettingsScreen({}: Props) {
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
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function persistPatch(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
  }

  async function handleProviderChange(value: string) {
    const organizerProvider = value as OrganizerProvider;
    await persistPatch({ organizerProvider });
    showNotification({
      title: organizerProvider === 'local' ? '已启用本地整理' : '已切换到云端整理',
      message:
        organizerProvider === 'local'
          ? '语音仍由 SenseVoice 转写，转写文本将交给手机内的 Qwen 整理。'
          : '整理文本将发送到设置中的兼容 API。',
      kind: 'success',
      icon: organizerProvider === 'local' ? 'cellphone-cog' : 'cloud-outline',
    });
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
      showNotification({
        title: '本地模型下载完成',
        message: `${LOCAL_QWEN_MODEL.displayName} 已保存到应用私有目录。`,
        kind: 'success',
        icon: 'download-circle-outline',
      });
    } catch (error) {
      showNotification({
        title: '模型下载失败',
        message: error instanceof Error ? error.message : '请检查网络和剩余存储空间。',
        kind: 'error',
      });
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
      showNotification({
        title: '本地模型已加载',
        message: nextStatus.gpu ? '当前使用设备加速后端。' : '当前使用 CPU 兼容模式。',
        kind: 'success',
        icon: 'memory',
      });
    } catch (error) {
      showNotification({
        title: '模型加载失败',
        message: error instanceof Error ? error.message : '设备可能不支持当前模型或内存不足。',
        kind: 'error',
      });
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
      icon: 'memory-arrow-down',
    });
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await organizeTextLocally(
        '明天下午三点提醒我检查 VoiceDairy 的本地模型，并把优化启动速度加入项目需求。',
        settings,
      );
      await refresh();
      showNotification({
        title: '本地整理测试成功',
        message: `${result.summary} · 生成 ${result.items.length} 个条目`,
        kind: 'success',
        icon: 'check-decagram-outline',
        duration: 5000,
      });
    } catch (error) {
      showNotification({
        title: '本地整理测试失败',
        message: error instanceof Error ? error.message : '模型没有生成可验证的 JSON。',
        kind: 'error',
        duration: 5000,
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteLocalModel();
      await refresh();
      showNotification({
        title: '本地模型已删除',
        message: '已释放运行内存和应用私有目录中的模型文件。',
        kind: 'warning',
        icon: 'delete-outline',
      });
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
        <Text variant="titleLarge" style={{ fontWeight: '900' }}>
          智能整理方式
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
          SenseVoice 始终在本地完成语音转文字；这里决定由云端 API 还是本地 Qwen 整理文本。
        </Text>
        <SegmentedButtons
          value={settings.organizerProvider}
          onValueChange={handleProviderChange}
          buttons={[
            { value: 'cloud', label: '云端 API', icon: 'cloud-outline' },
            { value: 'local', label: '本地 Qwen', icon: 'cellphone-cog' },
          ]}
          style={{ marginTop: 16 }}
        />
      </View>

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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.primaryContainer,
            }}
          >
            <Icon source="brain" size={27} color={theme.colors.onPrimaryContainer} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="titleMedium" style={{ fontWeight: '900' }}>
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
              disabled={loadingModel || testing}
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
              icon="flask-outline"
              loading={testing}
              disabled={loadingModel || testing}
              onPress={handleTest}
              style={{ marginTop: 10, borderRadius: 14 }}
              contentStyle={{ minHeight: 48 }}
            >
              测试本地整理
            </Button>
            {status.loaded ? (
              <Button
                mode="outlined"
                icon="memory-arrow-down"
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
              disabled={deleting || loadingModel || testing}
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
          GPU 目前主要适用于支持 OpenCL 的部分高通 Adreno 设备；失败时可切回 CPU。
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
          普通语音笔记建议使用 2048；更长上下文会增加内存占用和初始化时间。
        </Text>
      </View>
    </ScrollView>
  );
}

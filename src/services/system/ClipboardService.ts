import { NativeModules, Platform } from 'react-native';

type VoiceClipboardModule = {
  setString(text: string): Promise<void>;
};

export async function copyText(text: string): Promise<void> {
  if (!text.trim()) return;
  if (Platform.OS !== 'android') {
    throw new Error('当前剪贴板实现仅支持 Android');
  }

  const clipboard = NativeModules.VoiceClipboard as VoiceClipboardModule | undefined;
  if (!clipboard?.setString) {
    throw new Error('剪贴板原生模块未注册，请重新构建并安装 APK');
  }

  await clipboard.setString(text);
}

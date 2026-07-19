import { PermissionsAndroid, Platform } from 'react-native';
import { SherpaAsr, type AsrInitOptions, type AsrResult } from './NativeSherpaAsr';

export async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: '需要麦克风权限',
    message: 'VoiceDiary 需要使用麦克风在本地录音，然后进行端侧语音识别。',
    buttonPositive: '允许',
    buttonNegative: '拒绝',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function initAsr(options: AsrInitOptions): Promise<void> {
  await SherpaAsr.init(options);
}

export async function startVoiceRecord(): Promise<void> {
  const granted = await requestMicrophonePermission();
  if (!granted) {
    throw new Error('未获得麦克风权限，无法录音');
  }

  await SherpaAsr.startRecord();
}

export async function stopVoiceRecord(): Promise<AsrResult> {
  return SherpaAsr.stopRecord();
}

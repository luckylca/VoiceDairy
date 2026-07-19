import { NativeEventEmitter, NativeModules } from 'react-native';

export type AsrInitOptions = {
  modelPath?: string;
  tokensPath?: string;
  numThreads: number;
  language: 'auto' | 'zh' | 'en' | 'ja' | 'ko' | 'yue';
};

export type AsrResult = {
  text: string;
  durationMs: number;
};

export type AsrStateChangeEvent = {
  state: 'idle' | 'recording' | 'recognizing' | 'finished' | 'error';
  message?: string;
};

export type AsrAmplitudeEvent = {
  amplitude: number;
  timestamp: number;
};

type NativeSherpaAsrModule = {
  init(options: AsrInitOptions): Promise<void>;
  startRecord(): Promise<void>;
  stopRecord(): Promise<AsrResult>;
  release(): Promise<void>;
};

const nativeModule = NativeModules.SherpaAsr as NativeSherpaAsrModule | undefined;

function getNativeModule(): NativeSherpaAsrModule {
  if (!nativeModule) {
    throw new Error('SherpaAsr Native Module 未注册，请检查 Android 原生模块是否编译进 App');
  }

  return nativeModule;
}

export const SherpaAsr: NativeSherpaAsrModule = {
  init(options) {
    return getNativeModule().init(options);
  },
  startRecord() {
    return getNativeModule().startRecord();
  },
  stopRecord() {
    return getNativeModule().stopRecord();
  },
  release() {
    return getNativeModule().release();
  },
};

export const SherpaAsrEvents = nativeModule ? new NativeEventEmitter(NativeModules.SherpaAsr) : null;

export function subscribeAsrAmplitude(listener: (event: AsrAmplitudeEvent) => void): () => void {
  const subscription = SherpaAsrEvents?.addListener('onAsrAmplitude', (event: AsrAmplitudeEvent) => {
    listener({
      amplitude: Math.max(0, Math.min(1, Number(event.amplitude) || 0)),
      timestamp: Number(event.timestamp) || Date.now(),
    });
  });

  return () => subscription?.remove();
}

import { NativeModules, NativeEventEmitter } from 'react-native';

export type AsrInitOptions = {
  modelPath: string;
  tokensPath: string;
  numThreads: number;
  language: 'auto' | 'zh' | 'en' | 'yue';
};

export type AsrResult = {
  text: string;
  durationMs: number;
};

export type AsrStateChangeEvent = {
  state: 'idle' | 'recording' | 'recognizing' | 'finished' | 'error';
  message?: string;
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

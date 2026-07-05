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

export const SherpaAsr = nativeModule ?? {
  async init() {},
  async startRecord() {},
  async stopRecord() {
    return {
      text: '这是一个 ASR 模块未接入时的演示识别文本。',
      durationMs: 0,
    };
  },
  async release() {},
};

export const SherpaAsrEvents = nativeModule ? new NativeEventEmitter(NativeModules.SherpaAsr) : null;

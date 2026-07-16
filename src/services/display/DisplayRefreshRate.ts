import { NativeModules, Platform } from 'react-native';

export type DisplayRefreshRateInfo = {
  currentRate: number;
  requestedRate: number;
  maxSupportedRate: number;
  supportedRates: number[];
  modeId: number;
  systemAcceptedHighRefresh: boolean;
};

type NativeDisplayRefreshRateModule = {
  getInfo(): Promise<DisplayRefreshRateInfo>;
  requestHighRefreshRate(): Promise<DisplayRefreshRateInfo>;
};

const nativeModule = NativeModules.DisplayRefreshRate as NativeDisplayRefreshRateModule | undefined;

function getNativeModule(): NativeDisplayRefreshRateModule {
  if (Platform.OS !== 'android' || !nativeModule) {
    throw new Error('当前设备不支持 Android 高刷新率控制');
  }
  return nativeModule;
}

export function getDisplayRefreshRateInfo(): Promise<DisplayRefreshRateInfo> {
  return getNativeModule().getInfo();
}

export function requestHighDisplayRefreshRate(): Promise<DisplayRefreshRateInfo> {
  return getNativeModule().requestHighRefreshRate();
}

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { AppSettings } from '../../types/settings';

export type DailyNotificationNativeModule = {
  configure(
    planEnabled: boolean,
    planTime: string,
    reviewEnabled: boolean,
    reviewTime: string,
    quickEnabled: boolean,
  ): Promise<boolean>;
  refreshPersistentNotification(): Promise<boolean>;
};

const nativeModule = NativeModules.VoiceDailyNotifications as DailyNotificationNativeModule | undefined;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (Platform.Version < 33) return true;
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  const granted = await PermissionsAndroid.check(permission);
  if (granted) return true;
  const result = await PermissionsAndroid.request(permission, {
    title: '允许 VoiceDiary 发送通知',
    message: '用于每日规划、每日复盘以及常驻快速语音记录入口。',
    buttonPositive: '允许',
    buttonNegative: '暂不',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function syncDailyNotifications(
  settings: AppSettings,
  requestPermission = false,
): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule) return false;
  const needsNotification =
    settings.dailyPlanEnabled ||
    settings.dailyReviewEnabled ||
    settings.persistentQuickRecordNotification;
  if (requestPermission && needsNotification) {
    const granted = await ensureNotificationPermission();
    if (!granted) return false;
  }
  await nativeModule.configure(
    settings.dailyPlanEnabled,
    settings.dailyPlanTime,
    settings.dailyReviewEnabled,
    settings.dailyReviewTime,
    settings.persistentQuickRecordNotification,
  );
  return true;
}

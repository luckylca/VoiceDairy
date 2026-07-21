import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { AppSettings } from '../../types/settings';

const PERMISSION_PROMPT_KEY = 'voicediary.notifications.permission-prompted.v1';

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

function needsNotifications(settings: AppSettings): boolean {
  return settings.dailyPlanEnabled || settings.dailyReviewEnabled || settings.persistentQuickRecordNotification;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (Number(Platform.Version) < 33) return true;
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
  if (requestPermission && needsNotifications(settings)) {
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

export async function bootstrapDailyNotifications(settings: AppSettings): Promise<boolean> {
  if (!needsNotifications(settings)) return syncDailyNotifications(settings, false);
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) {
    return syncDailyNotifications(settings, false);
  }
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  if (granted) return syncDailyNotifications(settings, false);

  const prompted = await AsyncStorage.getItem(PERMISSION_PROMPT_KEY);
  if (prompted === '1') return false;
  await AsyncStorage.setItem(PERMISSION_PROMPT_KEY, '1');
  const allowed = await ensureNotificationPermission();
  if (!allowed) return false;
  return syncDailyNotifications(settings, false);
}

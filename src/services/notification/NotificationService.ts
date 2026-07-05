import type { Entry } from '../../types/entry';

export async function scheduleReminderIfNeeded(entry: Entry): Promise<void> {
  if (entry.type !== 'reminder' || !entry.datetime) {
    return;
  }

  // 第三阶段接入 Android 本地通知。
}

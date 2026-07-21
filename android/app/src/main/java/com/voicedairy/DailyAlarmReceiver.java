package com.voicedairy;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class DailyAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (!DailyNotificationScheduler.ACTION_PLAN.equals(action) &&
            !DailyNotificationScheduler.ACTION_REVIEW.equals(action)) {
            return;
        }
        DailyNotificationScheduler.showDailyNotification(context, action);
        DailyNotificationScheduler.scheduleNext(context, action);
    }
}
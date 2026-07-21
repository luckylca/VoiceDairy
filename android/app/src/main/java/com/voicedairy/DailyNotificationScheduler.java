package com.voicedairy;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.Calendar;

public final class DailyNotificationScheduler {
    public static final String ACTION_PLAN = "com.voicedairy.action.DAILY_PLAN";
    public static final String ACTION_REVIEW = "com.voicedairy.action.DAILY_REVIEW";
    private static final String PREFS = "voicediary.daily.notifications.v1";
    private static final String KEY_PLAN_ENABLED = "plan_enabled";
    private static final String KEY_PLAN_TIME = "plan_time";
    private static final String KEY_REVIEW_ENABLED = "review_enabled";
    private static final String KEY_REVIEW_TIME = "review_time";
    private static final String KEY_QUICK_ENABLED = "quick_enabled";
    private static final String CHANNEL_DAILY = "voicediary_daily_agents";
    private static final String CHANNEL_QUICK = "voicediary_quick_record";
    private static final int PLAN_REQUEST = 8101;
    private static final int REVIEW_REQUEST = 8102;
    private static final int QUICK_NOTIFICATION_ID = 8201;
    private static final int PLAN_NOTIFICATION_ID = 8202;
    private static final int REVIEW_NOTIFICATION_ID = 8203;

    private DailyNotificationScheduler() {}

    public static void configure(
        Context context,
        boolean planEnabled,
        String planTime,
        boolean reviewEnabled,
        String reviewTime,
        boolean quickEnabled
    ) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        preferences.edit()
            .putBoolean(KEY_PLAN_ENABLED, planEnabled)
            .putString(KEY_PLAN_TIME, normalizeTime(planTime, "08:00"))
            .putBoolean(KEY_REVIEW_ENABLED, reviewEnabled)
            .putString(KEY_REVIEW_TIME, normalizeTime(reviewTime, "21:30"))
            .putBoolean(KEY_QUICK_ENABLED, quickEnabled)
            .apply();

        createChannels(context);
        scheduleAll(context);
        if (quickEnabled) {
            showQuickRecordNotification(context);
        } else {
            NotificationManagerCompat.from(context).cancel(QUICK_NOTIFICATION_ID);
        }
    }

    public static void scheduleAll(Context context) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (preferences.getBoolean(KEY_PLAN_ENABLED, false)) {
            scheduleNext(context, ACTION_PLAN, preferences.getString(KEY_PLAN_TIME, "08:00"));
        } else {
            cancel(context, ACTION_PLAN);
        }
        if (preferences.getBoolean(KEY_REVIEW_ENABLED, false)) {
            scheduleNext(context, ACTION_REVIEW, preferences.getString(KEY_REVIEW_TIME, "21:30"));
        } else {
            cancel(context, ACTION_REVIEW);
        }
    }

    public static void scheduleNext(Context context, String action) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (ACTION_PLAN.equals(action)) {
            if (preferences.getBoolean(KEY_PLAN_ENABLED, false)) {
                scheduleNext(context, action, preferences.getString(KEY_PLAN_TIME, "08:00"));
            }
            return;
        }
        if (preferences.getBoolean(KEY_REVIEW_ENABLED, false)) {
            scheduleNext(context, action, preferences.getString(KEY_REVIEW_TIME, "21:30"));
        }
    }

    private static void scheduleNext(Context context, String action, String time) {
        int[] parts = parseTime(time);
        Calendar trigger = Calendar.getInstance();
        trigger.set(Calendar.HOUR_OF_DAY, parts[0]);
        trigger.set(Calendar.MINUTE, parts[1]);
        trigger.set(Calendar.SECOND, 0);
        trigger.set(Calendar.MILLISECOND, 0);
        if (trigger.getTimeInMillis() <= System.currentTimeMillis() + 5000L) {
            trigger.add(Calendar.DAY_OF_YEAR, 1);
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        PendingIntent pendingIntent = alarmPendingIntent(context, action);
        long triggerAt = trigger.getTimeInMillis();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        }
    }

    private static void cancel(Context context, String action) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            alarmManager.cancel(alarmPendingIntent(context, action));
        }
    }

    private static PendingIntent alarmPendingIntent(Context context, String action) {
        int requestCode = ACTION_PLAN.equals(action) ? PLAN_REQUEST : REVIEW_REQUEST;
        Intent intent = new Intent(context, DailyAlarmReceiver.class).setAction(action);
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static void showDailyNotification(Context context, String action) {
        createChannels(context);
        if (!canNotify(context)) return;
        boolean plan = ACTION_PLAN.equals(action);
        String mode = plan ? "plan" : "review";
        String title = plan ? "开始今天的每日规划" : "现在适合做每日复盘";
        String text = plan
            ? "让规划 Agent 结合待办、提醒和项目状态，生成今天的行动顺序。"
            : "让复盘 Agent 汇总今天的记录、未完成事项和项目进展。";
        PendingIntent contentIntent = deepLinkPendingIntent(
            context,
            Uri.parse("voicediary://daily?mode=" + mode),
            plan ? PLAN_NOTIFICATION_ID : REVIEW_NOTIFICATION_ID
        );
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_DAILY)
            .setSmallIcon(android.R.drawable.ic_menu_my_calendar)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER);
        NotificationManagerCompat.from(context).notify(
            plan ? PLAN_NOTIFICATION_ID : REVIEW_NOTIFICATION_ID,
            builder.build()
        );
    }

    public static void showQuickRecordNotification(Context context) {
        createChannels(context);
        if (!canNotify(context)) return;
        PendingIntent contentIntent = deepLinkPendingIntent(
            context,
            Uri.parse("voicediary://record?autostart=1"),
            QUICK_NOTIFICATION_ID
        );
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_QUICK)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("VoiceDiary 快速记录")
            .setContentText("点击立即进入语音记录")
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE);
        NotificationManagerCompat.from(context).notify(QUICK_NOTIFICATION_ID, builder.build());
    }

    public static void restoreAfterBoot(Context context) {
        createChannels(context);
        scheduleAll(context);
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (preferences.getBoolean(KEY_QUICK_ENABLED, true)) {
            showQuickRecordNotification(context);
        }
    }

    private static PendingIntent deepLinkPendingIntent(Context context, Uri uri, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, uri, context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel daily = new NotificationChannel(
            CHANNEL_DAILY,
            "每日规划与复盘",
            NotificationManager.IMPORTANCE_HIGH
        );
        daily.setDescription("每日规划 Agent 和每日复盘 Agent 的定时提醒");
        NotificationChannel quick = new NotificationChannel(
            CHANNEL_QUICK,
            "快速语音记录",
            NotificationManager.IMPORTANCE_LOW
        );
        quick.setDescription("常驻的 VoiceDiary 快速语音记录入口");
        manager.createNotificationChannel(daily);
        manager.createNotificationChannel(quick);
    }

    private static boolean canNotify(Context context) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private static String normalizeTime(String value, String fallback) {
        int[] parsed = parseTime(value);
        if (parsed[0] < 0) return fallback;
        return String.format(java.util.Locale.US, "%02d:%02d", parsed[0], parsed[1]);
    }

    private static int[] parseTime(String value) {
        try {
            String[] parts = value == null ? new String[0] : value.trim().split(":");
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);
            if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new IllegalArgumentException();
            return new int[] { hour, minute };
        } catch (Exception ignored) {
            return new int[] { 8, 0 };
        }
    }
}
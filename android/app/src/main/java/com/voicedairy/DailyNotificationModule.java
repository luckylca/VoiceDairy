package com.voicedairy;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class DailyNotificationModule extends ReactContextBaseJavaModule {
    public DailyNotificationModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "VoiceDailyNotifications";
    }

    @ReactMethod
    public void configure(
        boolean planEnabled,
        String planTime,
        boolean reviewEnabled,
        String reviewTime,
        boolean quickEnabled,
        Promise promise
    ) {
        try {
            DailyNotificationScheduler.configure(
                getReactApplicationContext(),
                planEnabled,
                planTime,
                reviewEnabled,
                reviewTime,
                quickEnabled
            );
            promise.resolve(true);
        } catch (Exception error) {
            promise.reject("DAILY_NOTIFICATION_CONFIG_FAILED", error);
        }
    }

    @ReactMethod
    public void refreshPersistentNotification(Promise promise) {
        try {
            DailyNotificationScheduler.restoreAfterBoot(getReactApplicationContext());
            promise.resolve(true);
        } catch (Exception error) {
            promise.reject("DAILY_NOTIFICATION_REFRESH_FAILED", error);
        }
    }
}
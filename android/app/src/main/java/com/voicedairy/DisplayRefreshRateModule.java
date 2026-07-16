package com.voicedairy;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

public class DisplayRefreshRateModule extends ReactContextBaseJavaModule {
    public DisplayRefreshRateModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "DisplayRefreshRate";
    }

    @ReactMethod
    public void getInfo(Promise promise) {
        UiThreadUtil.runOnUiThread(() -> resolveSnapshot(promise));
    }

    @ReactMethod
    public void requestHighRefreshRate(Promise promise) {
        UiThreadUtil.runOnUiThread(() -> {
            MainActivity activity = getMainActivity(promise);
            if (activity == null) {
                return;
            }

            activity.requestHighestRefreshRate();
            activity.getWindow().getDecorView().postDelayed(() -> resolveSnapshot(promise), 320L);
        });
    }

    private void resolveSnapshot(Promise promise) {
        MainActivity activity = getMainActivity(promise);
        if (activity == null) {
            return;
        }

        MainActivity.RefreshRateSnapshot snapshot = activity.getRefreshRateSnapshot();
        if (snapshot == null) {
            promise.reject("DISPLAY_UNAVAILABLE", "当前 Android 设备无法读取显示刷新率");
            return;
        }

        WritableArray supportedRates = Arguments.createArray();
        for (Float rate : snapshot.getSupportedRates()) {
            supportedRates.pushDouble(rate.doubleValue());
        }

        WritableMap result = Arguments.createMap();
        result.putDouble("currentRate", snapshot.getCurrentRate());
        result.putDouble("requestedRate", snapshot.getRequestedRate());
        result.putDouble("maxSupportedRate", snapshot.getMaxSupportedRate());
        result.putArray("supportedRates", supportedRates);
        result.putInt("modeId", snapshot.getModeId());
        result.putBoolean(
            "systemAcceptedHighRefresh",
            snapshot.getCurrentRate() + 0.5f >= snapshot.getMaxSupportedRate()
        );
        promise.resolve(result);
    }

    private MainActivity getMainActivity(Promise promise) {
        if (!(getCurrentActivity() instanceof MainActivity)) {
            promise.reject("ACTIVITY_UNAVAILABLE", "VoiceDairy 主界面当前不可用");
            return null;
        }
        return (MainActivity) getCurrentActivity();
    }
}

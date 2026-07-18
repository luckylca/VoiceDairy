package com.voicedairy;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.widget.Toast;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = VoiceClipboardModule.NAME)
public final class VoiceClipboardModule extends ReactContextBaseJavaModule {
    public static final String NAME = "VoiceClipboard";

    public VoiceClipboardModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void setString(String text, Promise promise) {
        try {
            ClipboardManager clipboard = (ClipboardManager) getReactApplicationContext()
                    .getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard == null) {
                promise.reject("CLIPBOARD_UNAVAILABLE", "系统剪贴板不可用");
                return;
            }

            clipboard.setPrimaryClip(ClipData.newPlainText("VoiceDairy error", text));
            UiThreadUtil.runOnUiThread(() -> Toast.makeText(
                    getReactApplicationContext(),
                    "错误信息已复制",
                    Toast.LENGTH_SHORT
            ).show());
            promise.resolve(null);
        } catch (Exception error) {
            promise.reject("CLIPBOARD_COPY_FAILED", error);
        }
    }
}

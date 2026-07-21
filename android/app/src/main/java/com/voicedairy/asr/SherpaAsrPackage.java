package com.voicedairy.asr;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.voicedairy.DailyNotificationModule;
import com.voicedairy.DisplayRefreshRateModule;
import com.voicedairy.VoiceClipboardModule;
import com.voicedairy.VoiceLlamaBridgeModule;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SherpaAsrPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new SherpaAsrModule(reactContext));
        modules.add(new DisplayRefreshRateModule(reactContext));
        modules.add(new VoiceClipboardModule(reactContext));
        modules.add(new DailyNotificationModule(reactContext));

        // Register an app-owned classic bridge that delegates llama.rn's JSI install.
        // This follows the same proven registration path as VoiceClipboard and avoids
        // relying on llama.rn's TurboReactPackage visibility in bridge mode.
        modules.add(new VoiceLlamaBridgeModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
package com.voicedairy.asr;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.rnllama.RNLlamaModule;
import com.voicedairy.DisplayRefreshRateModule;
import com.voicedairy.VoiceClipboardModule;

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

        // Register llama.rn's module directly through the classic ReactPackage path.
        // This bypasses llama.rn's TurboReactPackage metadata, which is not reliable
        // when React Native 0.74 runs with newArchEnabled=false.
        modules.add(new RNLlamaModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}

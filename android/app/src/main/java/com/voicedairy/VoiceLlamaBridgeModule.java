package com.voicedairy;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.rnllama.RNLlamaModule;

/**
 * App-owned classic React Native bridge for llama.rn.
 *
 * llama.rn 0.12.6 can compile in React Native 0.74 bridge mode without making
 * its RNLlama module visible to JavaScript. VoiceDairy's own classic native
 * modules are already proven to work on the target device, so this wrapper
 * delegates the JSI installation to RNLlamaModule without relying on
 * llama.rn's TurboReactPackage or module discovery metadata.
 */
public final class VoiceLlamaBridgeModule extends ReactContextBaseJavaModule {
    public static final String NAME = "VoiceLlamaBridge";
    public static final String BRIDGE_VERSION = "voice-llama-bridge-v1";

    private final RNLlamaModule delegate;

    public VoiceLlamaBridgeModule(ReactApplicationContext reactContext) {
        super(reactContext);
        delegate = new RNLlamaModule(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void install(Promise promise) {
        delegate.install(promise);
    }

    @ReactMethod
    public void getBridgeInfo(Promise promise) {
        promise.resolve(BRIDGE_VERSION);
    }

    @Override
    public void invalidate() {
        delegate.invalidate();
        super.invalidate();
    }
}

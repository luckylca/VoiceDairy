package com.voicedairy.asr

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class SherpaAsrModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val recorder = PcmRecorder(reactContext) { amplitude ->
        emitAmplitude(amplitude)
    }
    private val engine = SherpaAsrEngine(reactContext)
    private var initialized = false

    override fun getName(): String = "SherpaAsr"

    @ReactMethod
    fun init(options: ReadableMap, promise: Promise) {
        try {
            val asrOptions = SherpaAsrOptions(
                modelPath = optionalString(options, "modelPath"),
                tokensPath = optionalString(options, "tokensPath"),
                numThreads = if (options.hasKey("numThreads")) options.getInt("numThreads") else 2,
                language = optionalString(options, "language").ifBlank { "auto" },
            )

            engine.init(asrOptions)
            initialized = true
            emitState("idle", "内置 SenseVoice 模型已加载")
            promise.resolve(null)
        } catch (error: Throwable) {
            initialized = false
            emitState("error", error.message)
            promise.reject("ASR_INIT_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun startRecord(promise: Promise) {
        try {
            if (!initialized) {
                throw IllegalStateException("ASR 尚未初始化，请先加载内置模型")
            }

            recorder.start()
            emitState("recording", "正在录音：16kHz mono PCM16")
            promise.resolve(null)
        } catch (error: Throwable) {
            emitState("error", error.message)
            promise.reject("ASR_RECORD_START_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun stopRecord(promise: Promise) {
        try {
            val recordedPcm = recorder.stop()
            emitState(
                "recognizing",
                "录音完成：${recordedPcm.durationMs}ms，${recordedPcm.byteCount} bytes，开始识别",
            )

            if (!initialized) {
                throw IllegalStateException("ASR 尚未初始化，请先调用 SherpaAsr.init(options)")
            }

            val text = engine.transcribe(recordedPcm)
            val result = Arguments.createMap().apply {
                putString("text", text)
                putDouble("durationMs", recordedPcm.durationMs.toDouble())
            }

            emitFinalText(text)
            emitState("finished", "识别完成")
            promise.resolve(result)
        } catch (error: Throwable) {
            emitState("error", error.message)
            promise.reject("ASR_RECOGNIZE_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun release(promise: Promise) {
        try {
            recorder.release()
            engine.release()
            initialized = false
            emitState("idle", "ASR resources released")
            promise.resolve(null)
        } catch (error: Throwable) {
            emitState("error", error.message)
            promise.reject("ASR_RELEASE_FAILED", error.message, error)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required by React Native NativeEventEmitter.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required by React Native NativeEventEmitter.
    }

    private fun optionalString(options: ReadableMap, key: String): String {
        return if (options.hasKey(key) && !options.isNull(key)) {
            options.getString(key).orEmpty()
        } else {
            ""
        }
    }

    private fun emitState(state: String, message: String? = null) {
        val payload = Arguments.createMap().apply {
            putString("state", state)
            message?.let { putString("message", it) }
        }
        emitEvent("onAsrStateChange", payload)
    }

    private fun emitFinalText(text: String) {
        val payload = Arguments.createMap().apply {
            putString("text", text)
        }
        emitEvent("onAsrFinalText", payload)
    }

    private fun emitAmplitude(amplitude: Double) {
        if (!reactContext.hasActiveCatalystInstance()) return
        val payload = Arguments.createMap().apply {
            putDouble("amplitude", amplitude.coerceIn(0.0, 1.0))
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        emitEvent("onAsrAmplitude", payload)
    }

    private fun emitEvent(eventName: String, payload: com.facebook.react.bridge.WritableMap) {
        if (!reactContext.hasActiveCatalystInstance()) return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, payload)
    }
}

package com.voicedairy.asr

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class SherpaAsrModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val recorder = PcmRecorder(reactContext)
    private val engine = SherpaAsrEngine()
    private var initialized = false

    override fun getName(): String = "SherpaAsr"

    @ReactMethod
    fun init(options: ReadableMap, promise: Promise) {
        try {
            val asrOptions = SherpaAsrOptions(
                modelPath = options.getString("modelPath") ?: "",
                tokensPath = options.getString("tokensPath") ?: "",
                numThreads = if (options.hasKey("numThreads")) options.getInt("numThreads") else 2,
                language = options.getString("language") ?: "auto",
            )

            engine.init(asrOptions)
            initialized = true
            emitState("idle", "ASR 模型路径检查通过")
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
                throw IllegalStateException("ASR 尚未初始化。请先在设置中配置模型路径，并调用 SherpaAsr.init(options)")
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

    private fun emitState(state: String, message: String? = null) {
        val payload = Arguments.createMap().apply {
            putString("state", state)
            message?.let { putString("message", it) }
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onAsrStateChange", payload)
    }

    private fun emitFinalText(text: String) {
        val payload = Arguments.createMap().apply {
            putString("text", text)
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onAsrFinalText", payload)
    }
}

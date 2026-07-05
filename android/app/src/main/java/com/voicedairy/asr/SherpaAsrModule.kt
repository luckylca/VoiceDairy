package com.voicedairy.asr

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class SherpaAsrModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var isRecording = false
    private var startedAtMs = 0L

    override fun getName(): String = "SherpaAsr"

    @ReactMethod
    fun init(options: ReadableMap, promise: Promise) {
        emitState("idle", "ASR module placeholder initialized")
        promise.resolve(null)
    }

    @ReactMethod
    fun startRecord(promise: Promise) {
        isRecording = true
        startedAtMs = System.currentTimeMillis()
        emitState("recording", "Recording placeholder started")
        promise.resolve(null)
    }

    @ReactMethod
    fun stopRecord(promise: Promise) {
        if (!isRecording) {
            promise.reject("ASR_NOT_RECORDING", "startRecord must be called before stopRecord")
            return
        }

        isRecording = false
        emitState("recognizing", "Recognizing placeholder audio")

        val result = Arguments.createMap().apply {
            putString("text", "这是一个 ASR 原生模块占位识别文本。第二阶段接入 sherpa-onnx 后会返回真实转写结果。")
            putDouble("durationMs", (System.currentTimeMillis() - startedAtMs).toDouble())
        }

        emitFinalText(result.getString("text") ?: "")
        emitState("finished", "ASR placeholder finished")
        promise.resolve(result)
    }

    @ReactMethod
    fun release(promise: Promise) {
        isRecording = false
        emitState("idle", "ASR resources released")
        promise.resolve(null)
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

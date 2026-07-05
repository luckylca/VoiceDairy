package com.voicedairy.asr

import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import com.k2fsa.sherpa.onnx.OfflineSenseVoiceModelConfig
import java.io.File

/**
 * Runs offline SenseVoice ASR through sherpa-onnx.
 *
 * The app expects the model files to live in a private app directory and the JNI
 * library to be packaged as android/app/src/main/jniLibs/<abi>/libsherpa-onnx-jni.so.
 */
class SherpaAsrEngine {
    private var options: SherpaAsrOptions? = null
    private var recognizer: OfflineRecognizer? = null

    fun init(options: SherpaAsrOptions) {
        val modelFile = File(options.modelPath)
        val tokensFile = File(options.tokensPath)

        if (!modelFile.exists()) {
            throw IllegalArgumentException("ASR 模型文件不存在：${options.modelPath}")
        }

        if (!tokensFile.exists()) {
            throw IllegalArgumentException("ASR tokens 文件不存在：${options.tokensPath}")
        }

        release()

        val config = OfflineRecognizerConfig(
            featConfig = FeatureConfig(
                sampleRate = PcmRecorder.SAMPLE_RATE,
                featureDim = 80,
            ),
            modelConfig = OfflineModelConfig(
                senseVoice = OfflineSenseVoiceModelConfig(
                    model = options.modelPath,
                    language = normalizeSenseVoiceLanguage(options.language),
                    useInverseTextNormalization = true,
                ),
                tokens = options.tokensPath,
                numThreads = options.numThreads.coerceAtLeast(1),
                debug = false,
                provider = "cpu",
                modelType = "sense-voice",
            ),
            decodingMethod = "greedy_search",
        )

        recognizer = try {
            OfflineRecognizer(config = config)
        } catch (error: UnsatisfiedLinkError) {
            throw IllegalStateException(
                "sherpa-onnx JNI 库未加载。请把 libsherpa-onnx-jni.so 放入 " +
                    "android/app/src/main/jniLibs/arm64-v8a/ 后重新构建。原始错误：${error.message}",
                error,
            )
        }

        this.options = options
    }

    fun transcribe(recordedPcm: RecordedPcm): String {
        val currentRecognizer = recognizer
            ?: throw IllegalStateException("ASR 尚未初始化，请先调用 SherpaAsr.init(options)")

        if (recordedPcm.samples.isEmpty()) {
            throw IllegalStateException("录音为空，没有可识别的 PCM 音频")
        }

        val stream = currentRecognizer.createStream()
        try {
            stream.acceptWaveform(recordedPcm.samples, recordedPcm.sampleRate)
            currentRecognizer.decode(stream)
            return currentRecognizer.getResult(stream).text.trim()
        } finally {
            stream.release()
        }
    }

    fun release() {
        recognizer?.release()
        recognizer = null
        options = null
    }

    private fun normalizeSenseVoiceLanguage(language: String): String {
        return when (language.lowercase()) {
            "zh", "chinese", "cmn" -> "zh"
            "en", "english" -> "en"
            "ja", "japanese" -> "ja"
            "ko", "korean" -> "ko"
            "yue", "cantonese" -> "yue"
            else -> ""
        }
    }
}

data class SherpaAsrOptions(
    val modelPath: String,
    val tokensPath: String,
    val numThreads: Int,
    val language: String,
)

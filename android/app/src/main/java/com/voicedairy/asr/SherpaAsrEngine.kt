package com.voicedairy.asr

import android.content.Context
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import com.k2fsa.sherpa.onnx.OfflineSenseVoiceModelConfig
import java.io.File

/**
 * Runs offline SenseVoice ASR through sherpa-onnx.
 *
 * By default, the recognizer reads the model directly from Android assets:
 *   models/sensevoice/model.int8.onnx
 *   models/sensevoice/tokens.txt
 *
 * A custom filesystem model can still be supplied for development by passing
 * both modelPath and tokensPath.
 */
class SherpaAsrEngine(private val context: Context) {
    private var options: SherpaAsrOptions? = null
    private var recognizer: OfflineRecognizer? = null

    fun init(options: SherpaAsrOptions) {
        val customModelPath = options.modelPath.trim()
        val customTokensPath = options.tokensPath.trim()
        val useBundledAssets = customModelPath.isEmpty() && customTokensPath.isEmpty()

        if (!useBundledAssets && (customModelPath.isEmpty() || customTokensPath.isEmpty())) {
            throw IllegalArgumentException("自定义 ASR 模型必须同时提供 modelPath 和 tokensPath")
        }

        val modelPath = if (useBundledAssets) BUNDLED_MODEL_ASSET else customModelPath
        val tokensPath = if (useBundledAssets) BUNDLED_TOKENS_ASSET else customTokensPath

        if (useBundledAssets) {
            ensureAssetExists(modelPath)
            ensureAssetExists(tokensPath)
        } else {
            if (!File(modelPath).isFile) {
                throw IllegalArgumentException("ASR 模型文件不存在：$modelPath")
            }
            if (!File(tokensPath).isFile) {
                throw IllegalArgumentException("ASR tokens 文件不存在：$tokensPath")
            }
        }

        release()

        val config = OfflineRecognizerConfig(
            featConfig = FeatureConfig(
                sampleRate = PcmRecorder.SAMPLE_RATE,
                featureDim = 80,
            ),
            modelConfig = OfflineModelConfig(
                senseVoice = OfflineSenseVoiceModelConfig(
                    model = modelPath,
                    language = normalizeSenseVoiceLanguage(options.language),
                    useInverseTextNormalization = true,
                ),
                tokens = tokensPath,
                numThreads = options.numThreads.coerceAtLeast(1),
                debug = false,
                provider = "cpu",
                modelType = "sense-voice",
            ),
            decodingMethod = "greedy_search",
        )

        recognizer = try {
            if (useBundledAssets) {
                OfflineRecognizer(assetManager = context.assets, config = config)
            } else {
                OfflineRecognizer(config = config)
            }
        } catch (error: UnsatisfiedLinkError) {
            throw IllegalStateException(
                "sherpa-onnx JNI 库未加载。请运行 npm run prepare:asr 后重新构建 Android App。" +
                    "原始错误：${error.message}",
                error,
            )
        }

        this.options = options.copy(modelPath = modelPath, tokensPath = tokensPath)
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

    private fun ensureAssetExists(assetPath: String) {
        try {
            context.assets.open(assetPath).use { }
        } catch (error: Throwable) {
            throw IllegalStateException(
                "APK 中缺少 ASR 资产 $assetPath。请运行 npm run prepare:asr 后重新构建。",
                error,
            )
        }
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

    companion object {
        private const val BUNDLED_MODEL_ASSET = "models/sensevoice/model.int8.onnx"
        private const val BUNDLED_TOKENS_ASSET = "models/sensevoice/tokens.txt"
    }
}

data class SherpaAsrOptions(
    val modelPath: String = "",
    val tokensPath: String = "",
    val numThreads: Int,
    val language: String,
)

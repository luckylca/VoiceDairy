package com.voicedairy.asr

import java.io.File

/**
 * Contract used by SherpaAsrModule after microphone audio has been recorded.
 *
 * The current repository does not commit sherpa-onnx JNI binaries or ONNX model
 * files. This class validates model paths and provides a single place to wire
 * sherpa-onnx OfflineRecognizer once the dependency and model assets are added.
 */
class SherpaAsrEngine {
    private var options: SherpaAsrOptions? = null

    fun init(options: SherpaAsrOptions) {
        val modelFile = File(options.modelPath)
        val tokensFile = File(options.tokensPath)

        if (!modelFile.exists()) {
            throw IllegalArgumentException("ASR 模型文件不存在：${options.modelPath}")
        }

        if (!tokensFile.exists()) {
            throw IllegalArgumentException("ASR tokens 文件不存在：${options.tokensPath}")
        }

        this.options = options
    }

    fun transcribe(recordedPcm: RecordedPcm): String {
        val currentOptions = options
            ?: throw IllegalStateException("ASR 尚未初始化，请先调用 SherpaAsr.init(options)")

        if (recordedPcm.samples.isEmpty()) {
            throw IllegalStateException("录音为空，没有可识别的 PCM 音频")
        }

        // TODO: Wire sherpa-onnx here after adding its Android JNI package.
        // Expected flow:
        // 1. Create OfflineRecognizerConfig with sampleRate = recordedPcm.sampleRate.
        // 2. Create SenseVoice model config using currentOptions.modelPath and currentOptions.tokensPath.
        // 3. recognizer.createStream()
        // 4. stream.acceptWaveform(recordedPcm.samples, recordedPcm.sampleRate)
        // 5. recognizer.decode(stream)
        // 6. recognizer.getResult(stream).text
        // 7. release stream and recognizer resources.
        throw UnsupportedOperationException(
            "已完成真实 AudioRecord 录音，但 sherpa-onnx 推理尚未接入。" +
                "模型：${currentOptions.modelPath}，tokens：${currentOptions.tokensPath}，" +
                "音频：${recordedPcm.samples.size} samples / ${recordedPcm.sampleRate} Hz。",
        )
    }

    fun release() {
        options = null
    }
}

data class SherpaAsrOptions(
    val modelPath: String,
    val tokensPath: String,
    val numThreads: Int,
    val language: String,
)

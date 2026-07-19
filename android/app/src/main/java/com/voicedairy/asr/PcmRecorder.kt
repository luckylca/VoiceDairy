package com.voicedairy.asr

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.sqrt

/**
 * Records microphone audio as 16 kHz mono PCM 16-bit samples.
 *
 * Besides the final PCM buffer, it emits a lightweight normalized amplitude
 * value roughly every 70 ms. The event is calculated from the real microphone
 * PCM and is intended only for UI animation; raw audio never crosses the JS bridge.
 */
class PcmRecorder(
    private val reactContext: ReactApplicationContext,
    private val onAmplitude: (Double) -> Unit = {},
) {
    companion object {
        const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val AMPLITUDE_INTERVAL_MS = 70L
    }

    private val isRecording = AtomicBoolean(false)
    private var audioRecord: AudioRecord? = null
    private var worker: Thread? = null
    private var pcmBuffer = ByteArrayOutputStream()
    private var startedAtMs = 0L
    private var lastAmplitudeAtMs = 0L

    fun hasRecordPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.RECORD_AUDIO,
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun start() {
        if (!hasRecordPermission()) {
            throw IllegalStateException("缺少麦克风权限，请先授予 RECORD_AUDIO 权限")
        }

        if (!isRecording.compareAndSet(false, true)) {
            throw IllegalStateException("录音已经在进行中")
        }

        pcmBuffer = ByteArrayOutputStream()
        startedAtMs = System.currentTimeMillis()
        lastAmplitudeAtMs = 0L

        val minBufferSize = AudioRecord.getMinBufferSize(
            SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_FORMAT,
        )

        if (minBufferSize <= 0) {
            isRecording.set(false)
            throw IllegalStateException("无法创建 AudioRecord：无效的最小缓冲区大小 $minBufferSize")
        }

        val readBufferSize = minBufferSize.coerceAtLeast(SAMPLE_RATE / 2)
        val recorder = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_FORMAT,
            readBufferSize * 2,
        )

        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            isRecording.set(false)
            recorder.release()
            throw IllegalStateException("AudioRecord 初始化失败")
        }

        audioRecord = recorder
        recorder.startRecording()

        worker = Thread({
            val readBuffer = ByteArray(readBufferSize)
            try {
                while (isRecording.get()) {
                    val read = recorder.read(readBuffer, 0, readBuffer.size)
                    if (read > 0) {
                        synchronized(pcmBuffer) {
                            pcmBuffer.write(readBuffer, 0, read)
                        }

                        val now = System.currentTimeMillis()
                        if (now - lastAmplitudeAtMs >= AMPLITUDE_INTERVAL_MS) {
                            lastAmplitudeAtMs = now
                            val amplitude = calculateNormalizedAmplitude(readBuffer, read)
                            reactContext.runOnUiQueueThread {
                                onAmplitude(amplitude)
                            }
                        }
                    }
                }
            } finally {
                try {
                    recorder.stop()
                } catch (_: Throwable) {
                    // Ignore stop failures while releasing resources.
                }
                recorder.release()
                reactContext.runOnUiQueueThread {
                    onAmplitude(0.0)
                }
            }
        }, "VoiceDiary-PcmRecorder")

        worker?.start()
    }

    fun stop(): RecordedPcm {
        if (!isRecording.compareAndSet(true, false)) {
            throw IllegalStateException("当前没有正在进行的录音")
        }

        worker?.join(1500)
        worker = null
        audioRecord = null

        val bytes = synchronized(pcmBuffer) {
            pcmBuffer.toByteArray()
        }

        val samples = pcm16BytesToFloatSamples(bytes)
        return RecordedPcm(
            samples = samples,
            sampleRate = SAMPLE_RATE,
            durationMs = System.currentTimeMillis() - startedAtMs,
            byteCount = bytes.size,
        )
    }

    fun release() {
        if (isRecording.get()) {
            try {
                stop()
            } catch (_: Throwable) {
                isRecording.set(false)
            }
        }
        audioRecord = null
        worker = null
        pcmBuffer.reset()
        onAmplitude(0.0)
    }

    private fun calculateNormalizedAmplitude(bytes: ByteArray, validBytes: Int): Double {
        val evenByteCount = validBytes - validBytes % 2
        if (evenByteCount <= 0) return 0.0

        var sumSquares = 0.0
        var peak = 0.0
        var sampleCount = 0
        var index = 0
        while (index < evenByteCount) {
            val low = bytes[index].toInt() and 0xFF
            val high = bytes[index + 1].toInt() shl 8
            val sample = (high or low).toShort().toInt()
            val normalized = kotlin.math.abs(sample.toDouble()) / 32768.0
            sumSquares += normalized * normalized
            if (normalized > peak) peak = normalized
            sampleCount += 1
            index += 2
        }

        if (sampleCount == 0) return 0.0
        val rms = sqrt(sumSquares / sampleCount)
        val combined = (rms * 3.2 + peak * 0.45).coerceIn(0.0, 1.0)
        return ((combined - 0.018) / 0.32).coerceIn(0.0, 1.0)
    }

    private fun pcm16BytesToFloatSamples(bytes: ByteArray): FloatArray {
        val sampleCount = bytes.size / 2
        val result = FloatArray(sampleCount)
        val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)

        for (i in 0 until sampleCount) {
            result[i] = buffer.short.toFloat() / 32768.0f
        }

        return result
    }
}

data class RecordedPcm(
    val samples: FloatArray,
    val sampleRate: Int,
    val durationMs: Long,
    val byteCount: Int,
)

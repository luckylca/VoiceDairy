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

/**
 * Records microphone audio as 16 kHz mono PCM 16-bit samples.
 *
 * The React Native JS layer never receives audio frames. It only receives final
 * status events and the final transcription result from SherpaAsrModule.
 */
class PcmRecorder(private val reactContext: ReactApplicationContext) {
    companion object {
        const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }

    private val isRecording = AtomicBoolean(false)
    private var audioRecord: AudioRecord? = null
    private var worker: Thread? = null
    private var pcmBuffer = ByteArrayOutputStream()
    private var startedAtMs = 0L

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
                    }
                }
            } finally {
                try {
                    recorder.stop()
                } catch (_: Throwable) {
                    // Ignore stop failures while releasing resources.
                }
                recorder.release()
            }
        }, "VoiceDairy-PcmRecorder")

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

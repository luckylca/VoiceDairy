package com.k2fsa.sherpa.onnx

/** Minimal sherpa-onnx Kotlin API surface used by VoiceDairy. */
data class FeatureConfig(
    var sampleRate: Int = 16000,
    var featureDim: Int = 80,
    var dither: Float = 0.0f,
)

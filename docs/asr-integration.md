# Android 本地 ASR 接入说明

当前仓库已经完成以下能力：

- React Native JS 层只调用 `SherpaAsr.startRecord()` 和 `SherpaAsr.stopRecord()`；
- Android 原生层使用 `AudioRecord` 采集麦克风音频；
- 音频格式固定为 16kHz、mono、PCM 16-bit；
- 音频帧不会传给 JavaScript；
- 原生层会把 PCM16 转换为 `FloatArray`，用于后续传给 sherpa-onnx；
- 模型路径会检查 `model.int8.onnx` 和 `tokens.txt` 是否存在；
- 如果 sherpa-onnx 推理尚未接入，会明确报错，而不是返回假的识别文本。

## 模型目录

设置页中的 ASR 模型目录建议填写：

```text
/data/user/0/com.voicedairy/files/models/sensevoice
```

该目录下应包含：

```text
model.int8.onnx
tokens.txt
```

## 后续真正接入 sherpa-onnx 的位置

核心位置：

```text
android/app/src/main/java/com/voicedairy/asr/SherpaAsrEngine.kt
```

当前 `SherpaAsrEngine.transcribe(recordedPcm)` 已经拿到：

```kotlin
recordedPcm.samples      // FloatArray, 归一化音频采样
recordedPcm.sampleRate   // 16000
recordedPcm.durationMs   // 录音时长
recordedPcm.byteCount    // 原始 PCM 字节数
```

接入 sherpa-onnx 时，流程应为：

```text
创建 OfflineRecognizerConfig
    ↓
配置 SenseVoice 模型路径和 tokens 路径
    ↓
recognizer.createStream()
    ↓
stream.acceptWaveform(recordedPcm.samples, recordedPcm.sampleRate)
    ↓
recognizer.decode(stream)
    ↓
recognizer.getResult(stream).text
    ↓
释放 stream 和 recognizer
```

## 不提交到仓库的文件

不要提交：

- `model.int8.onnx`
- `tokens.txt`
- `libonnxruntime.so`
- `libsherpa-onnx-jni.so`
- 用户录音文件
- API Key / WebDAV 密码

这些内容已经被 `.gitignore` 忽略。

## 为什么现在还没有直接提交 sherpa-onnx 二进制

`sherpa-onnx` 的 Android 集成通常涉及 JNI so、Kotlin/Java API 包装层和模型文件。模型和 so 文件体积较大，不适合直接提交到普通源码仓库。推荐做法是：

1. 第一阶段：保留当前 AudioRecord + PCM 缓存 + 模型路径检查；
2. 第二阶段：把 sherpa-onnx Android JNI 库作为可下载构件或手动放入 `android/app/src/main/jniLibs/arm64-v8a/`；
3. 第三阶段：在 App 首次启动时下载模型，校验 SHA256，解压到私有目录；
4. 第四阶段：在 `SherpaAsrEngine` 里替换 TODO，调用真实 OfflineRecognizer。

## 本地调试建议

1. 安装 App 到 Android 真机；
2. 在系统设置中授予麦克风权限，或第一次录音时允许权限；
3. 在 App 设置页填写 ASR 模型目录；
4. 点击记录页的“录音识别”；
5. 若模型未接入，会看到明确错误，不再出现固定假文本；
6. 接入 sherpa-onnx 后，识别结果会写入文本输入框。

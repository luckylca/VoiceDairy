# Android 本地 ASR 接入说明

当前仓库已经完成以下能力：

- React Native JS 层调用 `SherpaAsr.init()`、`SherpaAsr.startRecord()` 和 `SherpaAsr.stopRecord()`；
- Android 原生层使用 `AudioRecord` 采集麦克风音频；
- 音频格式固定为 16kHz、mono、PCM 16-bit；
- 音频帧不会传给 JavaScript；
- 原生层会把 PCM16 转换为 `FloatArray`；
- Android 原生层已经接入 sherpa-onnx 离线识别调用链；
- 当前默认模型类型是 SenseVoice；
- 模型路径会检查 `model.int8.onnx` 和 `tokens.txt` 是否存在；
- JNI 库缺失时会明确提示 `libsherpa-onnx-jni.so` 未加载，不会返回假的识别文本。

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

## JNI 库目录

把 sherpa-onnx Android JNI 库放到：

```text
android/app/src/main/jniLibs/arm64-v8a/libsherpa-onnx-jni.so
```

如果需要兼容更多 ABI，可以继续添加：

```text
android/app/src/main/jniLibs/armeabi-v7a/libsherpa-onnx-jni.so
android/app/src/main/jniLibs/x86_64/libsherpa-onnx-jni.so
```

注意：`.so` 文件体积较大，默认不提交到仓库。仓库只保留 `.gitkeep` 占位文件。

## 识别调用链

核心位置：

```text
android/app/src/main/java/com/voicedairy/asr/SherpaAsrEngine.kt
```

当前 `SherpaAsrEngine.transcribe(recordedPcm)` 会执行：

```text
创建 OfflineRecognizerConfig
    ↓
配置 SenseVoice 模型路径和 tokens 路径
    ↓
OfflineRecognizer(config)
    ↓
recognizer.createStream()
    ↓
stream.acceptWaveform(recordedPcm.samples, recordedPcm.sampleRate)
    ↓
recognizer.decode(stream)
    ↓
recognizer.getResult(stream).text
    ↓
释放 stream
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

## 本地调试建议

1. 准备 SenseVoice INT8 模型目录，保证目录下有 `model.int8.onnx` 和 `tokens.txt`；
2. 准备 `libsherpa-onnx-jni.so`，放入 `android/app/src/main/jniLibs/arm64-v8a/`；
3. 重新构建 Android App；
4. 安装 App 到 Android 真机；
5. 在系统设置中授予麦克风权限，或第一次录音时允许权限；
6. 在 App 设置页填写 ASR 模型目录；
7. 点击记录页的“录音识别”；
8. 识别结果会写入文本输入框。

## 当前限制

- GitHub Actions 只能验证编译，不能验证真机麦克风输入；
- 仓库不提交模型文件和 JNI so，所以 CI 不会执行真实 ASR 推理；
- 真机端到端测试需要你把模型和 so 放到本地后运行。

# Android 本地 ASR 接入说明

当前仓库已经完成以下能力：

- React Native JS 层调用 `SherpaAsr.init()`、`SherpaAsr.startRecord()` 和 `SherpaAsr.stopRecord()`；
- Android 原生层使用 `AudioRecord` 采集麦克风音频；
- 音频格式固定为 16kHz、mono、PCM 16-bit；
- 音频帧不会传给 JavaScript；
- 原生层会把 PCM16 转换为 `FloatArray`；
- Android 原生层已经接入 sherpa-onnx 离线识别调用链；
- 当前默认模型类型是 SenseVoice；
- 模型路径会检查 `model.int8.onnx` 和词表文件是否存在；
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

如果你希望把模型跟随仓库一起管理，可以把模型文件放到仓库内：

```text
models/sensevoice/model.int8.onnx
models/sensevoice/tokens.txt
```

仓库已经配置 `.gitattributes`，`*.onnx`、`*.bin`、`android/app/src/main/jniLibs/**/*.so` 等大文件会走 Git LFS。

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

## 识别调用链

核心位置：

```text
android/app/src/main/java/com/voicedairy/asr/SherpaAsrEngine.kt
```

当前 `SherpaAsrEngine.transcribe(recordedPcm)` 会执行：

```text
创建 OfflineRecognizerConfig
    ↓
配置 SenseVoice 模型路径和词表路径
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

## 允许提交的 ASR 资产

可以通过 Git LFS 提交：

- `models/sensevoice/model.int8.onnx`
- `models/sensevoice/tokens.txt`
- `android/app/src/main/jniLibs/arm64-v8a/libsherpa-onnx-jni.so`

仍然不要提交用户录音、账号凭据、同步密码和其他个人隐私数据。

## 本地提交模型文件

```bash
git lfs install
git add .gitattributes .gitignore models/sensevoice/model.int8.onnx models/sensevoice/tokens.txt android/app/src/main/jniLibs/arm64-v8a/libsherpa-onnx-jni.so
git commit -m "chore(asr): add SenseVoice model assets"
git push
```

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
- 我当前没有拿到真实模型二进制和 JNI so 文件，所以不能替你把实际文件内容提交到仓库；
- 真机端到端测试需要模型、词表和 so 都存在。

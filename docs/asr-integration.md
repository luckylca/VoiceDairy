# Android 本地 ASR 接入说明

## 当前实现

VoiceDairy 已经接通 Android 端侧语音识别链路：

- React Native 调用 `SherpaAsr.init()`、`startRecord()` 和 `stopRecord()`；
- Kotlin Native Module 使用 `AudioRecord` 采集 16kHz、mono、PCM16 音频；
- PCM 在原生层转换成 `FloatArray`，不会逐帧传到 JavaScript；
- sherpa-onnx 使用 SenseVoice Small INT8 在手机 CPU 上离线识别；
- 识别完成后只把文本和录音时长返回给 JavaScript。

## 资产准备

仓库不直接提交数百 MB 的模型和 `.so` 二进制，避免普通 Git 历史膨胀和 GitHub 100 MB 单文件限制。运行：

```bash
npm run prepare:asr
```

脚本 `scripts/prepare-asr-assets.sh` 会下载并安装：

```text
android/app/src/main/assets/models/sensevoice/model.int8.onnx
android/app/src/main/assets/models/sensevoice/tokens.txt
android/app/src/main/jniLibs/arm64-v8a/*.so
```

Gradle 的 `preBuild` 已依赖该脚本，所以直接执行 `npm run android` 时也会自动准备缺失资产。下载包缓存在 `.cache/voicedairy-asr/`，相关生成文件均已加入 `.gitignore`。

## APK 内置模型

`SherpaAsrEngine` 默认使用 Android `AssetManager` 直接读取：

```text
models/sensevoice/model.int8.onnx
models/sensevoice/tokens.txt
```

因此用户不再需要在设置页填写模型目录，也不需要在首次启动时把整个模型复制到应用私有目录。

开发调试时仍可在 `SherpaAsr.init()` 中同时传入 `modelPath` 和 `tokensPath`，让引擎从文件系统加载自定义模型。

## 识别调用链

```text
点击“录音识别”
    ↓
初始化内置 SenseVoice OfflineRecognizer
    ↓
申请 RECORD_AUDIO 权限
    ↓
AudioRecord 采集 16kHz mono PCM16
    ↓
停止录音并转换 FloatArray
    ↓
OfflineRecognizer.decode(stream)
    ↓
返回识别文本到 React Native 文本框
```

## 图标修复

项目使用 `react-native-paper` 与 `react-native-vector-icons` 的 MaterialCommunityIcons。Android 构建现在通过 `fonts.gradle` 显式复制 `MaterialCommunityIcons.ttf`，避免底部导航、按钮等位置出现方框、问号或缺失图标。

## 当前限制

- 自动下载的 JNI 资产目前只准备 `arm64-v8a`；
- 首次准备资产需要联网；
- 模型随 APK 打包会增大安装包体积；
- 真机麦克风与识别准确率仍需在目标 Android 设备上做端到端验证。

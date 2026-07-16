# 运行说明

## 环境要求

- Node.js 18+
- JDK 17
- Android Studio / Android SDK
- Android SDK Platform 34
- Android Build Tools 34.0.0
- Gradle 8.x
- `curl` 或 `wget`
- 支持 arm64-v8a 的 Android 真机

## 安装依赖

```bash
npm install
```

## 准备本地语音识别资产

第一次构建前可主动执行：

```bash
npm run prepare:asr
```

该命令会从 sherpa-onnx 官方发布页下载：

- SenseVoice Small INT8 模型与 `tokens.txt`；
- sherpa-onnx 1.13.4 的 arm64-v8a Android JNI 动态库。

下载结果会放入 Android assets 和 jniLibs，并被 `.gitignore` 排除。`npm run android` 也会在 Gradle `preBuild` 阶段自动执行同一准备任务，因此通常不需要手工运行。第一次需要联网，缓存和资产准备完成后即可离线重新构建。

## 启动 Metro

```bash
npm start
```

## 运行 Android

通过 GitHub Contents API 创建的 `android/gradlew` 不能保证保留可执行位。首次 clone 后可以执行：

```bash
chmod +x android/gradlew
npm run android
```

如果本地没有 Gradle Wrapper，可以在 `android` 目录下重新生成：

```bash
cd android
gradle wrapper
cd ..
npm run android
```

## 本地语音转文字

1. 在 Android 真机打开 App；
2. 进入“记录”页；
3. 点击“录音识别”并授予麦克风权限；
4. 再次点击停止录音；
5. SenseVoice 会在手机端离线识别，结果自动写入文本框。

模型已经随 APK 安装，不需要在设置页填写 `/data/user/0/...` 路径。录音 PCM 不会上传到云端，也不会逐帧传到 JavaScript。

## MVP 使用方式

1. 打开 App；
2. 进入“记录”页；
3. 保持“演示整理模式”开启；
4. 输入文字或使用本地语音识别；
5. 点击“智能整理并保存”；
6. 回到“时间线”查看条目；
7. 进入“分类”“待办”“提醒”“搜索”“设置”继续查看。

## API 模式

关闭“演示整理模式”前，需要先在“设置”页配置：

- API Base URL；
- API Key；
- 模型名；
- 系统提示词。

接口按 OpenAI 兼容 `/chat/completions` 调用。

## 当前限制

- 当前自动准备的 JNI 只包含 arm64-v8a，主要面向现代 Android 真机；
- SenseVoice 模型会明显增大 APK 体积；
- 第一阶段本地数据使用统一 Repository + JSON 快照适配，后续可替换为 SQLite；
- Android 本地通知和 WebDAV 真实同步仍需继续完善。

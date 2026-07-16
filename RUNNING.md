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

## 主界面操作

App 只有三个一级 Tab：

1. **时间线**：顶部搜索，正文按今天、昨天、本周和更早分组；
2. **分类**：显示想法、待办、提醒、笔记等类型的数量；
3. **设置**：管理主题、API、提示词、本地识别、WebDAV 和数据。

可以点击底部导航切换，也可以在页面空白区域左右滑动切换三个 Tab。

## 本地语音转文字

1. 在“时间线”点击右下角“记录”；
2. 在二级页面点击“开始录音”并授予麦克风权限；
3. 再次点击停止录音；
4. SenseVoice 会在手机端离线识别，结果自动写入文本框；
5. 编辑文字后点击“智能整理并保存”，页面会返回时间线。

模型已经随 APK 安装，不需要在设置页填写 `/data/user/0/...` 路径。录音 PCM 不会上传到云端，也不会逐帧传到 JavaScript。

## 主题设置

在“设置 → 外观主题”中可以：

- 跟随系统明暗模式；
- 强制使用浅色模式；
- 强制使用深色模式；
- 切换紫罗兰、海洋蓝、森林绿、日落橙和玫瑰粉主题。

主题变化会立即生效并保存到本地。

## API 模式与提示词

关闭“演示整理模式”前，需要先在“设置”页配置：

- API Base URL；
- API Key；
- 模型名。

整理提示词不再直接显示在主设置表单中。点击“设置 → 整理提示词”进入二级页面修改，并保留 JSON 输出字段约束。

接口按 OpenAI 兼容 `/chat/completions` 调用。

## 当前限制

- 当前自动准备的 JNI 只包含 arm64-v8a，主要面向现代 Android 真机；
- SenseVoice 模型会明显增大 APK 体积；
- 第一阶段本地数据使用统一 Repository + JSON 快照适配，后续可替换为 SQLite；
- Android 本地通知和 WebDAV 真实同步仍需继续完善。

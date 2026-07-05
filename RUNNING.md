# 运行说明

## 环境要求

- Node.js 18+
- JDK 17
- Android Studio / Android SDK
- Android SDK Platform 34
- Android Build Tools 34.0.0
- Gradle 8.x，或者在本地重新生成 Gradle Wrapper

## 安装依赖

```bash
npm install
```

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

## MVP 使用方式

1. 打开 App。
2. 进入“记录”页。
3. 保持“演示整理模式”开启。
4. 输入一段文字。
5. 点击“智能整理并保存”。
6. 回到“时间线”查看条目。
7. 进入“分类”“待办”“提醒”“搜索”“设置”继续查看。

## API 模式

关闭“演示整理模式”前，需要先在“设置”页配置：

- API Base URL
- API Key
- 模型名
- 系统提示词

接口按 OpenAI 兼容 `/chat/completions` 调用。

## 当前限制

- 第一阶段本地数据使用统一 Repository + JSON 快照适配，后续替换为 `react-native-quick-sqlite`。
- ASR Native Module 当前是占位实现，第二阶段接入 AudioRecord + sherpa-onnx + SenseVoice-Small INT8。
- Android 本地通知和 WebDAV 真实同步在第三、第四阶段实现。

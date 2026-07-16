# VoiceDairy - 语音想法整理助手

VoiceDairy 是一个面向 Android 的 React Native CLI 应用，用来把随手说出的想法转成可编辑文本，再整理成待办、提醒、笔记、问题和项目记录等结构化内容。

## 核心流程

```text
Android 麦克风
    ↓ AudioRecord：16kHz mono PCM16
SenseVoice Small INT8 + sherpa-onnx
    ↓ 手机端离线语音转文字
React Native 文本编辑
    ↓ 演示规则或 OpenAI 兼容 API
结构化 JSON
    ↓
时间线搜索、分类统计与本地数据管理
```

## 当前已实现

- React Native CLI + TypeScript Android 应用；
- Material Design 3 风格界面；
- 仅保留“时间线、分类、设置”三个一级 Tab；
- 支持左右滑动切换三个 Tab；
- 时间线顶部支持搜索标题、内容、标签和项目；
- 录音页和提示词编辑页作为二级路由打开；
- 支持跟随系统、浅色、深色模式和多套主题颜色；
- Android `AudioRecord` 真实录音；
- sherpa-onnx + SenseVoice Small INT8 本地离线识别；
- 构建前自动下载模型和 arm64-v8a JNI 库；
- 演示整理模式，无需 API Key 即可验证完整流程；
- OpenAI 兼容 `/chat/completions` 接口；
- 大模型 JSON 返回解析与类型校验；
- 基于 AsyncStorage 的本地记录、条目和设置存储；
- JSON 快照生成，为后续 WebDAV 同步做准备。

## 界面结构

```text
主界面
├── 时间线
│   ├── 顶部搜索栏
│   ├── 分组时间线
│   └── 新建记录（二级页面）
├── 分类
│   └── 按想法、待办、提醒、笔记等类型统计
└── 设置
    ├── 明暗模式和主题颜色
    ├── 大模型 API
    ├── 整理提示词（二级页面）
    ├── 本地 ASR 状态
    ├── WebDAV
    └── 数据操作
```

## 本地语音识别

模型二进制不会直接提交到普通 Git 历史。第一次构建时，Gradle 会自动调用：

```bash
npm run prepare:asr
```

该脚本从 sherpa-onnx 官方发布页下载：

- `sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17`；
- sherpa-onnx 1.13.4 Android arm64-v8a JNI 动态库。

模型会安装到 Android assets，JNI 库会安装到 `jniLibs`。生成文件和下载缓存已加入 `.gitignore`，因此不会触发 GitHub 100 MB 单文件限制。

App 使用 `AssetManager` 直接读取内置模型，用户不需要在设置页填写手机内部路径。录音和推理均在 Android 原生层完成，JavaScript 只接收最终文字和录音时长。

## 开始运行

环境要求：Node.js 18+、JDK 17、Android SDK 34、Gradle 8.x，以及 `curl` 或 `wget`。

```bash
npm install
chmod +x android/gradlew
npm run android
```

首次构建需要下载模型与 JNI 库；准备完成后可以离线重新构建和离线转写。当前自动准备的原生库面向 arm64-v8a Android 真机。

详细步骤见 [RUNNING.md](./RUNNING.md)，ASR 实现说明见 [docs/asr-integration.md](./docs/asr-integration.md)。

## 使用方式

1. 在“时间线”点击右下角“记录”；
2. 点击“开始录音”，允许麦克风权限；
3. 停止录音后等待本地转写；
4. 编辑文字并点击“智能整理并保存”；
5. 回到时间线搜索或查看分组结果；
6. 左右滑动进入“分类”或“设置”；
7. 在设置中切换主题，或进入二级页面修改整理提示词。

## 技术栈

- React Native 0.74
- TypeScript
- React Navigation
- react-native-paper
- react-native-vector-icons
- Android Kotlin Native Module
- Android AudioRecord
- sherpa-onnx
- SenseVoice Small INT8
- AsyncStorage
- Zod

## 后续计划

- 用 SQLite 替换当前 AsyncStorage 快照存储；
- 完成本地通知和提醒调度；
- 完成 WebDAV 上传、下载、合并和冲突处理；
- 增加 VAD 自动分句、热词修正和识别状态展示；
- 支持更多 Android ABI；
- 优化模型体积、首次下载进度和失败重试体验。

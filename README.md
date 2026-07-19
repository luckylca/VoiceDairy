# VoiceDairy

VoiceDairy 是一个面向 Android 的本地优先语音记录、智能整理和项目需求管理应用。它使用 SenseVoice 在手机端完成语音转文字，再由云端 OpenAI 兼容 API 或本地 Qwen GGUF 模型把口语内容整理为结构化记录。

应用同时维护项目和项目需求。本地 Qwen 对话会在每次发送消息前重新读取手机中当前保存的项目、项目说明、需求标题和完成状态。项目需求自动勾选仍属于实验功能，当前不能视为稳定能力。

## 核心流程

```text
Android 麦克风
    ↓ AudioRecord：16 kHz mono PCM16
SenseVoice Small INT8 + sherpa-onnx
    ↓ 手机端离线语音转文字
可编辑转写文本
    ↓
┌─────────────────────┬─────────────────────┐
│ OpenAI 兼容云端 API │ Qwen3.5-0.8B 本地模型 │
└─────────────────────┴─────────────────────┘
    ↓ 自动附加当前项目内容
结构化记录
    ↓
时间线、分类、项目与需求清单
```

## 当前能力

- React Native CLI + TypeScript Android 应用；
- Material Design 3 界面、浅色/深色/跟随系统及多套主题色；
- 时间线、分类、设置三个一级 Tab；
- Android `AudioRecord` 真实录音；
- sherpa-onnx + SenseVoice Small INT8 本地离线识别；
- 云端 OpenAI 兼容 `/chat/completions` 整理；
- llama.rn + llama.cpp 本地 Qwen3.5-0.8B Q4_0 整理；
- 本地模型下载、加载、CPU/GPU 后端选择、上下文设置和错误复制；
- 独立本地模型对话页面；
- 云端和本地整理提示词可以附加当前项目内容；
- 基于 AsyncStorage 的记录、条目、项目、需求和设置存储；
- 开发者选项页面：显示刷新率、WebDAV 实验配置、JSON 快照和本地数据清理；
- 关于页面：版本、隐私、技术栈和当前开发状态。

## 界面结构

```text
主界面
├── 时间线
│   ├── 搜索
│   ├── 分组记录
│   └── 新建语音记录
├── 分类
│   └── 想法、待办、项目进度、提醒等统计
└── 设置
    ├── 外观主题
    ├── 分类设置
    ├── 项目设置
    │   └── 项目详情与可勾选需求
    ├── 智能整理
    │   ├── 云端 API
    │   │   └── API 地址、密钥、模型与模型列表
    │   ├── 本地 Qwen
    │   │   ├── 本地模型管理
    │   │   └── 本地模型对话
    │   └── 整理提示词
    ├── 开发者选项
    │   ├── 显示刷新率
    │   ├── WebDAV
    │   ├── JSON 快照
    │   └── 清空本地业务数据
    └── 关于 VoiceDairy
```

本地模型管理卡片只在设置已经读取完成并且选择“本地 Qwen”时渲染；选择“云端 API”时该组件不会创建，只显示云端 API 配置。

## 项目上下文与需求联动

项目和需求存储在本地数据库快照中。云端或本地智能整理可以读取当前项目，并把项目名称、项目说明、需求标题和完成状态附加到系统提示词。

本地对话使用自然中文项目清单，例如：

```text
【项目 1】VoiceDairy
项目说明：本地优先的语音记录与整理应用
需求清单：
- [R1] 未完成：完成开发者选项页面
- [R2] 已完成：接入本地 Qwen
```

项目需求自动勾选仍处于实验阶段。数据库层会拒绝不存在、已经完成或无法唯一确定的需求，但小模型对自然语言需求的识别准确率仍需继续改进。

## 本地语音识别

第一次 Android 构建会准备 SenseVoice 模型和 sherpa-onnx JNI：

```bash
npm run prepare:asr
```

当前资源包括：

- `sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17`；
- sherpa-onnx 1.13.4 Android arm64-v8a JNI 动态库。

模型安装到 Android assets，JNI 库安装到 `jniLibs`。生成文件和下载缓存已加入 `.gitignore`，不会进入普通 Git 历史。

## 本地 Qwen

```text
模型：Qwen3.5-0.8B Q4_0
仓库：ggml-org/Qwen3.5-0.8B-GGUF
文件：Qwen3.5-0.8B-Q4_0.gguf
体积：约 563 MB
```

模型由应用下载到 Android 私有目录。覆盖安装 APK 通常会保留模型；卸载应用可能删除应用私有数据和模型文件。

VoiceDairy 当前使用 llama.rn 0.12.6，并为 React Native 0.74 旧架构提供应用自有的 Android JSI 安装桥。依赖安装后必须执行项目的 `postinstall` 补丁脚本。

**React Native 项目嵌入本地 AI 的完整实现、具体调用代码、Android JSI 桥接、模型生命周期、覆盖安装方式以及本项目实际踩过的全部坑，见 [docs/react-native-local-ai-integration.md](./docs/react-native-local-ai-integration.md)。**

## 环境要求

- Node.js 18+
- JDK 17 或 Android Studio JBR 21
- Android SDK 34
- Gradle 8.x
- Android arm64-v8a 真机
- `curl` 或 `wget`

## 安装与运行

普通网络环境：

```bash
npm install
npm run prepare:asr
npm run android
```

需要通过本机代理安装 Android 原生依赖时：

```bash
npm run install:proxy
npm run prepare:asr
npm run android
```

启动 Metro：

```bash
adb reverse tcp:8081 tcp:8081
npm start -- --reset-cache
```

重新打开已经安装的应用：

```bash
npm run restart
```

详细运行说明见 [RUNNING.md](./RUNNING.md)，ASR 集成说明见 [docs/asr-integration.md](./docs/asr-integration.md)。

## 使用方式

1. 在时间线点击右下角“记录”；
2. 开始录音并允许麦克风权限；
3. 停止后等待 SenseVoice 本地转写；
4. 编辑文字并执行智能整理；
5. 在设置中选择云端 API 或本地 Qwen；
6. 在项目设置中创建项目及需求；
7. 选择本地 Qwen 后进入本地模型管理，下载并加载 Qwen；
8. 打开本地模型对话进行普通本地对话；
9. 在项目详情页手动维护需求完成状态。

## 数据与隐私

- SenseVoice 语音识别始终在设备本地执行；
- 本地 Qwen 模式不会上传转写文本、项目和需求；
- 云端 API 模式会把待整理文本和当前项目上下文发送到用户配置的接口；
- API Key、WebDAV 密码和业务数据目前存储在应用 AsyncStorage 中；
- WebDAV 当前只保存实验配置，尚未实现正式上传、下载和冲突合并；
- 开发者选项可以生成并复制完整 JSON 数据快照。

## 主要目录

```text
src/
├── navigation/                 路由和底部 Tab
├── screens/                    页面
│   ├── LocalModelSettingsScreen.tsx
│   ├── LocalModelChatScreen.tsx
│   ├── DeveloperOptionsScreen.tsx
│   └── AboutScreen.tsx
├── services/
│   ├── database/               AsyncStorage 数据仓库
│   ├── llm/                    云端、本地推理、提示词和项目动作
│   ├── settings/               应用设置
│   ├── display/                Android 刷新率桥
│   └── sync/                   JSON 快照与后续同步入口
└── types/                      TypeScript 数据模型
```

## 技术栈

- React Native 0.74
- React 18
- TypeScript
- React Navigation
- react-native-paper
- react-native-vector-icons
- llama.rn / llama.cpp
- sherpa-onnx
- SenseVoice Small INT8
- AsyncStorage
- Zod
- Android Java/Kotlin Native Modules

## 验证

```bash
npm run typecheck
cd android
./gradlew assembleDebug
```

GitHub Actions 会验证安装脚本、llama.rn Android 旧架构桥、TypeScript 和 Android Debug APK 构建。

## 后续计划

- 用 SQLite 替换 AsyncStorage 快照；
- 完成本地通知和提醒调度；
- 实现 WebDAV 上传、下载、合并和冲突处理；
- 重新设计并验证可靠的需求动作机制；
- 增加对话历史持久化与多会话管理；
- 增加 VAD、热词修正和识别状态展示；
- 支持更多 Android ABI；
- 优化本地模型体积、加载速度和超长项目上下文处理。

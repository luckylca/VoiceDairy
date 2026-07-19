# VoiceDiary

VoiceDiary 是一个面向 Android 的本地优先语音记录与个人行动管理应用。它使用 SenseVoice 在手机端完成语音转文字，再由云端 OpenAI 兼容 API 或本地 Qwen GGUF 模型，将自然口语整理为想法、待办、提醒和项目进展。

> 会听、会整理、会行动的个人语音日记  
> Speak. Remember. Act.

## 两种核心使用方式

### 快速语音记录

应用默认进入“记录”页面：

```text
点击开始录音
→ 再次点击停止
→ SenseVoice 本地识别
→ 检查或修改文字
→ 智能整理并预览
→ 用户确认后保存
```

快速记录不要求与 AI 多轮聊天，适合灵感、待办、提醒和项目进展。识别后也可以直接保存原文，或把当前文字和整理结果一键转入 Agent。

### VoiceDiary Agent

Agent 面向复杂任务和需要补充上下文的场景。它支持文字与语音输入、当前会话持久化、信息追问和结构化动作卡片。

Agent 不会直接执行模型生成的任意操作：

- 动作类型使用固定白名单和 Zod 校验；
- 提醒缺少明确时间时会先追问；
- 项目或需求不存在时拒绝执行；
- 所有写入动作先展示待确认卡片；
- 用户确认后才修改本地数据；
- 已执行动作会记录 ID，防止重复写入。

## 主界面结构

```text
主界面
├── 记录
│   ├── 大型语音球
│   ├── 本地录音与识别状态
│   ├── 文字编辑与整理预览
│   ├── 确认保存
│   └── 转入 Agent
├── 时间线
│   ├── 搜索
│   ├── 日期分组
│   └── 条目管理
├── Agent
│   ├── 文字与语音输入
│   ├── 当前会话持久化
│   ├── 主动追问
│   └── 动作确认卡片
└── 设置
    ├── 经典界面 / 科技界面
    ├── 动态效果等级
    ├── 启动页面
    ├── 分类与项目管理
    ├── 云端 API / 本地 Qwen
    ├── 开发者选项
    └── 关于 VoiceDiary
```

## 双视觉系统

设置中可以即时切换：

- **经典界面**：保留现有 Material Design 3 组件、浅色/深色/跟随系统和主题色；
- **科技界面**：使用独立的深色 Design Tokens、自定义背景、面板、按钮、语音球和底部导航。

两套界面共享相同的记录、项目、模型、Agent 会话和设置。切换界面不会清空业务数据。

动态效果支持：

- 完整；
- 标准；
- 减少；
- 关闭。

持续背景动画会在 App 进入后台时暂停。当前科技界面已经建立视觉和状态动画基础，真实 PCM 音量驱动波形、Skia 粒子和更完整的性能分级仍在后续计划中。

## 当前能力

- React Native CLI + TypeScript Android 应用；
- 记录、时间线、Agent、设置四个一级 Tab；
- 快速语音记录作为默认首页；
- Android `AudioRecord` 真实录音；
- sherpa-onnx + SenseVoice Small INT8 本地离线识别；
- 可编辑识别文字与整理结果预览；
- 云端 OpenAI 兼容 `/chat/completions` 整理；
- llama.rn + llama.cpp 本地 Qwen3.5-0.8B Q4_0 整理；
- 本地模型下载、加载、CPU/GPU 后端选择和上下文设置；
- 经典与科技双视觉系统；
- Agent 当前会话持久化；
- Agent 结构化动作确认、项目校验和防重复执行；
- 快速记录一键转入 Agent；
- 基于 AsyncStorage 的记录、条目、项目、需求和设置存储；
- 开发者选项：刷新率、WebDAV 实验配置、JSON 快照和本地数据清理。

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

VoiceDiary 当前使用 llama.rn 0.12.6，并为 React Native 0.74 旧架构提供应用自有的 Android JSI 安装桥。依赖安装后必须执行项目的 `postinstall` 补丁脚本。

React Native 项目嵌入本地 AI 的实现和踩坑记录见 [docs/react-native-local-ai-integration.md](./docs/react-native-local-ai-integration.md)。

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

1. 打开 App，默认进入“记录”；
2. 点击语音球并允许麦克风权限；
3. 再次点击停止，等待 SenseVoice 本地转写；
4. 检查或修改识别文字；
5. 智能整理并预览，或直接保存原文；
6. 用户确认后写入时间线；
7. 内容较复杂时，点击“转到 Agent”继续讨论；
8. 在设置中选择经典/科技界面和云端 API/本地 Qwen；
9. 在项目设置中创建项目和需求。

## 数据兼容与隐私

- SenseVoice 语音识别始终在设备本地执行；
- 本地 Qwen 模式不会上传转写文本、项目和需求；
- 云端 API 模式会把待整理文本和当前项目上下文发送到用户配置的接口；
- API Key、WebDAV 密码和业务数据目前存储在应用 AsyncStorage 中；
- 设置继续使用原有 `voicedairy.settings.v1` 键，避免升级后丢失已有设置；
- Android 包名 `com.voicedairy` 暂时保留，以兼容已经安装的应用和私有数据目录；
- WebDAV 当前只保存实验配置，尚未实现正式上传、下载和冲突合并；
- 开发者选项可以生成并复制完整 JSON 数据快照。

## 主要目录

```text
src/
├── components/
│   └── tech/                    科技界面基础组件
├── navigation/                  四栏导航和跨页控制
├── screens/
│   ├── QuickRecordScreen.tsx
│   ├── AgentScreen.tsx
│   ├── HomeScreen.tsx
│   └── SettingsScreen.tsx
├── services/
│   ├── agent/                   Agent 解析、会话和动作执行
│   ├── asr/                     本地语音识别
│   ├── database/                AsyncStorage 数据仓库
│   ├── llm/                     云端和本地模型推理
│   └── settings/                应用设置
├── theme/
│   ├── tech/                    科技 Design Tokens
│   └── VisualStyleProvider.tsx
└── types/                       TypeScript 数据模型
```

## 验证

```bash
npm run typecheck
cd android
./gradlew assembleDebug
```

GitHub Actions 会验证安装脚本、llama.rn Android 旧架构桥、TypeScript 和 Android Debug APK 构建。

## 后续计划

- 使用真实 PCM 音量驱动语音球和波形；
- 接入 Reanimated、Gesture Handler 与 Skia 的完整动画实现；
- 实现 Android 本地通知、重启恢复和过期提醒处理；
- 增加 Agent 多会话、搜索、删除和恢复；
- 完善项目需求候选选择、动作修改与撤销；
- 用 SQLite 替换 AsyncStorage 快照；
- 实现 WebDAV 上传、下载、合并和冲突处理；
- 增加 VAD、热词修正和识别状态展示；
- 支持更多 Android ABI；
- 优化本地模型体积、加载速度和超长项目上下文处理。

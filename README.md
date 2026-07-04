# VoiceDairy - 语音想法整理助手

VoiceDairy 是一个面向 Android 的 React Native CLI 应用。它用于把用户的口语化语音记录整理成结构化的个人知识和任务数据。

## 项目定位

用户通过语音输入自己的想法，App 在手机端本地完成语音转文字，然后把转写后的文字发送给云端大模型 API。大模型根据预设提示词，把用户口语化表达自动整理成「想法」「待办」「提醒」「笔记」「问题」「项目记录」等结构化内容。整理后的数据按时间线存储在本地，并支持通过 WebDAV 同步到用户自己的云端空间。

项目核心目标：

- 快速语音记录
- 本地离线语音识别
- 大模型智能整理
- 本地优先存储
- WebDAV 自主同步
- Material Design 3 风格界面

## 技术栈

### App

- React Native CLI
- TypeScript
- React Navigation
- react-native-paper / 自定义 Material Design 3 组件
- SQLite，本地优先存储
- react-native-keychain / Android Keystore，保存敏感配置

### Android 原生层

- Kotlin
- React Native Native Module
- Android AudioRecord
- Android 本地通知
- sherpa-onnx
- SenseVoice-Small INT8

### 云端能力

- OpenAI 兼容 API
- 自定义 Base URL
- 自定义 API Key
- 自定义模型名
- 自定义提示词

### 同步

- WebDAV
- JSON 快照同步
- 第一阶段不直接同步 SQLite 数据库文件，避免数据库锁和文件损坏

## 整体架构

```text
React Native UI
    ↓ 语音按钮 / 文本编辑 / 时间线展示
Android Kotlin Native Module
    ↓ AudioRecord 采集 PCM 音频
sherpa-onnx + SenseVoice-Small INT8 本地识别
    ↓ 得到转写文字
云端大模型 API
    ↓ 解析结构化 JSON
SQLite 本地存储
    ↓ 时间线 / 分类 / 搜索 / 提醒
WebDAV 同步 JSON 快照
```

## 开发阶段

1. 文本输入 MVP：先跑通文本输入、大模型整理、JSON 校验、SQLite 保存、时间线展示、分类展示、设置页。
2. Android 端侧语音识别：接入 Kotlin Native Module、AudioRecord、sherpa-onnx、SenseVoice-Small INT8。
3. 待办和提醒：todo 完成状态、reminder 本地通知、过期提醒。
4. WebDAV 同步：配置、测试连接、上传/下载 JSON 快照、合并和冲突处理。
5. 体验优化：VAD 自动分句、热词修正、标签推荐、搜索、深色模式、导出、模型下载校验。

## 开发原则

- 不使用 Expo，使用 React Native CLI。
- 先 Android，暂不做 iOS。
- JS 层负责 UI 和业务逻辑。
- Android 原生层负责录音和 ASR。
- 不把 20ms 音频帧传给 JavaScript。
- 先本地保存，再做同步。
- 大模型返回必须做 JSON 校验。
- API Key 和 WebDAV 密码不能明文写死。
- 所有模块都要有清晰 TypeScript 类型。
- 本地数据不能因为同步失败而丢失。

## 当前仓库状态

本仓库当前是项目初始化骨架，包含：

- React Native CLI 基础配置
- TypeScript 类型定义
- 页面和导航占位
- 大模型整理服务骨架
- ASR Native Module JS/Kotlin 接口骨架
- SQLite / WebDAV / 通知服务骨架
- MVP 开发计划和提示词文档

> 注意：模型文件、API Key、WebDAV 密码、SQLite 数据库文件不会提交到仓库。

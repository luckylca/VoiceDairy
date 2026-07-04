# VoiceDairy 开发计划

## 一句话总结

这是一个基于 React Native CLI 的 Android 个人语音整理 App：用户用语音快速记录想法，手机端本地转文字，云端大模型负责归纳整理，结果按时间线存入本地 SQLite，并支持 WebDAV 同步到用户自己的云端空间。

## 第一阶段：文本输入 MVP

目标：先不接语音识别，跑通主流程。

验收标准：

1. 用户可以输入一段文字。
2. App 可以调用 OpenAI 兼容大模型 API。
3. 大模型可以返回结构化 JSON。
4. App 可以把结果拆成想法、待办、提醒、笔记等条目。
5. App 可以保存到 SQLite。
6. 首页可以按时间线展示。
7. 分类页可以按类型展示。
8. 用户可以编辑和删除条目。
9. 设置页可以配置 API Base URL、API Key、模型名和提示词。
10. UI 整体符合 Material Design 3 风格。

任务拆分：

- 初始化 React Native CLI + TypeScript。
- 接入 React Navigation。
- 接入 react-native-paper 或自定义 MD3 组件。
- 完成首页时间线、文本输入页、整理结果页、分类页、设置页。
- 实现 LlmService、PromptBuilder、JsonRepair。
- 实现本地 SQLite 表结构和 Repository。
- 实现设置持久化和安全存储。

## 第二阶段：Android 端侧语音识别

目标：录音后本地转文字，识别结果进入文本编辑框。

验收标准：

1. 用户可以录音。
2. App 可以本地语音转文字。
3. 识别结果可以编辑。
4. 识别文本可以发送给大模型整理。
5. 语音识别不依赖云端语音服务。

任务拆分：

- 新增 Kotlin Native Module：SherpaAsrModule。
- 使用 Android AudioRecord 采集 16kHz mono PCM 16-bit。
- 接入 sherpa-onnx JNI。
- 接入 SenseVoice-Small INT8。
- JS 层只调用 startRecord / stopRecord，不接收音频帧。
- 增加模型文件检测、下载、SHA256 校验、解压和初始化流程。

## 第三阶段：待办和提醒

目标：让 todo 和 reminder 变成真正可用的任务系统。

验收标准：

1. todo 可以标记完成。
2. reminder 可以创建 Android 本地通知。
3. 可以查看未来提醒和过期提醒。
4. 可以修改提醒时间。
5. 可以删除提醒。

## 第四阶段：WebDAV 同步

目标：使用 JSON 快照方式同步数据。

验收标准：

1. 可以配置 WebDAV。
2. 可以测试连接。
3. 可以上传本地数据。
4. 可以从 WebDAV 恢复数据。
5. 可以处理同步冲突。

## 第五阶段：体验优化

目标：提升语音记录效率和整理准确率。

优化项：

- VAD 自动分句。
- 识别热词修正。
- 项目自动归类。
- 标签自动推荐。
- 搜索。
- 深色模式。
- 数据导出 Markdown / JSON。
- 模型文件下载和校验。
- 性能档位：省电、标准、极速。

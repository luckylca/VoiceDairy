# React Native 嵌入本地 AI：VoiceDairy 实战与踩坑记录

本文记录 VoiceDairy 在 **React Native 0.74 旧架构 Android 项目**中嵌入 `llama.rn 0.12.6`、`llama.cpp` 和 Qwen GGUF 模型的完整实现。

这不是通用概念介绍，而是当前项目真正使用的调用链、Android 桥接方式、模型管理方式以及开发过程中遇到的问题。

## 1. 最终架构

```text
React Native TypeScript
    │
    │ initLlama / context.completion
    ▼
llama.rn JavaScript API
    │
    │ NativeRNLlama.install()
    ▼
VoiceLlamaBridge（应用自有经典 Native Module）
    │
    │ delegate.install(promise)
    ▼
llama.rn 的 RNLlamaModule
    │
    │ 安装 JSI bindings
    ▼
llama.cpp Android JNI
    │
    ▼
Qwen3.5-0.8B-Q4_0.gguf
```

VoiceDairy 没有把推理请求发送到本地 HTTP 服务，也没有启动 Python 进程。模型直接在 Android App 进程内通过 llama.cpp JNI 运行。

## 2. 关键依赖

`package.json` 固定使用：

```json
{
  "dependencies": {
    "llama.rn": "0.12.6",
    "react-native": "0.74.0",
    "react-native-fs": "2.20.0"
  },
  "scripts": {
    "postinstall": "node scripts/patch-llama-rn-bridge.js"
  }
}
```

这里必须固定 `llama.rn` 版本。当前兼容补丁直接针对 `0.12.6` 的源码结构；升级依赖前必须重新检查 Android 包结构、Codegen Spec、模块名称和 `install()` 实现。

## 3. 模型文件如何进入 App

模型信息定义在 `LocalModelService.ts`：

```ts
export const LOCAL_QWEN_MODEL = {
  id: 'qwen3.5-0.8b-q4_0',
  displayName: 'Qwen3.5-0.8B Q4_0',
  fileName: 'Qwen3.5-0.8B-Q4_0.gguf',
  repository: 'ggml-org/Qwen3.5-0.8B-GGUF',
  downloadUrl:
    'https://huggingface.co/ggml-org/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_0.gguf?download=true',
};
```

应用通过 `react-native-fs` 下载到：

```text
RNFS.DocumentDirectoryPath/local-models/Qwen3.5-0.8B-Q4_0.gguf
```

Android 真机上对应类似：

```text
/data/user/0/com.voicedairy/files/local-models/Qwen3.5-0.8B-Q4_0.gguf
```

下载流程使用临时文件：

```text
Qwen3.5-0.8B-Q4_0.gguf.download
```

下载成功后会：

1. 检查 HTTP 状态码；
2. 检查文件大小，避免把错误页或残缺文件当模型；
3. 删除旧模型；
4. 把临时文件移动为正式 GGUF；
5. 调用 `loadLlamaModelInfo()` 验证 GGUF 能被 llama.rn 识别。

不要把 500 MB 以上的 GGUF 直接放进普通 Git 历史，也不要每次构建都重新打进 APK。运行时下载更适合当前项目。

## 4. 为什么不能只安装 llama.rn 就直接用

VoiceDairy 使用 React Native 0.74，并且：

```text
newArchEnabled=false
```

`llama.rn 0.12.6` 的 Android 源码依赖一个通常由 React Native Codegen 生成的：

```text
NativeRNLlamaSpec.java
```

但当前 RN 0.74 Codegen 无法正确处理该版本库使用的新 TurboModule Schema。结果可能是：

- Android 编译阶段缺少 `NativeRNLlamaSpec`；
- 编译通过，但 `TurboModuleRegistry.get('RNLlama')` 返回 `null`；
- autolink 已经把 `RNLlamaPackage` 加入 APK，但 JavaScript 仍看不到模块；
- Metro 热更新无法修复，因为缺的是 APK 内的原生模块。

因此项目在 `postinstall` 中执行：

```bash
node scripts/patch-llama-rn-bridge.js
```

该脚本做两件事。

### 4.1 恢复经典桥需要的 Java Spec

脚本在 `node_modules/llama.rn/android/.../com/rnllama/` 下生成：

```java
public abstract class NativeRNLlamaSpec extends ReactContextBaseJavaModule {
  protected NativeRNLlamaSpec(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @ReactMethod
  public abstract void install(Promise promise);
}
```

它只补回 llama.rn 实际需要的 `install()` 方法，不尝试完整模拟新架构 Codegen。

### 4.2 修改 JavaScript 模块查找顺序

补丁把 `NativeRNLlama.ts` 改为按以下顺序寻找安装桥：

```ts
const turboModule = TurboModuleRegistry.get<Spec>('RNLlama');
const legacyModule = NativeModules.RNLlama as Spec | undefined;
const voiceDairyBridge = NativeModules.VoiceLlamaBridge as Spec | undefined;

export default turboModule ?? legacyModule ?? voiceDairyBridge ?? missingModule;
```

这意味着：

1. 新架构正常时优先使用官方 TurboModule；
2. 官方经典模块可见时使用 `NativeModules.RNLlama`；
3. 前两者都不可见时使用 VoiceDairy 自己注册的 `VoiceLlamaBridge`。

`node_modules` 会在重新安装依赖时被覆盖，因此补丁必须放在 `postinstall`，不能只手工修改一次。

## 5. 应用自有 Android 桥

### 5.1 VoiceLlamaBridgeModule

VoiceDairy 新建了经典 Native Module：

```java
public final class VoiceLlamaBridgeModule extends ReactContextBaseJavaModule {
    public static final String NAME = "VoiceLlamaBridge";
    private final RNLlamaModule delegate;

    public VoiceLlamaBridgeModule(ReactApplicationContext reactContext) {
        super(reactContext);
        delegate = new RNLlamaModule(reactContext);
    }

    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void install(Promise promise) {
        delegate.install(promise);
    }
}
```

这个模块本身不实现推理。它只把 `install()` 转交给 llama.rn 的 `RNLlamaModule`，让官方模块完成 JSI 安装。

### 5.2 为什么不直接注册 RNLlamaPackage

`llama.rn` 的 `RNLlamaPackage` 是 `TurboReactPackage`。在当前旧架构组合下，包可能已 autolink，却没有稳定暴露为 JavaScript 可见模块。

因此 `MainApplication.kt` 会删除自动链接的包：

```kotlin
removeAll { it.javaClass.name == "com.rnllama.RNLlamaPackage" }
add(SherpaAsrPackage())
```

然后在项目已经验证可用的经典 `ReactPackage` 中注册桥：

```java
modules.add(new VoiceLlamaBridgeModule(reactContext));
```

这个注册路径与项目自己的 `SherpaAsr`、`VoiceClipboard` 和刷新率模块一致，避免继续依赖 TurboReactPackage 的发现机制。

## 6. JavaScript 中如何加载模型

核心调用：

```ts
import { initLlama, type LlamaContext } from 'llama.rn';

let activeContext: LlamaContext | null = null;

activeContext = await initLlama(
  {
    model: MODEL_PATH,
    n_ctx: settings.localModelContextSize,
    n_batch: 256,
    n_threads: 4,
    n_gpu_layers: settings.localModelGpuLayers,
    use_mlock: false,
    flash_attn_type: 'auto',
  },
  progress => {
    // 0～100 的模型加载进度
  },
);
```

参数含义：

- `model`：GGUF 绝对路径；
- `n_ctx`：上下文长度，目前提供 1024、2048、4096；
- `n_batch`：prompt 处理批次；
- `n_threads`：CPU 推理线程数；
- `n_gpu_layers`：`0` 表示 CPU，较大值表示尝试把层卸载到设备加速后端；
- `use_mlock=false`：避免强制锁定大量内存；
- `flash_attn_type='auto'`：让后端按设备能力选择。

项目使用一个 context key：

```ts
`${contextSize}:${gpuLayers}`
```

当上下文或 GPU 设置没有变化时复用当前 context；设置变化时先 `release()` 再重新加载。

## 7. 如何调用本地模型生成文本

优先使用 llama.rn 的消息接口：

```ts
const result = await context.completion({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userText },
  ],
  chat_template_kwargs: {
    enable_thinking: false,
  },
  n_predict: 640,
  temperature: 0.1,
  top_k: 20,
  top_p: 0.9,
  stop: STOP_WORDS,
});

const text = result.text ?? '';
```

Qwen3.5 默认可能进入思考模式。当前任务要求输出短小、稳定、可解析的结果，因此显式设置：

```ts
enable_thinking: false
```

## 8. 为什么还要手写 ChatML 回退

不同 GGUF 的聊天模板元数据、llama.rn 版本和 llama.cpp 构建可能存在兼容差异。消息接口失败时，VoiceDairy 会：

1. 释放当前 context；
2. 重新初始化模型；
3. 把同一组消息手工编码成 ChatML；
4. 改用 `prompt` 参数再次生成。

简化形式：

```ts
const prompt = [
  '<|im_start|>system',
  systemPrompt,
  '<|im_end|>',
  '<|im_start|>user',
  userText,
  '<|im_end|>',
  '<|im_start|>assistant',
].join('\n');

const result = await context.completion({
  prompt,
  n_predict: 640,
  temperature: 0.1,
  top_k: 20,
  top_p: 0.9,
  stop: STOP_WORDS,
});
```

两条路径都失败时，错误会同时包含：

- 聊天模板路径错误；
- 手工 ChatML 路径错误。

这样比只显示 `std::exception` 更容易定位。

## 9. VoiceDairy 的实际业务调用链

### 9.1 智能整理

```text
VoiceInputScreen
    ↓ organizeText({ text, settings })
LlmService
    ↓ 根据 organizerProvider 分流
LocalModelService.organizeTextLocally
    ↓ 读取项目内容并构造 system/user messages
runCompletionWithFallback
    ↓ context.completion
JsonRepair.parseAndValidateLlmJson
    ↓
CreateRecordService.saveOrganizedResult
```

调用代码：

```ts
const result = await organizeText({
  text,
  settings,
});
```

业务层不直接持有 `LlamaContext`。模型下载、加载、复用、回退和释放都集中在 `LocalModelService`，页面只调用服务函数。

### 9.2 普通本地对话

```ts
const result = await chatWithLocalModel(
  userText,
  recentHistory,
  settings,
);
```

服务层会重新读取本地项目内容、构造提示词并调用同一个推理底层。

### 9.3 释放模型

```ts
await releaseLocalModel();
```

实现必须先把全局引用设为 `null`，再调用：

```ts
await context.release();
```

这样其他页面不会继续误用已经释放的 context。

## 10. 实际踩过的坑

### 坑 1：`cannot read property 'install' of null`

原因：`TurboModuleRegistry.get('RNLlama')` 返回 `null`。

解决：增加经典模块和应用自有 `VoiceLlamaBridge` 回退；不能只在 TypeScript 中假定 TurboModule 一定存在。

### 坑 2：编译缺少 NativeRNLlamaSpec

原因：RN 0.74 Codegen 无法生成 llama.rn 0.12.6 所期待的 Java Spec。

解决：`postinstall` 生成最小经典桥 Spec，并固定依赖版本。

### 坑 3：RNLlamaPackage 已 autolink，但 JavaScript 仍看不到模块

原因：在当前旧架构组合里，TurboReactPackage 注册和 JavaScript 可见性并不可靠。

解决：删除 autolink 的 `RNLlamaPackage`，使用应用自有经典 ReactPackage 注册 `VoiceLlamaBridgeModule`。

### 坑 4：`Object.keys(NativeModules)` 显示 0

原因：React Native 的 NativeModules 可能按需加载，枚举结果不能可靠代表模块是否存在。

解决：直接探测：

```ts
Boolean(NativeModules.RNLlama)
Boolean(NativeModules.VoiceLlamaBridge)
Boolean(NativeModules.VoiceClipboard)
```

不要只根据 `Object.keys(NativeModules).length` 下结论。

### 坑 5：只刷新 Metro 不会增加原生模块

原因：Java/Kotlin、JNI 和 ReactPackage 都存在于 APK 中。

解决：修改原生桥后必须重新构建并覆盖安装 APK。Fast Refresh、Reload JS 和重启 Metro 都不能把新 Native Module 注入旧 APK。

### 坑 6：卸载 App 会删除 500 MB 模型

模型存储在 App 私有目录。执行普通卸载后，Android 会清理该目录。

开发期间应优先覆盖安装：

```bash
adb install -r -t android/app/build/outputs/apk/debug/app-debug.apk
```

不要为了更新 APK 习惯性先卸载。

### 坑 7：`INSTALL_FAILED_USER_RESTRICTED`

这通常不是编译错误，而是手机拒绝了 USB 安装或用户取消了安装确认。

处理：

- 保持手机解锁；
- 确认 USB 调试和 USB 安装权限；
- 接受手机上的安装确认；
- 确认 `adb install` 最终输出 `Success`。

### 坑 8：复杂 JSON Schema 导致原生层只报 `std::exception`

最初的推理调用同时启用了复杂 `response_format/json_schema`、Jinja、reasoning 格式和额外 cache 操作。Schema 需要先转换为 grammar，任何模板或 grammar 兼容问题都可能只从 C++ 层抛出模糊异常。

解决：

- 本地推理使用基础 `messages` 调用；
- 禁止思考模式；
- 不在 llama.cpp 层强制复杂 JSON Schema；
- 在 TypeScript 层解析、修复和校验 JSON；
- 提供手工 ChatML 回退。

### 坑 9：推理前调用 `clearCache(true)` 不稳定

模型刚加载后再执行额外原生 cache 操作增加了失败面，而且不是每次生成必需。

解决：移除每次推理前的 `clearCache(true)`，只在上下文配置变化或异常回退时释放并重建 context。

### 坑 10：模型加载成功不等于首次生成成功

`status.loaded=true` 只说明 GGUF context 已创建。聊天模板、prompt、停止词、grammar 或输出解析仍可能失败。

解决：分别报告“模型加载阶段”和“completion 阶段”，不要把所有错误都写成“模型加载失败”。

### 坑 11：CPU、GPU 和上下文长度不能混为一谈

- CPU 模式最兼容；
- GPU/OpenCL 依赖具体 SoC、驱动和 llama.cpp 构建；
- 上下文越长，KV cache 占用越大；
- 0.8B 模型不代表 4096 上下文在所有手机上都轻量。

当前建议：

```text
先用 CPU + 2048 验证正确性
再单独测试 GPU
项目内容较多时再尝试 4096
```

### 坑 12：只支持 arm64-v8a

当前自动准备的 JNI 主要面向 arm64-v8a 真机。模拟器或其他 ABI 可能出现 `UnsatisfiedLinkError`、`dlopen failed` 或 APK 中根本没有对应 `.so`。

检查命令：

```bash
adb shell getprop ro.product.cpu.abi
unzip -l android/app/build/outputs/apk/debug/app-debug.apk | grep 'lib/arm64-v8a'
```

### 坑 13：`node_modules` 补丁会被覆盖

重新执行 `npm install`、切换 lockfile 或升级 llama.rn 后，手工修改会消失。

解决：

- 把补丁脚本放入仓库；
- 使用 `postinstall` 自动执行；
- CI 检查补丁是否生效；
- 依赖升级时让脚本在版本不匹配时直接失败，而不是静默继续。

### 坑 14：模型下载成功但文件可能无效

HTTP 200 并不一定代表拿到了完整 GGUF，代理或镜像也可能返回 HTML。

解决：

- 使用临时后缀；
- 检查文件体积；
- 完成后再原子移动；
- 调用 `loadLlamaModelInfo()` 做格式验证；
- 失败时删除临时文件。

### 坑 15：错误信息必须跨 JS、Java 和 C++ 分层

只显示 `Error: std::exception` 几乎无法定位。

项目现在尽量区分：

- 原生模块不可用；
- JSI 安装失败；
- GGUF 不存在或不完整；
- context 初始化失败；
- 消息模板生成失败；
- 手工 ChatML 回退失败；
- 输出为空；
- JSON 解析失败。

## 11. 原生桥修改后的正确更新流程

只修改 TypeScript：

```bash
git pull
npm start -- --reset-cache
adb reverse tcp:8081 tcp:8081
adb shell am force-stop com.voicedairy
adb shell am start -n com.voicedairy/.MainActivity
```

修改 Java/Kotlin、Native Module、JNI 或依赖补丁：

```bash
npm install
npm run postinstall
npm run typecheck
cd android
./gradlew clean assembleDebug
cd ..
adb install -r -t android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8081
adb shell am force-stop com.voicedairy
adb shell am start -n com.voicedairy/.MainActivity
```

必须看到：

```text
Success
```

## 12. 调试检查表

### JavaScript 看不到桥

检查：

```bash
grep -n "VoiceLlamaBridge" node_modules/llama.rn/src/NativeRNLlama.ts
grep -n "VoiceLlamaBridgeModule" android/app/src/main/java/com/voicedairy/asr/SherpaAsrPackage.java
```

### APK 是否包含 JNI

```bash
unzip -l android/app/build/outputs/apk/debug/app-debug.apk | grep -E 'lib/(arm64-v8a|x86_64)/.*(llama|rnllama)'
```

### 查看原生日志

```bash
adb logcat -c
```

复现后：

```bash
adb logcat -d | grep -i -E 'RNLlama|VoiceLlamaBridge|UnsatisfiedLinkError|dlopen|ReactNativeJS|AndroidRuntime'
```

### 确认模型仍在私有目录

在 App 的本地模型页面查看文件状态和大小。不要通过卸载重装来排查，否则模型也会被删掉。

## 13. 升级 llama.rn 或 React Native 前必须检查

1. `NativeRNLlamaSpec` 是否仍需要补丁；
2. Native Module 名称是否仍为 `RNLlama`；
3. `RNLlamaModule.install()` 签名是否变化；
4. 官方包是否已经在目标 RN 版本中正常暴露；
5. JSI / CallInvoker 获取方式是否变化；
6. Android ABI 和 JNI 文件名是否变化；
7. `initLlama()` 参数类型是否变化；
8. `context.completion()` 的消息、模板和思考参数是否变化；
9. 当前应用自有桥是否可以删除；
10. 实体 Android 真机是否完成加载和首次推理验证。

在这些项目全部确认前，不要只修改版本号后直接发布。

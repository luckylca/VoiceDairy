#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_PROXY = 'http://127.0.0.1:7890';
const PROJECT_ROOT = path.resolve(__dirname, '..');

function resolveProxyUrl() {
  const argument = process.argv.find(value => value.startsWith('--proxy='));
  const raw = argument?.slice('--proxy='.length) || process.env.VOICEDAIRY_PROXY || DEFAULT_PROXY;

  let proxyUrl;
  try {
    proxyUrl = new URL(raw);
  } catch {
    throw new Error(`代理地址无效：${raw}`);
  }

  if (!['http:', 'https:'].includes(proxyUrl.protocol)) {
    throw new Error(`代理协议必须是 http 或 https，当前为：${proxyUrl.protocol}`);
  }

  if (!proxyUrl.port) {
    proxyUrl.port = proxyUrl.protocol === 'https:' ? '443' : '80';
  }

  return proxyUrl;
}

function checkProxyReachable(proxyUrl) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: proxyUrl.hostname,
      port: Number(proxyUrl.port),
    });

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`无法连接代理 ${proxyUrl.hostname}:${proxyUrl.port}，请确认代理软件已启动。`));
    }, 3000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve();
    });

    socket.once('error', error => {
      clearTimeout(timeout);
      reject(
        new Error(
          `无法连接代理 ${proxyUrl.hostname}:${proxyUrl.port}：${error.message}`,
        ),
      );
    });
  });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw new Error(`无法执行 ${command}：${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${command} 执行失败，退出码 ${result.status}`);
  }
}

function ensureCommand(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    stdio: 'ignore',
  });

  if (result.error || result.status !== 0) {
    throw new Error(`缺少命令 ${command}，请先安装后重试。`);
  }
}

function normalizeRepositoryUrl(repository) {
  const raw = typeof repository === 'string' ? repository : repository?.url || '';
  return raw.replace(/^git\+/, '').replace(/\.git$/, '').replace(/\/$/, '');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const input = fs.createReadStream(filePath);

    input.on('data', chunk => hash.update(chunk));
    input.once('error', reject);
    input.once('end', () => resolve(hash.digest('hex')));
  });
}

function markerMatches(packageRoot, artifact) {
  const targetPath = path.join(packageRoot, artifact.relativePath);
  const markerPath = path.join(packageRoot, artifact.markerPath);

  if (!fs.existsSync(targetPath) || !fs.existsSync(markerPath)) {
    return false;
  }

  return fs.readFileSync(markerPath, 'utf8').trim() === artifact.sha256;
}

async function installAndroidNativeArtifact(proxy) {
  const packageRoot = path.join(PROJECT_ROOT, 'node_modules', 'llama.rn');
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const manifestPath = path.join(packageRoot, 'install', 'native-artifacts.json');

  if (!fs.existsSync(packageJsonPath) || !fs.existsSync(manifestPath)) {
    throw new Error('llama.rn JavaScript 包未完整安装，找不到 package.json 或 native-artifacts.json。');
  }

  const packageJson = readJson(packageJsonPath);
  const manifest = readJson(manifestPath);
  const artifact = manifest.artifacts?.find(item => item.name === 'android-jni-libs');

  if (!artifact) {
    throw new Error('llama.rn 原生库清单中找不到 android-jni-libs。');
  }

  if (typeof artifact.sha256 !== 'string' || !/^[\da-f]{64}$/i.test(artifact.sha256)) {
    throw new Error('llama.rn Android 原生库缺少有效的 SHA-256，拒绝安装未经校验的文件。');
  }

  if (markerMatches(packageRoot, artifact)) {
    console.log('[VoiceDairy] llama.rn Android JNI 已存在且校验标记匹配，跳过下载。');
    return;
  }

  const repositoryUrl = normalizeRepositoryUrl(packageJson.repository);
  if (!repositoryUrl.startsWith('https://github.com/')) {
    throw new Error(`无法识别 llama.rn 仓库地址：${repositoryUrl}`);
  }

  const downloadUrl = `${repositoryUrl}/releases/download/v${packageJson.version}/${artifact.assetName}`;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voicedairy-llama-'));
  const archivePath = path.join(tempDir, artifact.assetName);

  try {
    console.log('[VoiceDairy] 仅下载 Android JNI，不再下载 iOS XCFramework。');
    console.log(`[VoiceDairy] 下载地址：${downloadUrl}`);

    run('curl', [
      '--fail',
      '--location',
      '--show-error',
      '--retry',
      '12',
      '--retry-all-errors',
      '--retry-delay',
      '2',
      '--connect-timeout',
      '20',
      '--max-time',
      '1800',
      '--speed-limit',
      '1024',
      '--speed-time',
      '60',
      '--proxy',
      proxy,
      '--output',
      archivePath,
      downloadUrl,
    ]);

    const actualSha256 = await sha256File(archivePath);
    if (actualSha256 !== artifact.sha256) {
      throw new Error(
        `Android JNI SHA-256 校验失败：期望 ${artifact.sha256}，实际 ${actualSha256}`,
      );
    }

    const targetPath = path.join(packageRoot, artifact.relativePath);
    const markerPaths = [artifact.markerPath, artifact.legacyMarkerPath]
      .filter(Boolean)
      .map(markerPath => path.join(packageRoot, markerPath));

    fs.rmSync(targetPath, { recursive: true, force: true });
    markerPaths.forEach(markerPath => fs.rmSync(markerPath, { recursive: true, force: true }));

    run('tar', ['-xzf', archivePath, '-C', packageRoot]);

    if (!fs.existsSync(targetPath)) {
      throw new Error(`解压完成后仍找不到 Android JNI 目录：${targetPath}`);
    }

    const markerPath = path.join(packageRoot, artifact.markerPath);
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, `${artifact.sha256}\n`);

    console.log('[VoiceDairy] llama.rn Android JNI 下载、校验并安装成功。');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  const proxyUrl = resolveProxyUrl();
  await checkProxyReachable(proxyUrl);

  ensureCommand('curl');
  ensureCommand('tar', ['--version']);

  const proxy = proxyUrl.toString();
  const noProxy = 'localhost,127.0.0.1,::1';
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const env = {
    ...process.env,
    RNLLAMA_SKIP_POSTINSTALL: '1',
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
    http_proxy: proxy,
    https_proxy: proxy,
    NO_PROXY: noProxy,
    no_proxy: noProxy,
  };

  console.log(`[VoiceDairy] 使用代理安装依赖：${proxy}`);
  console.log('[VoiceDairy] 跳过 llama.rn 自带的 Android+iOS 双平台下载。');

  run(npmCommand, ['install'], { env });
  await installAndroidNativeArtifact(proxy);

  console.log('[VoiceDairy] 依赖安装完成，可以继续执行 npm run android。');
}

main().catch(error => {
  console.error(`[VoiceDairy] ${error.message}`);
  process.exitCode = 1;
});

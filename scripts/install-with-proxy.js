#!/usr/bin/env node

const net = require('node:net');
const { spawn } = require('node:child_process');

const DEFAULT_PROXY = 'http://127.0.0.1:7890';

function parseNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  return { major, minor };
}

function supportsBuiltInHttpProxy() {
  const { major, minor } = parseNodeVersion();
  return major > 24 || (major === 24 && minor >= 5) || (major === 22 && minor >= 21);
}

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

async function main() {
  if (!supportsBuiltInHttpProxy()) {
    throw new Error(
      `当前 Node.js ${process.versions.node} 不支持 node:http/https 环境代理。` +
        '请使用 Node.js 24.5+ 或 22.21+。',
    );
  }

  const proxyUrl = resolveProxyUrl();
  await checkProxyReachable(proxyUrl);

  const proxy = proxyUrl.toString();
  const noProxy = 'localhost,127.0.0.1,::1';
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  console.log(`[VoiceDairy] 使用代理安装依赖：${proxy}`);
  console.log('[VoiceDairy] llama.rn 的 GitHub 原生库下载也会经过该代理。');

  const child = spawn(npmCommand, ['install'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_USE_ENV_PROXY: '1',
      HTTP_PROXY: proxy,
      HTTPS_PROXY: proxy,
      http_proxy: proxy,
      https_proxy: proxy,
      NO_PROXY: noProxy,
      no_proxy: noProxy,
    },
  });

  child.once('error', error => {
    console.error(`[VoiceDairy] 无法启动 npm install：${error.message}`);
    process.exitCode = 1;
  });

  child.once('exit', (code, signal) => {
    if (signal) {
      console.error(`[VoiceDairy] npm install 被信号 ${signal} 终止。`);
      process.exitCode = 1;
      return;
    }

    process.exitCode = code ?? 1;
  });
}

main().catch(error => {
  console.error(`[VoiceDairy] ${error.message}`);
  process.exitCode = 1;
});
